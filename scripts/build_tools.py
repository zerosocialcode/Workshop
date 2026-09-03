#!/usr/bin/env python3
"""
Workshop — build tools
-------------------------
Pre-builds every sub-app in apps/ (Node/React/Vite/TS, PHP via Composer,
plain Python tools, and Flask sub-apps that ship their own
requirements.txt) BEFORE you start the server. Run this whenever you
drop in a new app, then start the server — Rescan and startup never
run a build themselves, so they stay instant no matter how many apps
you have.

Usage (run from the project root):
    python3 scripts/build_tools.py                # interactive: ask, then build what's pending
    python3 scripts/build_tools.py --yes          # don't ask — build everything pending
    python3 scripts/build_tools.py --list         # just show each app's type/status, build nothing
    python3 scripts/build_tools.py --only NAME    # (re)build one app folder, ignoring the cache
    python3 scripts/build_tools.py --force        # rebuild everything, ignoring the cache
    python3 scripts/build_tools.py --serve        # after building, launch `python3 run.py`

On failure it stops right there and asks:
    [r]etry        — try the exact same build again (e.g. after a flaky network)
    [s]kip         — leave it broken for now, move on to the next app
    [m]anual fix   — drops you into a shell inside that app's folder; exit the
                     shell once you've fixed it and it retries automatically
    [a]bort        — stop the whole run; already-built apps are untouched

Terminal output is intentionally short: one live-updating line per app
being built, plus an overall progress bar. Every raw line each build
tool prints (npm, pip, composer, ...) still goes somewhere — it's
written live to cache/build_logs/debug.log (this run only; overwritten
each time) so nothing is lost if a build looks fine on screen but
actually isn't. Per-app logs (cache/build_logs/<folder>.log, what the
dashboard's build-log link shows) are unaffected by any of this — those
are written by build_engine.py regardless of what this script does with
its own display.

If a file named .banner.txt exists at the project root, it's printed
before anything else.
"""
import argparse
import ctypes
import datetime
import itertools
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

# Allow `from src.workshop import ...` when this script is run directly
# as `python3 scripts/build_tools.py` from anywhere.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.workshop import build_engine as b

BANNER_FILE = PROJECT_ROOT / ".banner.txt"
DEBUG_LOG_FILE = b.BUILD_LOG_DIR / "debug.log"

# Burnt yellow — the one accent colour this script uses, for the banner,
# the spinner, and the progress bar fill. Everything else stays plain so
# the accent actually reads as an accent.
BURNT_YELLOW = "\033[38;2;212;160;23m"
DIM = "\033[2m"
GREEN = "\033[38;2;90;200;120m"
RED = "\033[38;2;220;90;90m"
RESET = "\033[0m"

_debug_fp = None  # open file handle for the current run's debug log


# ---------------------------------------------------------------
# Colour / terminal helpers
# ---------------------------------------------------------------
def _enable_windows_ansi() -> None:
    """Best-effort: turn on ANSI escape processing in classic Windows
    consoles (cmd.exe / older PowerShell hosts). Modern Windows
    Terminal already supports this; this is a no-op there. Never
    raises — plain, uncoloured text is a perfectly fine fallback."""
    if os.name != "nt":
        return
    try:
        kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
        handle = kernel32.GetStdHandle(-11)  # STD_OUTPUT_HANDLE
        mode = ctypes.c_uint32()
        if kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            kernel32.SetConsoleMode(handle, mode.value | 0x0004)  # ENABLE_VIRTUAL_TERMINAL_PROCESSING
    except Exception:
        pass


def _supports_color() -> bool:
    if os.environ.get("NO_COLOR"):
        return False
    return sys.stdout.isatty()


def _color(text: str, code: str) -> str:
    return f"{code}{text}{RESET}" if _supports_color() else text


def _term_width(default: int = 100) -> int:
    try:
        return shutil.get_terminal_size((default, 20)).columns
    except OSError:
        return default


def _print_banner() -> None:
    if not BANNER_FILE.exists():
        return
    try:
        text = BANNER_FILE.read_text(encoding="utf-8").rstrip("\n")
    except OSError:
        return  # unreadable banner shouldn't block the build
    if text:
        print(_color(text, BURNT_YELLOW))
        print()


