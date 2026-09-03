"""
Workshop — HTML rewriting helpers
------------------------------------
Small, focused helpers for touching up a sub-app's HTML on the way out
the door, without editing the sub-app's own files on disk.
"""
import re
from pathlib import Path

from flask import Response


def serve_html_with_base(path: Path, folder: str) -> Response:
    """Read an HTML file and inject <base href="/apps/<folder>/"> so the
    sub-app's own relative css/js/img paths resolve correctly no matter
    what URL loaded the page — without editing the sub-app itself."""
    html = path.read_text(encoding="utf-8", errors="replace")
    base_tag = f'<base href="/apps/{folder}/">'
    if re.search(r"<head[^>]*>", html, re.IGNORECASE):
        html = re.sub(r"(<head[^>]*>)", r"\1" + base_tag, html, count=1, flags=re.IGNORECASE)
    elif re.search(r"</head>", html, re.IGNORECASE):
        html = re.sub(r"</head>", base_tag + "</head>", html, count=1, flags=re.IGNORECASE)
    else:
        html = base_tag + html
    return Response(html, mimetype="text/html")
