"""
Workshop — build engine
-------------------------
Everything about *building* a sub-app (detecting its type, fingerprinting
its source, running the right install/build command, recording the
result) lives here so both the web server and the CLI build script use
the exact same code path:

  - src/workshop/server.py   imports this for on-demand single-app
                              rebuilds (the ⟳ button on a Node app's
                              card) and to *read* build status when
                              listing apps. It never calls any build_*
                              function during a rescan or at startup —
                              that would be the slow behaviour we're
                              avoiding.
  - scripts/build_tools.py   imports this to do the actual bulk,
                              interactive, one-app-at-a-time building
                              described in its own docstring.

Supported app types:

  node    — package.json with a "build" script (React/Vite/plain TS/
            webpack/anything that compiles to static output).
  php     — composer.json present → `composer install`.
  python  — requirements.txt / pyproject.toml / Pipfile, NOT a Flask
            sub-app → gets its own isolated .venv/ (it's a standalone
            tool, not imported into the Workshop process).
  flask   — app.py defining `app = Flask(...)`. If it also ships its
            own requirements.txt, those are installed into the SAME
            Python environment running the server — Flask sub-apps are
            imported in-process via DispatcherMiddleware, so an
            isolated venv would be invisible to them.
  static / php-static / unknown — nothing to build; always "ready".

All state is cached in cache/build_state.json, keyed by folder name, so
re-running the builder (or starting the server) after nothing changed
is a fast no-op.
"""
import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

from .paths import APPS_DIR, BASE_DIR, BUILD_LOG_DIR, BUILD_STATE_FILE

BUILD_TIMEOUT_SECONDS = 900

NODE_BUILD_OUTPUT_CANDIDATES = ["dist", "build", "out", "public/build", ".output/public"]
IGNORE_DIRS = {
    "node_modules", ".git", "cache", ".output", ".svelte-kit", ".venv", "venv",
    "vendor", "__pycache__", ".pytest_cache",
    *NODE_BUILD_OUTPUT_CANDIDATES,
}


