"""
Workshop — tool discovery
---------------------------
Scans apps/, classifies each folder, and maintains the small JSON cache
(cache/apps_list.json) the dashboard reads from instead of re-scanning
the filesystem on every request.

This module never builds anything — it only classifies folders and
reads whatever build_engine.py has already recorded in
cache/build_state.json. See build_engine.py for the actual build step.

Metadata contract
------------------
Every discovered app gets a normalized record regardless of how little
its own meta.json provides. Recognized meta.json keys:

    id            unique identifier (defaults to a slug of the folder
                  name). If two apps' meta.json declare the SAME id,
                  the collision is not allowed to corrupt either
                  listing: the later one silently falls back to its
                  folder-derived id, and the conflict is written to
                  cache/scan_notices.json for the dashboard to surface.
    name          display name (defaults to a title-cased folder name)
    description   one line, shown on the card
    version       free-form string (defaults to "0.0.0")
    category      free-form grouping (defaults to "Uncategorized")
    keywords      list of extra search terms
    intents       optional list of task-style tags (e.g. "jpg_to_jpeg")
                  a Quick Find query can resolve to — folded into
                  keyword-style matching today; see resolver.js and
                  docs/app-development-guide.md, "Declaring actions".
    produces      optional list of MIME-style output tags (e.g.
                  "image/png") — labels only, no data pipe. Quick Find's
                  idle view uses this + "accepts" to suggest a next tool
                  after you finish one (docs/app-development-guide.md
                  §6b) — the "tool contract" step
                  docs/platform-evolution.md's Phase 7 asks be proven
                  out before any real workflow-chaining gets built.
    accepts       optional list of MIME-style input tags this tool can
                  work with — same convention as "produces", opposite
                  direction.
    icon          optional short glyph/label reserved for future use
                  (Workshop's card design deliberately shows no icons —
                  see README — but Quick Find and future
                  tool-contract consumers can use this)
    open          "embed" (default) or "tab" — launch mode
    disabled      true to keep a tool out of the bench entirely without
                  deleting it
    actions       list of specific things this tool can jump straight to
                  (see docs/app-development-guide.md, "Declaring actions").
                  Each entry: {"label", "aliases": [...], "path"}. Quick Find
                  (web/static/js/quickfind.js + resolver.js) indexes these
                  alongside tool names, so
                  typing what you want to DO ("convert jpg to png") can
                  open a tool straight to that mode instead of just its
                  homepage. Malformed entries (missing label or path) are
                  dropped and noted in meta_error — never fatal to the
                  whole app.

Application state
-------------------
Every app gets exactly one `state`, independent of its `type`:

    ready              usable right now
    needs_build        has a build/install step that hasn't run yet
    failed             its last build/install attempt failed
    unsupported        the folder has no entry point Workshop recognizes
    disabled           explicitly turned off via meta.json

A single broken or unrecognized folder only ever affects its own card —
see resolve_app_folder() and server.py for the corresponding guards
that keep a bad app from being openable even if something upstream
ever forgets to check `state`.
"""
import json
import re
import time

from . import build_engine as builder
from .paths import APPS_DIR, CACHE_FILE, SCAN_LOCK_FILE, SCAN_NOTICES_FILE

RESCAN_COOLDOWN_SECONDS = 60
BUILDABLE_TYPES = ("node", "flask", "php", "python")
MAX_ACTIONS_PER_APP = 24


