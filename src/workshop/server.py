"""
Workshop — server
--------------------
Personal-use platform that auto-discovers sub-apps dropped into /apps/
and layers real platform services on top of them: tool discovery with
formal metadata and per-app state, pinned/recent tools, and a
Quick Find (the full-page task/command entry point — see
web/static/js/quickfind.js) backed by a small JSON API. See discovery.py
for the metadata/state contract and user_state.py for what the
platform layer remembers between visits.

Three kinds of sub-apps are supported:

  1. STATIC apps  — a folder with index.html/.htm (+ css/js/images).
     Discovered live. Click "Rescan bench" any time to pick up new
     ones — no restart needed.

  2. FLASK apps   — a folder with app.py that defines a module-level
     `app = Flask(__name__)` object. These are mounted at startup via
     werkzeug's DispatcherMiddleware, so they run as fully independent
     Flask apps with their own routes/state. Because mounting happens
     once at import time, NEW Flask sub-apps require a server restart
     to appear (existing ones don't).

  3. NODE apps    — a folder with package.json that defines a "build"
     script (React, Vite, plain TS, anything that compiles to static
     output). Workshop serves whatever build folder comes out (dist/,
     build/, out/, ...) the same way it serves a static app.

PHP and standalone Python tools are also discovered and get their
dependencies installed by build_tools.py, but (like before) only
actually open in a browser if they also expose a static entry point.

Building/installing dependencies for Node, PHP, Python, and Flask
sub-apps is NOT done here — it's handled by scripts/build_tools.py
(run it whenever you drop in a new app, before starting this server,
or before clicking Rescan). That keeps Rescan and startup instant no
matter how many apps are installed: this module only ever reads cached
build results (cache/build_state.json, written by build_tools.py /
build_engine.py) — it never itself shells out to npm, pip, or composer.
The one exceptions are the "⟳ Rebuild" button on a single Node app's
card, and Quick Find's "Rebuild all tools" command, both of
which run a build on demand.

No database — everything lives on disk: cache/ for disposable,
regenerable state, data/ for the small amount of platform state that
isn't (favorites, recent tools/commands — see user_state.py).
"""
import json

from flask import Flask, Response, abort, jsonify, redirect, render_template, request, send_from_directory
from werkzeug.middleware.dispatcher import DispatcherMiddleware

from . import build_engine as builder
from . import discovery
from . import user_state
from .html_utils import serve_html_with_base
from .mounting import load_flask_mounts
from .paths import BUILD_LOG_DIR, STATIC_DIR, TEMPLATES_DIR


def create_app() -> Flask:
    """Build and return the Workshop Flask application. Wraps all
    module-level side effects (mounting Flask sub-apps, the startup
    unbuilt-app notice) so importing this module never has effects of
    its own — only calling create_app() does."""
    app = Flask(
        __name__,
        template_folder=str(TEMPLATES_DIR),
        static_folder=str(STATIC_DIR),
        static_url_path="/static",
    )

    app.wsgi_app = DispatcherMiddleware(app.wsgi_app, load_flask_mounts())  # type: ignore[method-assign]

    _startup_apps, _ = discovery.discover_apps()
    _unbuilt = [a["name"] for a in _startup_apps if a["state"] == "needs_build"]
    if _unbuilt:
        print(f"[workshop] {len(_unbuilt)} app(s) not built yet: {', '.join(_unbuilt)}")
        print("[workshop] Run:  python3 scripts/build_tools.py   before opening the dashboard.")

    register_routes(app)
    return app


