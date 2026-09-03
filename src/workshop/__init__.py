"""
Workshop
----------
Local-first bench for launching, discovering, and managing hand-built
tools. See docs/platform-evolution.md for where this is headed.

Public entry point: create_app() builds and returns the Flask
application — nothing in this package has import-time side effects on
its own; run.py is what actually calls create_app() and serves it.
"""
from .server import create_app

__all__ = ["create_app"]
