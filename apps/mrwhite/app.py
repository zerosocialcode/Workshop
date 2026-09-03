# app.py
# Mr.White — Instagram DM Backup & Analytics Tool
# Workshop sub-app entry point. Everything the tool actually does (login,
# downloading, analytics, search, archiving) lives in mainvlast.py — this
# file only wires it up to a browser front-end and to Workshop's mounting
# contract (a module-level `app`).

import sys
import time
import threading
import uuid
from pathlib import Path

# Workshop mounts Flask sub-apps by importing this file in-process via
# importlib.util.spec_from_file_location (see src/workshop/mounting.py) —
# not by running `python app.py` directly. That loader never adds this
# folder to sys.path, so a plain sibling import of mainvlast.py fails
# with "ModuleNotFoundError: No module named 'mainvlast'" the moment
# Workshop mounts it, even though it works fine if you run this file
# standalone (which does auto-add its own folder to sys.path).
sys.path.insert(0, str(Path(__file__).resolve().parent))

from flask import (
    Flask, render_template, request, jsonify,
    send_file, abort
)

from mainvlast import MrWhite, BANNER


# ============================================================
#  Tee stdout: every print() still shows up in the terminal
#  exactly like before, but background jobs also get their own
#  copy of the output so the browser can show live progress.
# ============================================================
class LogTee:
    def __init__(self, real_stdout):
        self.real_stdout = real_stdout
        self.buffers = {}
        self.lock = threading.Lock()

    def register(self):
        ident = threading.get_ident()
        with self.lock:
            self.buffers[ident] = []
        return ident

    def unregister(self, ident):
        with self.lock:
            self.buffers.pop(ident, None)

    def snapshot(self, ident):
        with self.lock:
            return list(self.buffers.get(ident, []))

    def write(self, s):
        self.real_stdout.write(s)
        ident = threading.get_ident()
        with self.lock:
            buf = self.buffers.get(ident)
        if buf is not None and s:
            buf.append(s)

    def flush(self):
        self.real_stdout.flush()


log_tee = LogTee(sys.stdout)
sys.stdout = log_tee


# ============================================================
#  Tiny background job runner so slow operations (downloading
#  hundreds of messages, etc.) don't block the browser. The
#  browser polls /api/job/<id> for status + live log lines.
# ============================================================
jobs = {}
jobs_lock = threading.Lock()


def start_job(fn, *args, **kwargs):
    job_id = uuid.uuid4().hex[:10]
    with jobs_lock:
        jobs[job_id] = {"status": "running", "ident": None, "log": [], "result": None, "error": None}

    def runner():
        ident = log_tee.register()
        with jobs_lock:
            jobs[job_id]["ident"] = ident
        try:
            result = fn(*args, **kwargs)
            with jobs_lock:
                jobs[job_id]["result"] = _to_jsonable(result)
                jobs[job_id]["status"] = "done"
        except Exception as e:
            print(f"Error: {e}")
            with jobs_lock:
                jobs[job_id]["status"] = "error"
                jobs[job_id]["error"] = str(e)
        finally:
            with jobs_lock:
                jobs[job_id]["log"] = log_tee.snapshot(ident)
            log_tee.unregister(ident)

    threading.Thread(target=runner, daemon=True).start()
    return job_id


def _to_jsonable(value):
    if isinstance(value, Path):
        return str(value)
    return value


def job_status(job_id):
    job = jobs.get(job_id)
    if not job:
        return None
    if job["status"] == "running" and job["ident"] is not None:
        log_text = "".join(log_tee.snapshot(job["ident"]))
    else:
        log_text = "".join(job["log"])
    return {
        "status": job["status"],
        "log": log_text,
        "result": job["result"],
        "error": job["error"],
    }


# ============================================================
#  Thin wrapper around MrWhite: same class, same methods, just
#  adds two non-interactive helpers (login + list conversations)
#  so they can be driven by web requests instead of input().
# ============================================================
class WebMrWhite(MrWhite):
    def __init__(self, backup_dir="mrwhite_backups"):
        super().__init__(backup_dir=backup_dir)
        self.username = None
        self.threads_cache = {}
        self.threads_meta = []

    def web_login(self, session_id):
        self.client.set_user_agent("Instagram 269.0.0.18.75 Android")
        self.client.login_by_sessionid(session_id)
        info = self.client.account_info()
        self.username = info.username
        print(f"Authenticated as: @{self.username}")
        return self.username

    def fetch_conversations(self):
        print("\nFetching conversations...")
        threads = self.client.direct_threads(amount=0)
        self.threads_cache = {}
        self.threads_meta = []
        type_map = {
            "media_share": "Photo/Video", "voice_media": "Voice", "like": "Like",
            "clip": "Clip", "xma_clip": "Reel", "reel_share": "Reel",
            "link": "Link", "xma_profile": "Profile", "generic_xma": "Content",
        }
        for idx, thread in enumerate(threads, 1):
            title = thread.thread_title if thread.thread_title else "Unnamed Chat"
            participants = []
            if getattr(thread, "users", None):
                for user_id in thread.users:
                    uname = self.get_username_safe(user_id)
                    if not uname.startswith("pk=") and uname not in participants:
                        participants.append(uname)
            names = ", ".join(participants[:3]) + (f" +{len(participants) - 3} more" if len(participants) > 3 else "")
            if not participants:
                names = title
            preview = ""
            if getattr(thread, "messages", None):
                try:
                    last_msg = thread.messages[0]
                    preview = last_msg.text[:60] if last_msg.item_type == "text" and last_msg.text else type_map.get(last_msg.item_type, f"[{last_msg.item_type}]")
                    if isinstance(preview, str) and len(preview) > 60:
                        preview = preview[:60] + "..."
                except Exception:
                    preview = ""
            self.threads_cache[str(idx)] = thread
            self.threads_meta.append({"index": idx, "title": title, "participants": names, "preview": preview})
        print(f"Found {len(threads)} conversations")
        return self.threads_meta