def register_routes(app: Flask) -> None:
    # -----------------------------------------------------------
    # Pages
    # -----------------------------------------------------------
    @app.route("/")
    def bench():
        apps = discovery.get_apps_list()
        notices = discovery.get_scan_notices()
        state = user_state.get_state()
        by_folder = {a["folder"]: a for a in apps}
        pinned = [by_folder[f] for f in state["favorites"] if f in by_folder]
        recent = [by_folder[r["folder"]] for r in state["recent"] if r["folder"] in by_folder]
        return render_template(
            "bench.html",
            apps=apps,
            count=len([a for a in apps if a["state"] == "ready"]),
            notices=notices,
            pinned=pinned,
            recent=recent,
            favorite_folders=set(state["favorites"]),
            apps_json=json.dumps(apps, ensure_ascii=False),
        )

    @app.route("/refresh")
    def refresh():
        discovery.rescan_apps(force=True)
        return redirect("/")

    @app.route("/rebuild/<folder>")
    def rebuild(folder):
        """Force-rebuild one NODE sub-app on demand (e.g. after editing its
        source), without waiting for the next full Rescan."""
        if discovery.resolve_app_folder(folder) is not None:
            builder.build_node(folder, force=True)
            discovery.rescan_apps(force=True)
        return redirect("/")

    @app.route("/buildlog/<folder>")
    def build_log(folder):
        if discovery.resolve_app_folder(folder) is None:
            abort(404)
        log_path = BUILD_LOG_DIR / f"{folder}.log"
        if not log_path.exists():
            abort(404)
        return Response(log_path.read_text(encoding="utf-8", errors="replace"), mimetype="text/plain")

    @app.route("/apps/<folder>/", defaults={"subpath": ""})
    @app.route("/apps/<folder>/<path:subpath>")
    def serve_static_app(folder, subpath):
        """Handles STATIC and NODE (built) sub-apps. Flask-type sub-apps never
        reach this view — DispatcherMiddleware intercepts and routes to them
        earlier."""
        app_dir = discovery.resolve_app_folder(folder)
        if app_dir is None:
            abort(404)

        info = discovery.get_app_info(folder)
        if info is None or info["state"] != "ready":
            abort(404)  # disabled / unsupported / failed / needs_build — friendly 404 page

        if info["type"] == "node":
            app_dir = (app_dir / info["build_output"]).resolve()
            if not app_dir.is_dir():
                abort(404)

        if subpath == "":
            if (app_dir / "index.html").exists():
                subpath = "index.html"
            elif (app_dir / "index.htm").exists():
                subpath = "index.htm"
            else:
                abort(404)

        target = (app_dir / subpath).resolve()

        # target must stay inside app_dir (blocks ../../ traversal via subpath)
        if app_dir != target and app_dir not in target.parents:
            abort(404)
        if not target.exists() or not target.is_file():
            abort(404)

        if target.suffix.lower() in (".html", ".htm"):
            return serve_html_with_base(target, folder)

        return send_from_directory(app_dir, subpath)

    # -----------------------------------------------------------
    # Platform API — Quick Find, pins, recent tools, rebuild-all.
    # Small, unauthenticated JSON endpoints: fine for a localhost,
    # single-user process, same trust model as every other route here.
    # -----------------------------------------------------------
    @app.route("/api/state")
    def api_state():
        """Everything the frontend needs to render Pinned / Continue
        Working and seed Quick Find's recent-commands list."""
        return jsonify(user_state.get_state())

    @app.route("/api/recent", methods=["POST"])
    def api_record_recent():
        folder = (request.get_json(silent=True) or {}).get("folder", "")
        if discovery.get_app_info(folder) is None:
            abort(404)
        user_state.record_tool_opened(folder)
        return jsonify({"ok": True})

    @app.route("/api/recent/clear", methods=["POST"])
    def api_clear_recent():
        user_state.clear_recent()
        return jsonify({"ok": True})

    @app.route("/api/favorites/toggle", methods=["POST"])
    def api_toggle_favorite():
        folder = (request.get_json(silent=True) or {}).get("folder", "")
        if discovery.get_app_info(folder) is None:
            abort(404)
        pinned = user_state.toggle_favorite(folder)
        return jsonify({"ok": True, "pinned": pinned})

    @app.route("/api/commands/used", methods=["POST"])
    def api_command_used():
        body = request.get_json(silent=True) or {}
        command_id = str(body.get("id", "")).strip()
        label = str(body.get("label", "")).strip()
        if not command_id or not label:
            abort(400)
        user_state.record_command_used(command_id, label)
        return jsonify({"ok": True})

    @app.route("/api/rebuild-all", methods=["POST"])
    def api_rebuild_all():
        """Quick Find's 'Rebuild all tools' system command.
        Rebuilds only what actually needs it (content-hash fingerprint
        cache, same as scripts/build_tools.py) — a no-op run just
        re-confirms everything's current, it doesn't force full rebuilds."""
        apps, _ = discovery.discover_apps()
        results = []
        for a in apps:
            if a["type"] not in discovery.BUILDABLE_TYPES:
                continue
            build_fn = builder.BUILDERS.get(a["type"])
            if build_fn is None:
                continue
            state = build_fn(a["folder"], force=False)
            results.append({"folder": a["folder"], "name": a["name"], "status": state.get("status")})
        discovery.rescan_apps(force=True)
        failed = [r["name"] for r in results if r["status"] == "failed"]
        return jsonify({"ok": True, "results": results, "failed": failed})

    @app.errorhandler(404)
    def not_found(_err):
        return render_template("tool-unavailable.html"), 404
