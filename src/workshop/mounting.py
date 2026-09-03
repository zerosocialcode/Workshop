"""
Workshop — Flask sub-app mounting
------------------------------------
A Flask-type sub-app (apps/<folder>/app.py defining a module-level
`app = Flask(__name__)`) is imported in-process and mounted at startup
via werkzeug's DispatcherMiddleware — see server.py. Because mounting
happens once at process start, a NEW Flask sub-app requires a server
restart to appear (static and node sub-apps don't).

A sub-app that fails to import doesn't just print a warning and get
forgotten: the failure is written into the SAME build_state.json that
build_engine.py uses, under that folder's name, with status "failed".
That's what lets discovery.py report a real "failed" state for a
broken Flask app on the dashboard instead of it just silently not
working — one broken sub-app affects only its own card, and now that's
visible instead of console-only.
"""
import importlib.util
import sys
import time

from . import build_engine as builder
from .discovery import discover_apps
from .paths import APPS_DIR


def load_flask_mounts():
    mounts = {}
    apps, _ = discover_apps()
    for info in apps:
        if info["type"] != "flask" or info["disabled"]:
            continue
        folder = info["folder"]
        app_file = APPS_DIR / folder / "app.py"
        module_name = f"workshop_subapp_{folder}"
        try:
            spec = importlib.util.spec_from_file_location(module_name, app_file)
            module = importlib.util.module_from_spec(spec)
            sys.modules[module_name] = module
            spec.loader.exec_module(module)  # type: ignore[union-attr]
            sub_app = getattr(module, "app", None)
            if sub_app is not None:
                mounts[f"/apps/{folder}"] = sub_app
                print(f"[workshop] mounted Flask sub-app: /apps/{folder}/")
            else:
                _record_mount_failure(folder, "app.py has no module-level 'app' object.")
        except Exception as exc:  # noqa: BLE001 — one bad sub-app shouldn't crash the dashboard
            print(f"[workshop] WARNING: failed to load apps/{folder}/app.py: {exc}")
            _record_mount_failure(folder, f"Failed to import app.py: {exc}")
    return mounts


def _record_mount_failure(folder: str, message: str) -> None:
    state = builder.load_state(folder)
    # Don't clobber a real build failure (missing requirements.txt deps,
    # say) with the mount error — but if the last recorded status was
    # "ok"/"never", the mount failure IS the freshest, most relevant
    # thing wrong with this tool right now.
    if state.get("status") == "failed":
        return
    builder.save_state(folder, {
        "type": "flask", "status": "failed", "signature": state.get("signature"),
        "error": message, "built_at": time.time(),
    })
