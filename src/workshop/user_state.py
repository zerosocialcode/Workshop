"""
Workshop — user/platform state
---------------------------------
This is what makes Workshop more than a page that lists folders: a
small, durable record of *how this bench is actually being used* —
pinned tools, recently opened ones, and recently run Quick Find
commands.

Deliberately NOT in cache/: cache/ is disposable (discovery.py and
build_engine.py regenerate it freely, and deleting it just costs one
slow rescan). This file is not disposable — it's the only place these
facts live, so it gets its own top-level data/ directory that nothing
else writes to or clears.

Single-user, single-machine, no database: same philosophy as the rest
of Workshop. One small JSON file, read-modify-written under a lock-free
"read current, mutate, write back" pattern — perfectly fine at the
request volume one person clicking around a local dashboard generates.
"""
import json
import time

from .paths import USER_STATE_FILE

MAX_RECENT_TOOLS = 12
MAX_RECENT_COMMANDS = 8

_DEFAULT_STATE = {"favorites": [], "recent": [], "recent_commands": []}


def _load() -> dict:
    if not USER_STATE_FILE.exists():
        return dict(_DEFAULT_STATE)
    try:
        data = json.loads(USER_STATE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return dict(_DEFAULT_STATE)
    if not isinstance(data, dict):
        return dict(_DEFAULT_STATE)
    for key, default in _DEFAULT_STATE.items():
        data.setdefault(key, default)
    return data


def _save(data: dict) -> None:
    USER_STATE_FILE.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def get_state() -> dict:
    """Everything the frontend needs to render Pinned/Continue Working
    and to seed Quick Find's 'recent commands' list."""
    return _load()


# ---------------------------------------------------------------
# Favorites / pinned tools
# ---------------------------------------------------------------
def toggle_favorite(folder: str) -> bool:
    """Flip a tool's pinned state. Returns the NEW state (True = now pinned)."""
    data = _load()
    favs = data["favorites"]
    if folder in favs:
        favs.remove(folder)
        pinned = False
    else:
        favs.append(folder)
        pinned = True
    _save(data)
    return pinned


# ---------------------------------------------------------------
# Recently opened tools ("Continue Working")
# ---------------------------------------------------------------
def record_tool_opened(folder: str) -> None:
    data = _load()
    recent = [r for r in data["recent"] if r.get("folder") != folder]
    recent.insert(0, {"folder": folder, "opened_at": time.time()})
    data["recent"] = recent[:MAX_RECENT_TOOLS]
    _save(data)


def clear_recent() -> None:
    data = _load()
    data["recent"] = []
    _save(data)


# ---------------------------------------------------------------
# Recently run Quick Find commands (system commands, not tool opens)
# ---------------------------------------------------------------
def record_command_used(command_id: str, label: str) -> None:
    data = _load()
    cmds = [c for c in data["recent_commands"] if c.get("id") != command_id]
    cmds.insert(0, {"id": command_id, "label": label, "used_at": time.time()})
    data["recent_commands"] = cmds[:MAX_RECENT_COMMANDS]
    _save(data)