# ---------------------------------------------------------------
# Persistent build state (cache/build_state.json)
# ---------------------------------------------------------------
def load_all_state() -> dict:
    if not BUILD_STATE_FILE.exists():
        return {}
    try:
        return json.loads(BUILD_STATE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def load_state(folder: str) -> dict:
    return load_all_state().get(folder, {})


def save_state(folder: str, state: dict) -> None:
    all_state = load_all_state()
    all_state[folder] = state
    BUILD_STATE_FILE.write_text(json.dumps(all_state, indent=2), encoding="utf-8")


# ---------------------------------------------------------------
# Source fingerprinting — so we only rebuild when something changed
# ---------------------------------------------------------------
def source_signature(entry_dir: Path) -> str:
    """Content-based fingerprint of an app's source.

    Deliberately hashes file *contents*, not mtimes. mtimes get reset
    by anything that recreates the files on disk — a git clone/checkout,
    copying the project to another machine or WSL distro, `npm install`
    touching a lockfile, an editor's "safe save" — none of which change
    what the app actually builds to. A mtime-based signature treats all
    of those as "source changed" and forces a full rebuild every time,
    even for an app that's already built and untouched. Hashing content
    means the cache only invalidates when something actually changed.
    """
    h = hashlib.sha1()
    for path in sorted(entry_dir.rglob("*")):
        if not path.is_file():
            continue
        if any(part in IGNORE_DIRS for part in path.relative_to(entry_dir).parts):
            continue
        rel = path.relative_to(entry_dir).as_posix()
        try:
            data = path.read_bytes()
        except OSError:
            continue
        h.update(rel.encode())
        h.update(str(len(data)).encode())
        h.update(hashlib.sha1(data).digest())
    return h.hexdigest()


# ---------------------------------------------------------------
# Type detection
# ---------------------------------------------------------------
def has_build_script(package_json_path: Path) -> bool:
    if not package_json_path.exists():
        return False
    try:
        data = json.loads(package_json_path.read_text(encoding="utf-8"))
        return bool(data.get("scripts", {}).get("build"))
    except (json.JSONDecodeError, OSError):
        return False


def looks_like_flask(app_py_path: Path) -> bool:
    try:
        text = app_py_path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return False
    return bool(re.search(r"\bFlask\s*\(", text))


STATIC_ENTRY_FILES = ["index.html", "index.htm"]


def classify(entry_dir: Path):
    """THE single source of truth for 'what kind of app is this folder,
    and what's its entry file'. Both discovery.py (the live dashboard —
    every request reads its classification) and build_tools.py (what
    actually gets built) call this exact function, so they can never
    disagree about a folder's type again — see the "two classifiers"
    incident in git history if you're ever tempted to fork this logic
    for one call site's convenience. If you need a new app type, or a
    different check, it goes here and ONLY here.

    Order matters: Flask and Node are checked first since a project can
    have stray files that would otherwise look like plain Python or a
    static site (e.g. a Flask app mid-development that also has a
    placeholder index.html, or a Python tool that ships a requirements.txt
    alongside a docs/index.html — both must resolve to the "real",
    buildable type, not the incidental static file).

    Returns (app_type, entry_file_or_None).
    """
    if (entry_dir / "app.py").exists():
        if looks_like_flask(entry_dir / "app.py"):
            return "flask", "app.py"
        # A file literally named app.py that isn't a Flask app (e.g. a
        # standalone script) must NOT be treated as flask — mounting.py
        # would importlib-exec it at every server startup and then
        # report it "failed" for having no `app` object. Fall through
        # and let it classify as whatever it actually is (python,
        # static, etc.) below.
    if has_build_script(entry_dir / "package.json"):
        return "node", "package.json"
    if (entry_dir / "composer.json").exists():
        return "php", "composer.json"
    if any((entry_dir / f).exists() for f in ("requirements.txt", "pyproject.toml", "Pipfile")):
        return "python", None
    for candidate in STATIC_ENTRY_FILES:
        if (entry_dir / candidate).exists():
            return "static", candidate
    if any(entry_dir.glob("*.php")):
        return "php-static", None
    return "unsupported", None


def detect_type(entry_dir: Path) -> str:
    """Back-compat wrapper — prefer classify() when you also need the
    entry file (discovery.py does; build_tools.py's listing doesn't)."""
    return classify(entry_dir)[0]


def needs_build_step(app_type: str, entry_dir: Path) -> bool:
    """Whether this app type has an actual install/build step at all."""
    if app_type in ("node", "php", "python"):
        return True
    if app_type == "flask":
        return (entry_dir / "requirements.txt").exists()
    return False  # static, php-static, unknown — nothing to run


# ---------------------------------------------------------------
# Node helpers
# ---------------------------------------------------------------
def _is_wsl() -> bool:
    if sys.platform != "linux":
        return False
    try:
        return "microsoft" in platform.uname().release.lower()
    except Exception:
        return "WSL_DISTRO_NAME" in os.environ or "WSL_INTEROP" in os.environ


def _is_windows_interop_path(path: str) -> bool:
    """True if `path` is a Windows-side binary reached through WSL's
    PATH interop (typically living under /mnt/c/...). Those *can* be
    found by a plain PATH search, but spawning them against a WSL
    working directory is exactly what produces the classic
    "UNC paths are not supported" / "'<tool>' is not recognized"
    failure — Windows npm/node don't understand \\wsl.localhost\\... as
    a working directory. On WSL we only want a binary installed
    *inside* the Linux distro itself."""
    p = path.replace("\\", "/").lower()
    return p.startswith("/mnt/") or p.endswith((".exe", ".cmd", ".bat"))


def _which_native(name: str):
    """Like shutil.which, but on WSL it skips hits that are actually
    Windows binaries reached through PATH interop, and keeps looking
    for one installed natively in this Linux environment. Returns the
    resolved absolute path, or None."""
    if not _is_wsl():
        return shutil.which(name)
    dirs = [d for d in os.environ.get("PATH", "").split(os.pathsep)
            if not _is_windows_interop_path(d + "/x")]
    native = shutil.which(name, path=os.pathsep.join(dirs))
    if native:
        return native
    return None  # deliberately NOT falling back to the interop hit


def detect_package_manager(entry_dir: Path) -> str:
    preferred = []
    if (entry_dir / "bun.lock").exists() or (entry_dir / "bun.lockb").exists():
        preferred.append("bun")
    if (entry_dir / "pnpm-lock.yaml").exists():
        preferred.append("pnpm")
    if (entry_dir / "yarn.lock").exists():
        preferred.append("yarn")
    preferred.append("npm")
    for candidate in preferred:
        if _which_native(candidate) or shutil.which(candidate):
            return candidate
    return preferred[0]


def find_build_output(entry_dir: Path):
    for candidate in NODE_BUILD_OUTPUT_CANDIDATES:
        out = entry_dir / candidate
        if (out / "index.html").exists():
            return candidate
    return None


# ---------------------------------------------------------------
# Subprocess runner — streams output live (for the CLI) AND logs it
# ---------------------------------------------------------------
def stream_subprocess(cmd: str, cwd: Path, log_path: Path, on_line=None,
                       timeout: int = BUILD_TIMEOUT_SECONDS, env=None):
    lines = []
    start = time.time()
    timed_out = False
    try:
        proc = subprocess.Popen(
            cmd, shell=True, cwd=str(cwd), env=env,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, bufsize=1,
        )
    except OSError as exc:
        msg = f"Could not start process: {exc}"
        log_path.write_text(f"$ {cmd}\n\n{msg}\n", encoding="utf-8")
        return 1, msg

    for line in proc.stdout:
        lines.append(line)
        if on_line:
            on_line(line)
        if time.time() - start > timeout:
            timed_out = True
            proc.kill()
            break
    proc.wait()

    output = "".join(lines)
    if timed_out:
        output += f"\n[build] timed out after {timeout}s\n"
    log_path.write_text(f"$ {cmd}\n\n{output}", encoding="utf-8")
    return (124 if timed_out else proc.returncode), output


# ---------------------------------------------------------------
# Per-type builders — each returns (and saves) a state dict
# ---------------------------------------------------------------
def build_node(folder: str, force: bool = False, on_line=None) -> dict:
    entry_dir = APPS_DIR / folder
    pre_signature = source_signature(entry_dir)
    state = load_state(folder)

    if not force and state.get("status") == "ok" and state.get("signature") == pre_signature \
            and state.get("output_dir") and (entry_dir / state["output_dir"] / "index.html").exists():
        return state

    pm = detect_package_manager(entry_dir)
    log_path = BUILD_LOG_DIR / f"{folder}.log"

    native_pm = _which_native(pm)
    if native_pm is None:
        if _is_wsl() and shutil.which(pm):
            error = (
                f"'{pm}' isn't installed inside this Linux environment — the only "
                f"'{pm}' found is the Windows one, reached through WSL's PATH "
                f"interop ({shutil.which(pm)}). Running that against a WSL folder "
                f"is what causes the 'UNC paths are not supported' / "
                f"'\"{pm}\" is not recognized' failure. Install Node.js natively in "
                f"this distro instead — e.g. `sudo apt install nodejs npm`, or via "
                f"nvm — then try again."
            )
        else:
            error = f"'{pm}' was not found on PATH. Install Node.js (and {pm}) on this machine, then try again."
        state = {
            "type": "node", "status": "failed", "signature": pre_signature,
            "output_dir": state.get("output_dir"),
            "error": error,
            "built_at": time.time(),
        }
        save_state(folder, state)
        return state

    is_vite = any(entry_dir.glob("vite.config.*"))
    build_cmd = f"{pm} run build -- --base=./" if is_vite else f"{pm} run build"
    cmd = f"{pm} install && {build_cmd}"
    env = os.environ.copy()
    if _is_wsl():
        # Make sure the shell we spawn for `cmd` (and anything it in turn
        # spawns, like node_modules/.bin/vite) resolves to this distro's
        # own npm/node rather than the Windows one further down PATH.
        env["PATH"] = os.pathsep.join(
            d for d in env.get("PATH", "").split(os.pathsep)
            if not _is_windows_interop_path(d + "/x")
        )
    rc, _ = stream_subprocess(cmd, entry_dir, log_path, on_line, env=env)

    if rc != 0:
        state = {
            "type": "node", "status": "failed", "signature": pre_signature,
            "output_dir": state.get("output_dir"),
            "error": f"Build exited with code {rc}. Full log: "
                     f"{log_path.relative_to(BASE_DIR)}",
            "built_at": time.time(),
        }
        save_state(folder, state)
        return state

    output_dir = find_build_output(entry_dir)
    if output_dir is None:
        state = {
            "type": "node", "status": "failed", "signature": pre_signature, "output_dir": None,
            "error": "Build succeeded but no output folder with index.html was found "
                     "(checked dist/, build/, out/, public/build/, .output/public/).",
            "built_at": time.time(),
        }
        save_state(folder, state)
        return state

    warning = None
    try:
        built_html = (entry_dir / output_dir / "index.html").read_text(encoding="utf-8", errors="replace")
        if re.search(r'(?:src|href)="/(?!/)', built_html):
            warning = (
                f"Build succeeded, but {output_dir}/index.html references assets with "
                f"absolute paths (e.g. \"/assets/...\"). Those will 404 once mounted at "
                f"/apps/{folder}/ — set a relative public/base path in this bundler's own "
                f"config (e.g. \"homepage\": \".\" for Create React App) and rebuild."
            )
    except OSError:
        pass

    # Re-fingerprint AFTER the build, not before: some build tools (tsc
    # --incremental's .tsbuildinfo, various bundler/lint caches, etc.)
    # write bookkeeping files straight into the project folder rather
    # than into dist/. Saving the pre-build signature would make the
    # folder look "changed" the instant the build finishes, forcing a
    # full rebuild on every single run forever. Saving the post-build
    # signature means the next run's fresh fingerprint has something
    # real to match against, as long as nothing runs in between.
    post_signature = source_signature(entry_dir)
    state = {
        "type": "node", "status": "ok", "signature": post_signature, "output_dir": output_dir,
        "error": None, "warning": warning, "built_at": time.time(),
    }
    save_state(folder, state)
    return state


def build_php(folder: str, force: bool = False, on_line=None) -> dict:
    entry_dir = APPS_DIR / folder
    pre_signature = source_signature(entry_dir)
    state = load_state(folder)

    if not force and state.get("status") == "ok" and state.get("signature") == pre_signature:
        return state

    if _which_native("composer") is None:
        if _is_wsl() and shutil.which("composer"):
            error = (
                f"'composer' isn't installed inside this Linux environment — only "
                f"the Windows one is reachable via WSL's PATH interop "
                f"({shutil.which('composer')}), which breaks the same way Windows "
                f"npm does against a WSL folder. Install Composer natively in this "
                f"distro, then try again."
            )
        else:
            error = "'composer' was not found on PATH. Install Composer, then try again."
        state = {
            "type": "php", "status": "failed", "signature": pre_signature,
            "error": error,
            "built_at": time.time(),
        }
        save_state(folder, state)
        return state

    log_path = BUILD_LOG_DIR / f"{folder}.log"
    env = os.environ.copy()
    if _is_wsl():
        env["PATH"] = os.pathsep.join(
            d for d in env.get("PATH", "").split(os.pathsep)
            if not _is_windows_interop_path(d + "/x")
        )
    rc, _ = stream_subprocess("composer install", entry_dir, log_path, on_line, env=env)
    if rc != 0:
        state = {
            "type": "php", "status": "failed", "signature": pre_signature,
            "error": f"'composer install' exited with code {rc}. Full log: "
                     f"{log_path.relative_to(BASE_DIR)}",
            "built_at": time.time(),
        }
        save_state(folder, state)
        return state

    # Post-build fingerprint — composer can rewrite composer.lock etc.
    # See the matching comment in build_node for why this matters.
    post_signature = source_signature(entry_dir)
    state = {"type": "php", "status": "ok", "signature": post_signature, "error": None,
             "built_at": time.time()}
    save_state(folder, state)
    return state


def _venv_paths(entry_dir: Path):
    venv_dir = entry_dir / ".venv"
    if os.name == "nt":
        return venv_dir, venv_dir / "Scripts" / "pip.exe"
    return venv_dir, venv_dir / "bin" / "pip"


def build_python(folder: str, force: bool = False, on_line=None) -> dict:
    """Standalone Python tool (not a Flask sub-app) — gets its own
    isolated .venv/ inside the app folder."""
    entry_dir = APPS_DIR / folder
    pre_signature = source_signature(entry_dir)
    state = load_state(folder)
    venv_dir, pip_path = _venv_paths(entry_dir)

    if not force and state.get("status") == "ok" and state.get("signature") == pre_signature \
            and pip_path.exists():
        return state

    log_path = BUILD_LOG_DIR / f"{folder}.log"

    if (entry_dir / "requirements.txt").exists():
        cmd = f'"{sys.executable}" -m venv .venv && "{pip_path}" install -U pip -r requirements.txt'
    elif (entry_dir / "pyproject.toml").exists():
        cmd = f'"{sys.executable}" -m venv .venv && "{pip_path}" install -U pip .'
    elif (entry_dir / "Pipfile").exists():
        if shutil.which("pipenv") is None:
            state = {
                "type": "python", "status": "failed", "signature": pre_signature,
                "error": "Found a Pipfile but 'pipenv' isn't on PATH. Install pipenv "
                         "(pip install pipenv), then try again.",
                "built_at": time.time(),
            }
            save_state(folder, state)
            return state
        cmd = "pipenv install"
    else:
        state = {"type": "python", "status": "ok", "signature": pre_signature, "error": None,
                  "built_at": time.time()}
        save_state(folder, state)
        return state

    rc, _ = stream_subprocess(cmd, entry_dir, log_path, on_line)
    if rc != 0:
        state = {
            "type": "python", "status": "failed", "signature": pre_signature,
            "error": f"Setup exited with code {rc}. Full log: {log_path.relative_to(BASE_DIR)}",
            "built_at": time.time(),
        }
        save_state(folder, state)
        return state

    post_signature = source_signature(entry_dir)
    state = {
        "type": "python", "status": "ok", "signature": post_signature, "error": None,
        "venv": str(venv_dir.relative_to(BASE_DIR)) if venv_dir.exists() else None,
        "built_at": time.time(),
    }
    save_state(folder, state)
    return state


def build_flask_deps(folder: str, force: bool = False, on_line=None) -> dict:
    """Flask sub-apps run in-process (imported into the Workshop server
    itself), so their requirements — if any — install into the SAME
    Python environment running app.py, not an isolated venv."""
    entry_dir = APPS_DIR / folder
    req = entry_dir / "requirements.txt"
    pre_signature = source_signature(entry_dir)

    if not req.exists():
        state = {"type": "flask", "status": "ok", "signature": pre_signature, "error": None,
                  "built_at": time.time()}
        save_state(folder, state)
        return state

    state = load_state(folder)
    if not force and state.get("status") == "ok" and state.get("signature") == pre_signature:
        return state

    log_path = BUILD_LOG_DIR / f"{folder}.log"
    cmd = f'"{sys.executable}" -m pip install -r requirements.txt'
    rc, _ = stream_subprocess(cmd, entry_dir, log_path, on_line)
    if rc != 0:
        state = {
            "type": "flask", "status": "failed", "signature": pre_signature,
            "error": f"pip install exited with code {rc} (installed into the SAME Python "
                     f"environment running app.py, since Flask sub-apps are imported "
                     f"in-process). Full log: {log_path.relative_to(BASE_DIR)}",
            "built_at": time.time(),
        }
        save_state(folder, state)
        return state

    post_signature = source_signature(entry_dir)
    state = {"type": "flask", "status": "ok", "signature": post_signature, "error": None,
              "built_at": time.time()}
    save_state(folder, state)
    return state


BUILDERS = {
    "node": build_node,
    "php": build_php,
    "python": build_python,
    "flask": build_flask_deps,
}