# ---------------------------------------------------------------
# Debug log — everything that used to scroll past on screen now
# goes here instead, live, so it survives even if the run is killed.
# ---------------------------------------------------------------
def _open_debug_log() -> None:
    global _debug_fp
    b.BUILD_LOG_DIR.mkdir(exist_ok=True)
    try:
        _debug_fp = DEBUG_LOG_FILE.open("w", encoding="utf-8")
        _debug_fp.write(f"Workshop build run — {datetime.datetime.now().isoformat(timespec='seconds')}\n")
        _debug_fp.write(f"Command: {' '.join(sys.argv)}\n")
        _debug_fp.flush()
    except OSError:
        _debug_fp = None  # can't write logs — still build, just without one


def _write_debug(text: str) -> None:
    if _debug_fp is None:
        return
    try:
        _debug_fp.write(text + "\n")
        _debug_fp.flush()
    except OSError:
        pass


def _close_debug_log() -> None:
    global _debug_fp
    if _debug_fp is not None:
        try:
            _debug_fp.close()
        except OSError:
            pass
        _debug_fp = None


# ---------------------------------------------------------------
# Live per-app status line. Falls back to a single static line
# instead of animating when output isn't a real terminal (redirected
# to a file, running under CI, etc.) — carriage-return animation
# would just produce garbage there.
# ---------------------------------------------------------------
class Spinner:
    FRAMES = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    INTERVAL = 0.08

    def __init__(self, label: str):
        self.label = label
        self.latest = ""
        self.start_time = time.time()
        self._stop = threading.Event()
        self._lock = threading.Lock()
        self._live = sys.stdout.isatty()
        self._thread = None

    def __enter__(self):
        if self._live:
            self._thread = threading.Thread(target=self._loop, daemon=True)
            self._thread.start()
        else:
            print(f"▶ {self.label} …")
        return self

    def update(self, line: str) -> None:
        with self._lock:
            self.latest = line.strip()

    def _render(self, frame: str) -> None:
        with self._lock:
            latest = self.latest
        elapsed = time.time() - self.start_time
        prefix = f"{frame} {self.label} — {elapsed:0.1f}s"
        width = _term_width()
        budget = max(0, width - len(prefix) - 3)
        tail = f"  {latest[:budget]}" if latest else ""
        line = f"\r\033[K{_color(frame, BURNT_YELLOW)} {self.label} — {elapsed:0.1f}s{_color(tail, DIM)}"
        sys.stdout.write(line)
        sys.stdout.flush()

    def _loop(self) -> None:
        for frame in itertools.cycle(self.FRAMES):
            if self._stop.is_set():
                break
            self._render(frame)
            time.sleep(self.INTERVAL)

    def __exit__(self, exc_type, exc, tb):
        self._stop.set()
        if self._thread is not None:
            self._thread.join()
            sys.stdout.write("\r\033[K")
            sys.stdout.flush()
        return False


def _progress_bar(done: int, total: int, width: int = 28) -> str:
    if total <= 0:
        return ""
    filled = int(width * done / total)
    bar = "█" * filled + "─" * (width - filled)
    return f"  {_color(bar, BURNT_YELLOW)} {done}/{total} apps built"


# ---------------------------------------------------------------
# Build orchestration
# ---------------------------------------------------------------
def classify_all():
    apps = []
    if not b.APPS_DIR.is_dir():
        return apps
    for entry in sorted(b.APPS_DIR.iterdir()):
        if not entry.is_dir() or entry.name.startswith("."):
            continue
        apps.append((entry.name, entry, b.detect_type(entry)))
    return apps


def pending_list(apps, force=False):
    pending = []
    for name, entry, t in apps:
        if not b.needs_build_step(t, entry):
            continue
        if force:
            pending.append((name, entry, t))
            continue
        sig = b.source_signature(entry)
        state = b.load_state(name)
        if state.get("status") in ("ok", "skipped") and state.get("signature") == sig:
            continue  # unchanged since last successful build (or explicit skip)
        pending.append((name, entry, t))
    return pending


def build_one(name, entry, t, force, index=None, total=None):
    prefix = f"[{index}/{total}] " if index and total else ""
    label = f"{prefix}Building {name}  [{t}]"
    _write_debug(f"\n=== {label} — {datetime.datetime.now().isoformat(timespec='seconds')} ===")

    with Spinner(label) as spinner:
        def on_line(line):
            spinner.update(line)
            _write_debug(line.rstrip("\n"))

        return b.BUILDERS[t](name, force=force, on_line=on_line)