mr_white = WebMrWhite()
app = Flask(__name__)


# ---------------- pages ----------------
@app.route("/")
def index():
    if not mr_white.username:
        return render_template("login.html")
    tab = request.args.get("tab", "download")
    if tab not in ("download", "analytics", "search", "archive"):
        tab = "download"
    return render_template("dashboard.html", username=mr_white.username, initial_tab=tab)


# ---------------- auth ----------------
@app.route("/api/login", methods=["POST"])
def api_login():
    session_id = request.form.get("session_id", "").strip()
    if not session_id:
        return jsonify({"error": "Session ID is required"}), 400
    job_id = start_job(mr_white.web_login, session_id)
    return jsonify({"job_id": job_id})


@app.route("/api/logout", methods=["POST"])
def api_logout():
    global mr_white
    mr_white = WebMrWhite()
    return jsonify({"ok": True})


# ---------------- conversations / download ----------------
@app.route("/api/conversations", methods=["POST"])
def api_conversations():
    if not mr_white.username:
        return jsonify({"error": "Not logged in"}), 401
    job_id = start_job(mr_white.fetch_conversations)
    return jsonify({"job_id": job_id})


@app.route("/api/download", methods=["POST"])
def api_download():
    if not mr_white.username:
        return jsonify({"error": "Not logged in"}), 401
    data = request.get_json(force=True, silent=True) or {}
    indices = [str(i) for i in data.get("indices", [])]
    selected = [mr_white.threads_cache[i] for i in indices if i in mr_white.threads_cache]
    if not selected:
        return jsonify({"error": "No valid conversations selected"}), 400

    def job():
        print("\n" + "=" * 50)
        print("COOKING...")
        print("=" * 50)
        names = []
        for thread in selected:
            title = thread.thread_title if thread.thread_title else "Unnamed"
            if mr_white.process_conversation(thread):
                names.append(mr_white._sanitize(title))
            time.sleep(2)
        print(f"\n{len(names)}/{len(selected)} batches cooked perfectly.")
        print(f"Product: {mr_white.backup_dir.absolute()}")
        return {"success": len(names), "total": len(selected), "names": names}

    job_id = start_job(job)
    return jsonify({"job_id": job_id})


# ---------------- analytics ----------------
@app.route("/api/analytics", methods=["POST"])
def api_analytics():
    if not mr_white.username:
        return jsonify({"error": "Not logged in"}), 401
    job_id = start_job(mr_white.generate_analytics_dashboard)
    return jsonify({"job_id": job_id})


# ---------------- search (fast/local — no job needed) ----------------
@app.route("/api/search")
def api_search():
    if not mr_white.username:
        return jsonify({"error": "Not logged in"}), 401
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"results": []})
    results = mr_white.search_backups(query)
    return jsonify({"results": results[:50], "total": len(results)})


# ---------------- archive ----------------
@app.route("/api/archive", methods=["POST"])
def api_archive():
    if not mr_white.username:
        return jsonify({"error": "Not logged in"}), 401
    job_id = start_job(mr_white.create_backup_archive)
    return jsonify({"job_id": job_id})


@app.route("/download-archive/<path:filename>")
def download_archive(filename):
    archive_path = (mr_white.backup_dir.parent / filename).resolve()
    if archive_path.parent != mr_white.backup_dir.parent.resolve() or archive_path.suffix != ".zip":
        abort(403)
    if not archive_path.exists():
        abort(404)
    return send_file(archive_path, as_attachment=True)


# ---------------- job polling ----------------
@app.route("/api/job/<job_id>")
def api_job(job_id):
    status = job_status(job_id)
    if status is None:
        return jsonify({"error": "Unknown job"}), 404
    return jsonify(status)


# ---------------- serving backup files (dashboard + html viewers + media) ----------------
@app.route("/backups/<path:filepath>")
def serve_backup_file(filepath):
    root = mr_white.backup_dir.resolve()
    target = (root / filepath).resolve()
    if root not in target.parents and target != root:
        abort(403)
    if not target.exists() or target.is_dir():
        abort(404)
    return send_file(target)


if __name__ == "__main__":
    print(BANNER)
    print("Mr.White — running standalone (outside Workshop)")
    print("Starting server at http://127.0.0.1:5050")
    app.run(host="127.0.0.1", port=5050, threaded=True, debug=False)