# ---------------------------------------------------------------
# Discovery — shared by cache-building and Flask sub-app mounting
# ---------------------------------------------------------------
def discover_apps():
    """Scan /apps/ and classify each folder. Every folder under apps/
    (barring dotfiles) gets a record — even ones Workshop can't run —
    so nothing vanishes from view unexplained; see module docstring."""
    found = []
    conflicts = []
    seen_ids = {}
    if not APPS_DIR.is_dir():
        return found, conflicts

    for entry in sorted(APPS_DIR.iterdir()):
        if not entry.is_dir() or entry.name.startswith("."):
            continue

        meta = {}
        meta_path = entry / "meta.json"
        meta_error = None
        if meta_path.exists():
            try:
                meta = json.loads(meta_path.read_text(encoding="utf-8"))
                if not isinstance(meta, dict):
                    meta_error = "meta.json must contain a JSON object — ignoring it."
                    meta = {}
            except (json.JSONDecodeError, OSError) as exc:
                meta_error = f"meta.json is invalid ({exc}) — using defaults instead."
                meta = {}

        app_type, entry_file = builder.classify(entry)

        display_name = str(meta.get("name") or generate_display_name(entry.name))
        description = str(meta.get("description") or "")
        version = str(meta.get("version") or "0.0.0")
        category = str(meta.get("category") or "Uncategorized")
        keywords = meta.get("keywords") or []
        if not isinstance(keywords, list):
            keywords = []
        keywords = [str(k) for k in keywords]

        # intents: optional forward-looking tags an app can declare for
        # itself (e.g. "convert_image", "jpg_to_jpeg") — see docs
        # platform-evolution.md / the Quick Find brief, section 7. Quick
        # Find's local resolver already folds these into keyword-style
        # matching (see resolver.js); this is also where a future
        # optional AI layer would read structured capability info from
        # without Workshop having to hardcode per-app knowledge.
        intents = meta.get("intents") or []
        if not isinstance(intents, list):
            intents = []
        intents = [str(i) for i in intents]

        # produces/accepts: optional MIME-style tags a tool can declare
        # about its own input/output — the "tool contract" prerequisite
        # docs/platform-evolution.md's Phase 7 asks for before any real
        # workflow-chaining gets built. Deliberately just labels, not a
        # data pipe: Quick Find uses these to *suggest* a next tool (see
        # quickfind.js), it never passes a payload between tools.
        produces = meta.get("produces") or []
        if not isinstance(produces, list):
            produces = []
        produces = [str(p) for p in produces]

        accepts = meta.get("accepts") or []
        if not isinstance(accepts, list):
            accepts = []
        accepts = [str(a) for a in accepts]

        icon = meta.get("icon")
        icon = str(icon) if icon else None
        disabled = bool(meta.get("disabled", False))

        open_mode = str(meta.get("open") or "embed").strip().lower()
        if open_mode not in ("embed", "tab"):
            open_mode = "embed"

        actions, action_error = _parse_actions(meta.get("actions"))
        if action_error:
            meta_error = f"{meta_error} " if meta_error else ""
            meta_error += action_error

        # id: unique identifier for this tool, independent of its folder
        # name, for the eventual tool contract (Phase 4) and for stable
        # references in favorites/recent even if a folder is renamed.
        raw_id = str(meta.get("id") or "").strip()
        app_id = _slugify(raw_id) or _slugify(entry.name)
        id_conflict = False
        if app_id in seen_ids:
            conflicts.append({
                "id": app_id,
                "kept": seen_ids[app_id],
                "renamed": entry.name,
            })
            app_id = _slugify(entry.name) + "-" + str(abs(hash(entry.name)))[-6:]
            id_conflict = True
        seen_ids[app_id] = entry.name

        info = {
            "folder": entry.name,
            "id": app_id,
            "name": display_name,
            "description": description,
            "version": version,
            "category": category,
            "keywords": keywords,
            "intents": intents,
            "produces": produces,
            "accepts": accepts,
            "icon": icon,
            "type": app_type,
            "entry": entry_file,
            "open_mode": open_mode,
            "disabled": disabled,
            "id_conflict": id_conflict,
            "meta_error": meta_error,
            "actions": actions,
        }

        if app_type in BUILDABLE_TYPES:
            state = builder.load_state(entry.name)
            info["build_status"] = state.get("status", "never")
            info["build_output"] = state.get("output_dir")
            info["build_error"] = state.get("error")
            info["build_warning"] = state.get("warning")

        info["state"] = _resolve_state(app_type, entry, info)

        found.append(info)

    found.sort(key=lambda a: a["name"].lower())
    return found, conflicts


def _resolve_state(app_type, entry_dir, info) -> str:
    if info["disabled"]:
        return "disabled"
    if app_type == "unsupported":
        return "unsupported"
    if app_type in BUILDABLE_TYPES:
        status = info.get("build_status", "never")
        if status == "ok":
            return "ready"
        if status == "failed":
            return "failed"
        # "never", or a stale/unknown value — nothing built yet, but the
        # folder itself is fine. Buildable types with nothing to actually
        # build (a Flask app with no requirements.txt, etc.) always get
        # status "ok" from build_engine, so reaching here means real work
        # is pending.
        return "needs_build"
    return "ready"  # static — nothing to build, always usable


def _parse_actions(raw):
    """Validate a meta.json "actions" list. Returns (actions, error_or_None).

    Each action is normalized to {"label", "aliases", "path"} — "aliases"
    always includes the lowercased label itself, so an app author who
    only writes a label still gets a searchable command for free. A
    malformed list (wrong type entirely) or malformed individual entries
    never break discovery of the app itself — they're just dropped, with
    a short note surfaced via meta_error so it's visible on the card
    instead of silently missing from Quick Find."""
    if raw is None:
        return [], None
    if not isinstance(raw, list):
        return [], "meta.json 'actions' must be a list — ignoring it."

    parsed = []
    dropped = 0
    for entry in raw[:MAX_ACTIONS_PER_APP + 50]:  # cap the scan even before dedup
        if not isinstance(entry, dict):
            dropped += 1
            continue
        label = str(entry.get("label") or "").strip()
        path = entry.get("path")
        path = str(path).strip() if path is not None else ""
        if not label or not path:
            dropped += 1
            continue
        aliases = entry.get("aliases") or []
        if not isinstance(aliases, list):
            aliases = []
        aliases = [str(a).strip().lower() for a in aliases if str(a).strip()]
        if label.lower() not in aliases:
            aliases.append(label.lower())
        parsed.append({"label": label, "aliases": aliases, "path": path})
        if len(parsed) >= MAX_ACTIONS_PER_APP:
            break

    error = None
    if dropped:
        error = f"{dropped} malformed action(s) in meta.json were skipped (need both 'label' and 'path')."
    return parsed, error


