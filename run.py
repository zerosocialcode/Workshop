#!/usr/bin/env python3
"""
Workshop — entry point
-------------------------
Starts the local Workshop server. This file never builds anything —
run scripts/build_tools.py first (or whenever apps/ changes) so the
tools you drop into apps/ are actually ready to open.

    python3 run.py

Then open http://127.0.0.1:5000
"""
from src.workshop import create_app

app = create_app()

if __name__ == "__main__":
    # Personal-use dev server. Set debug=False (or use waitress/gunicorn)
    # if you ever expose this beyond localhost — see README.md.
    app.run(host="127.0.0.1", port=5000, debug=True, use_reloader=False)
