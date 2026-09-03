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
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

# Allow `from src.workshop import ...` when this script is run directly
# as `python3 scripts/build_tools.py` from anywhere.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.workshop import build_engine as b


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


def echo_line(line):
    sys.stdout.write("   │ " + line if line.endswith("\n") else "   │ " + line + "\n")
    sys.stdout.flush()


def build_one(name, entry, t, force):
    print(f"\n▶ Building {name}  [{t}]")
    return b.BUILDERS[t](name, force=force, on_line=echo_line)


def handle_result(name, entry, t, state, force):
    """Loops on retry/manual-fix; returns 'ok', 'skip', or 'abort'."""
    while True:
        if state.get("status") == "ok":
            warn = state.get("warning")
            print(f"  ✅ {name} built OK" + (f"\n     ⚠ {warn}" if warn else ""))
            return "ok"

        print(f"  ❌ {name} failed: {state.get('error')}")
        choice = input("     [r]etry / [s]kip / [m]anual fix now / [a]bort all? ").strip().lower()

        if choice.startswith("r"):
            state = build_one(name, entry, t, True)
            continue
        if choice.startswith("s"):
            state["status"] = "skipped"
            b.save_state(name, state)
            return "skip"
        if choice.startswith("m"):
            shell = os.environ.get("SHELL", "/bin/bash")
            print(f"     Opening a shell in apps/{name} — fix the issue, then `exit` to retry the build.")
            subprocess.run([shell], cwd=entry)
            state = build_one(name, entry, t, True)
            continue
        if choice.startswith("a"):
            return "abort"
        print("     Please answer r, s, m, or a.")


def launch_server():
    print("\nStarting Workshop server (python3 run.py)…\n")
    subprocess.run([sys.executable, str(b.BASE_DIR / "run.py")])


def main():
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
        tag = t if b.needs_build_step(t, entry) else f"{t} — no build needed"
        state = b.load_state(name)
        marker = "✅" if state.get("status") == "ok" else ("⏭ " if state.get("status") == "skipped" else "  ")
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
        state = build_one(name, entry, t, True)
        outcome = handle_result(name, entry, t, state, True)
        sys.exit(0 if outcome in ("ok", "skip") else 1)

    if args.list:
        return

    pending = pending_list(apps, force=args.force)
    if not pending:
        print("\n✅ Everything is already built and up to date. Rescan will be instant.")
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

    ok_count = skip_count = 0
    for i, (name, entry, t) in enumerate(pending):
        state = build_one(name, entry, t, args.force)
        outcome = handle_result(name, entry, t, state, args.force)
        if outcome == "abort":
            remaining = len(pending) - i - 1
            print(f"\n⏹  Stopped. {ok_count} built, {skip_count} skipped, {remaining} not attempted.")
            sys.exit(1)
        if outcome == "ok":
            ok_count += 1
        else:
            skip_count += 1

    print(f"\n✨ Done — {ok_count} built, {skip_count} skipped.")
    if args.serve:
        launch_server()


if __name__ == "__main__":
    main()