def _slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value


def generate_display_name(folder_name: str) -> str:
    name = re.sub(r"[-_]+", " ", folder_name).strip()
    name = re.sub(r"\s+", " ", name)
    return name.title()


# ---------------------------------------------------------------
# JSON cache (dashboard reads this instead of scanning every hit)
# ---------------------------------------------------------------
def get_apps_list():
    if not CACHE_FILE.exists():
        rescan_apps(force=True)
    try:
        data = json.loads(CACHE_FILE.read_text(encoding="utf-8"))
        if isinstance(data, list) and all("state" in a for a in data):
            return data
    except (json.JSONDecodeError, OSError):
        pass
    # Cache missing, corrupted, or written by an older Workshop version
    # that didn't have the "state" field yet — rebuild once rather than
    # crash the dashboard on a stale on-disk cache from before an update.
    rescan_apps(force=True)
    try:
        return json.loads(CACHE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []


def get_scan_notices():
    """Non-fatal issues from the last rescan (currently: id collisions
    between two meta.json files). Always a list, never raises."""
    if not SCAN_NOTICES_FILE.exists():
        return []
    try:
        data = json.loads(SCAN_NOTICES_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, OSError):
        return []


def rescan_apps(force: bool = False):
    """Just re-lists apps/ and re-reads cached build results — never
    builds anything itself, so this is fast regardless of app count.
    Run scripts/build_tools.py separately to build new/changed Node/PHP/
    Python/Flask apps."""
    if not force and SCAN_LOCK_FILE.exists() and CACHE_FILE.exists():
        last = float((SCAN_LOCK_FILE.read_text().strip() or "0"))
        if time.time() - last < RESCAN_COOLDOWN_SECONDS:
            return  # too soon — keep serving the existing cache
    apps, conflicts = discover_apps()
    CACHE_FILE.write_text(json.dumps(apps, indent=2, ensure_ascii=False), encoding="utf-8")
    SCAN_NOTICES_FILE.write_text(json.dumps(conflicts, indent=2, ensure_ascii=False), encoding="utf-8")
    SCAN_LOCK_FILE.write_text(str(time.time()), encoding="utf-8")
    unbuilt = [a["name"] for a in apps if a["state"] == "needs_build"]
    if unbuilt:
        print(f"[workshop] {len(unbuilt)} app(s) not built yet: {', '.join(unbuilt)}")
        print("[workshop] Run:  python3 scripts/build_tools.py   then Rescan again.")
    if conflicts:
        for c in conflicts:
            print(f"[workshop] WARNING: duplicate meta.json id '{c['id']}' — "
                  f"'{c['renamed']}' kept its folder name as its id instead.")


def get_app_info(folder):
    """Return the discovered metadata/state record for one folder, or
    None if it isn't a real, discovered app."""
    apps, _ = discover_apps()
    return next((a for a in apps if a["folder"] == folder), None)


def resolve_app_folder(folder):
    """Validate a folder name coming from a URL against the *real* set of
    discovered apps and return its safe, resolved directory Path — or
    None if it isn't a legitimate on-disk app folder.

    This only checks that the folder genuinely exists and was
    discovered — NOT that it's currently openable. Routes that actually
    serve a tool's content (serve_static_app) additionally require
    state == "ready"; routes that manage a tool regardless of its state
    (rebuild, build log) only need this weaker check, since a "failed"
    or "needs_build" app is exactly the one you'd want to rebuild or
    read the log for.

    Folder names are used as-is (not run through secure_filename(), which
    rewrites characters like spaces and would silently break lookups for
    any app whose folder name isn't already filesystem-slug-safe — e.g.
    "code editor"). Safety instead comes from two independent checks:
    resolving must land exactly one level under apps/ (blocks traversal
    via the folder name), and the name must appear in the freshly
    discovered app list (a whitelist, not a guess)."""
    apps_root = APPS_DIR.resolve()
    app_dir = (apps_root / folder).resolve()

    if not app_dir.is_dir() or app_dir.parent != apps_root:
        return None
    if get_app_info(folder) is None:
        return None
    return app_dir
