"""
Workshop — shared path constants
----------------------------------
Every module in this package resolves its paths from here instead of
recomputing `Path(__file__).resolve().parent...` locally. That keeps
the on-disk layout (src/workshop/, web/, apps/, cache/) defined in
exactly one place.

Layout:

    workshop/                  <- BASE_DIR (project root)
    ├── src/workshop/          <- this package (paths.py lives here)
    ├── web/
    │   ├── templates/         <- TEMPLATES_DIR
    │   └── static/            <- STATIC_DIR
    ├── apps/                  <- APPS_DIR   (sub-apps — never touched by this package)
    ├── cache/                 <- CACHE_DIR  (auto-generated, gitignored, disposable —
    │                              safe to delete; discovery/build_engine rebuild it)
    ├── data/                  <- DATA_DIR   (auto-generated, but NOT disposable — this
    │                              is the user's actual platform state: pins, recent
    │                              tools, command history. Kept separate from cache/
    │                              on purpose so "clear the cache" never wipes it)
    └── run.py                 <- entry point
"""
from pathlib import Path

# src/workshop/paths.py -> src/workshop -> src -> <project root>
BASE_DIR = Path(__file__).resolve().parents[2]

APPS_DIR = BASE_DIR / "apps"
CACHE_DIR = BASE_DIR / "cache"
BUILD_LOG_DIR = CACHE_DIR / "build_logs"
DATA_DIR = BASE_DIR / "data"

WEB_DIR = BASE_DIR / "web"
TEMPLATES_DIR = WEB_DIR / "templates"
STATIC_DIR = WEB_DIR / "static"

CACHE_FILE = CACHE_DIR / "apps_list.json"
BUILD_STATE_FILE = CACHE_DIR / "build_state.json"
SCAN_LOCK_FILE = CACHE_DIR / ".last_scan"
SCAN_NOTICES_FILE = CACHE_DIR / "scan_notices.json"

# data/ — durable platform state, never touched by a rescan or rebuild.
USER_STATE_FILE = DATA_DIR / "user_state.json"

CACHE_DIR.mkdir(exist_ok=True)
BUILD_LOG_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)