def handle_result(name, entry, t, state, force, index=None, total=None):
    """Loops on retry/manual-fix; returns 'ok', 'skip', or 'abort'."""
    while True:
        if state.get("status") == "ok":
            warn = state.get("warning")
            mark = _color("●", GREEN)
            print(f"{mark} {name} built OK" + (f"\n   {_color('⚠', BURNT_YELLOW)} {warn}" if warn else ""))
            return "ok"

        mark = _color("❌", RED)
        print(f"{mark} {name} failed: {state.get('error')}")
        print(f"   {_color(f'Full output: {DEBUG_LOG_FILE.relative_to(b.BASE_DIR)}', DIM)}")
        choice = input("   [r]etry / [s]kip / [m]anual fix now / [a]bort all? ").strip().lower()

        if choice.startswith("r"):
            state = build_one(name, entry, t, True, index, total)
            continue
        if choice.startswith("s"):
            state["status"] = "skipped"
            b.save_state(name, state)
            return "skip"
        if choice.startswith("m"):
            shell = os.environ.get("COMSPEC", "cmd.exe") if os.name == "nt" \
                else os.environ.get("SHELL", "/bin/bash")
            print(f"   Opening a shell in apps/{name} — fix the issue, then exit to retry the build.")
            subprocess.run([shell], cwd=entry)
            state = build_one(name, entry, t, True, index, total)
            continue
        if choice.startswith("a"):
            return "abort"
        print("   Please answer r, s, m, or a.")


def launch_server():
    print("\nStarting Workshop server (python3 run.py)…\n")
    subprocess.run([sys.executable, str(b.BASE_DIR / "run.py")])


def main():
    _enable_windows_ansi()
    _print_banner()

    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--yes", action="store_true", help="Don't prompt — build everything pending.")
    parser.add_argument("--force", action="store_true", help="Rebuild everything, ignoring the cache.")
    parser.add_argument("--only", metavar="FOLDER", help="Build a single app folder only.")
    parser.add_argument("--list", action="store_true", help="Show status only, build nothing.")
    parser.add_argument("--serve", action="store_true", help="Start the Workshop server after building.")
    args = parser.parse_args()

    apps = classify_all()
    if not apps:
        print(f"No app folders found in {b.APPS_DIR}.")
        return

    print(f"Found {len(apps)} app folder(s):\n")
    for name, entry, t in apps:
        needs_build = b.needs_build_step(t, entry)
        tag = t if needs_build else f"{t} — no build needed"
        state = b.load_state(name)
        if not needs_build or state.get("status") == "ok":
            marker = _color("●", GREEN)   # ready: built OK, or static (nothing to build)
        else:
            marker = _color("●", RED)     # not ready: never built, failed, or skipped
        print(f"  {marker} {name:<32} {tag}")

    if args.only:
        match = next((a for a in apps if a[0] == args.only), None)
        if not match:
            print(f"\nNo app folder named '{args.only}' found in apps/.")
            sys.exit(1)
        name, entry, t = match
        if not b.needs_build_step(t, entry):
            print(f"\n'{name}' is a {t} app — nothing to build.")
            return
        _open_debug_log()
        try:
            state = build_one(name, entry, t, True, 1, 1)
            outcome = handle_result(name, entry, t, state, True, 1, 1)
        finally:
            _close_debug_log()
        sys.exit(0 if outcome in ("ok", "skip") else 1)

    if args.list:
        return

    pending = pending_list(apps, force=args.force)
    if not pending:
        print(f"\n{_color('●', GREEN)} Everything is already built and up to date. Rescan will be instant.")
        if args.serve:
            launch_server()
        return

    print(f"\n{len(pending)} app(s) need building:")
    for name, entry, t in pending:
        print(f"  • {name}  [{t}]")

    if not args.yes:
        answer = input("\nBuild these now, one by one? [Y/n] ").strip().lower()
        if answer.startswith("n"):
            print("Not building. Run again anytime, or build one app with --only NAME.")
            return

    total = len(pending)
    _open_debug_log()
    ok_count = skip_count = 0
    try:
        for i, (name, entry, t) in enumerate(pending, start=1):
            state = build_one(name, entry, t, args.force, i, total)
            outcome = handle_result(name, entry, t, state, args.force, i, total)
            if outcome == "abort":
                remaining = total - i
                print(f"\n⏹  Stopped. {ok_count} built, {skip_count} skipped, {remaining} not attempted.")
                sys.exit(1)
            if outcome == "ok":
                ok_count += 1
            else:
                skip_count += 1
            print(_progress_bar(i, total))
    finally:
        _close_debug_log()

    print(f"\n✨ Done — {ok_count} built, {skip_count} skipped.")
    print(_color(f"   Full build output: {DEBUG_LOG_FILE.relative_to(b.BASE_DIR)}", DIM))
    if args.serve:
        launch_server()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n{_color('●', RED)} Interrupted — stopping.")
        sys.exit(130)
