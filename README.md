# Workshop

This is my personal toolbox, packaged up so I can clone it onto any machine and
have every tool I've built running from one dashboard in a couple of minutes.

It is **not** a "drop your app in a folder and it magically shows up" framework
you're meant to build a product around. It's the opposite: a workshop that
already comes loaded with tools. You clone it, run one build script, and every
app that ships with it gets built and shows up on the dashboard, ready to
open. If you want to bolt on more tools of your own later, you can — but
that's a bonus, not the point.

Everything runs locally. No database, no accounts, no cloud anything — just a
Flask process on `127.0.0.1:5000` serving whatever's sitting in `apps/`.

It's grown past "a page that lists folders you click on" — there are two
distinct ways in (**Explore**, for browsing/filtering by name, and
**Quick Find**, for typing what you want to *do*), pinned/recent tools,
and every tool now has a real state (not just node's build status)
instead of quietly disappearing when something's wrong. See **The
dashboard** and **The platform layer** below.

## Get it running

```bash
git clone https://github.com/zerosocialcode/Workshop.git
cd workshop
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python3 scripts/build_tools.py
python3 run.py
```

Then open **http://127.0.0.1:5000**.

That `scripts/build_tools.py` step matters — it's what actually builds every
tool that ships in `apps/` (installs dependencies, runs `npm run build` for
the frontend ones, sets up virtualenvs for standalone Python tools, whatever
each one needs). `run.py` itself never builds anything; it just serves what
`build_tools.py` already prepared. That's on purpose — it keeps the dashboard
and the "Rescan" button instant no matter how many tools are in here, and it
means a broken build in one app can't take down the whole server.

Run `build_tools.py` again any time you pull new changes, add a tool, or edit
one — it only rebuilds what actually changed, so re-running it with nothing
new is basically instant.

```bash
python3 scripts/build_tools.py            # interactive: shows what's pending, asks, builds
python3 scripts/build_tools.py --yes      # don't ask, just build everything pending
python3 scripts/build_tools.py --list     # show every tool's detected type/status, build nothing
python3 scripts/build_tools.py --only my-tool   # (re)build one tool, ignoring the cache
python3 scripts/build_tools.py --force    # rebuild everything, ignoring the cache
python3 scripts/build_tools.py --serve    # build, then launch python3 run.py for you
```

If a build fails it stops right there and asks what to do: retry, skip it and
move on, drop into a shell inside that tool's folder to fix it by hand, or
abort the whole run. Tools that already built successfully are left alone
either way.

## What's in the box

```
workshop/
├── run.py                        Entry point — python3 run.py starts the server
├── requirements.txt
├── src/
│   └── workshop/                 The actual application package
│       ├── server.py             Flask app factory + routes (never builds)
│       ├── discovery.py          Scans apps/, maintains the listing cache
│       ├── build_engine.py       Shared type-detection + build-execution logic
│       ├── mounting.py           Mounts Flask sub-apps at startup
│       ├── html_utils.py         <base href> injection for served HTML
│       ├── user_state.py         Pins / recent tools / recent commands
│       └── paths.py              Single source of truth for on-disk layout
├── web/
│   ├── templates/
│   │   ├── bench.html            The dashboard page (Explore + Quick Find + landing gate)
│   │   └── tool-unavailable.html
│   └── static/
│       ├── css/                  bench.css, tool-unavailable.css
│       └── js/                   bench.js (Explore/dashboard behaviour),
│                                  resolver.js (shared query/action
│                                  matching engine), quickfind.js
│                                  (Quick Find mode + Ctrl+K + system
│                                  commands)
├── scripts/
│   └── build_tools.py            The script you run to build everything
├── docs/
│   ├── design-system.md          Visual language reference (hand to an AI building a tool's UI)
│   ├── app-development-guide.md  How to build a new tool for Workshop (hand to an AI building the tool itself)
│   └── platform-evolution.md     Where Workshop is headed next
├── cache/                        Auto-generated, don't touch by hand — safe
│   │                             to delete, gets rebuilt from scratch
│   ├── apps_list.json            Cached dashboard listing
│   ├── build_state.json          Per-app build status/signature
│   ├── scan_notices.json         Non-fatal issues from the last scan (e.g. a duplicate meta.json id)
│   └── build_logs/<folder>.log   Full build output for each tool
├── data/                         Auto-generated, but NOT disposable — your
│   │                             actual platform state. Separate from cache/
│   │                             on purpose, so clearing the cache never
│   │                             wipes this. Gitignored.
│   └── user_state.json           Pinned tools, recent tools, recent commands
└── apps/
    └── <your-tool>/               One folder per tool — see "Adding a
                                    tool of your own" below
```

Everything under `apps/` in this repo is a real, working tool — there's no
placeholder/sample app included. `docs/app-development-guide.md` §6a/§6b
points at two of them (`Image Converter`, `calculator`, `codeeditor` +
`javascript-obfuscator`) as live reference implementations of the
optional conventions, if you want to see one before writing your own.

## The dashboard

It's a page with a card per tool — name, version, a short description, a
category tag, a state badge, and an **Open** button. There are deliberately
no icons; every card looks the same regardless of what the tool does, so the
grid stays quiet and you're scanning names, not logos.

Above the grid, up to two extra rows appear only when you've actually used
them (nothing to look at on a fresh clone):

- **Pinned** — click the ☆ on any card to keep it here regardless of where
  it sorts alphabetically.
- **Continue Working** — the last few tools you opened, most recent first,
  with a **Clear** link.

If more than one category exists across your tools, a row of filter chips
appears above the grid; combine it with the text field to narrow things
down. Both live-filter the **All Tools** grid only — Pinned/Continue Working
stay put, since filtering a five-item list you curated yourself isn't
useful.

There's a day/night toggle in the top right (the little switch — click it).
It remembers your choice per browser, and otherwise follows your system's
light/dark setting the first time you load the page.

**Rescan bench** re-lists what's in `apps/` and re-reads whatever
`build_tools.py` already wrote to the cache — it does not build anything
itself. Static tools show up the moment you rescan. New Flask tools need a
server restart, because their mounting happens once at process startup.
There's also a cooldown of 60 seconds between rescans so mashing the button
doesn't hammer the filesystem.

## The platform layer

Workshop has two entry modes, and they deliberately do **different jobs**
— this is the single most important thing to understand about how it
works now:

**Explore** is the dashboard grid you land on — cards, pinned/recent
sections, category chips, and a plain text filter (`#searchInput`) that
matches name/folder/description/category/keywords. That's *all* it does.
It answers "which tool is this," nothing more.

**Quick Find** is a separate full-page mode for typing what you want to
*do*, not just browse. Switch to it via the pill in the header, or press
`Ctrl+K`/`Cmd+K` from anywhere — there's no separate popup palette
anymore, Ctrl+K just jumps straight into this page. Type:

- a tool name — "calculator"
- a task — "convert jpg to png" — and it lands directly on that specific
  mode of a tool, if the tool declares that action (see
  `docs/app-development-guide.md` §6). Format-conversion actions
  (`?to=<fmt>`) resolve from *any* "A to B" phrasing, not just the exact
  aliases a tool wrote — "gif to png" works even if no alias says so.
- a sum — "25% of 480" — resolved and computed instantly if some tool
  declares itself the calculator (`"intents": ["calculate_expression"]`)
- a system command — *Rebuild all tools*, *Rescan bench*, *Toggle
  day/night lights*, *Clear recent activity*, *Show keyboard shortcuts*

With an empty query it shows your recent tools/commands, plus — if the
last tool you used declares `produces` and another ready tool declares an
overlapping `accepts` — a "Continue with" suggestion (label-matching
only, no data is passed between tools; see
`docs/app-development-guide.md` §6b). With no recent history yet, it
shows a few example queries to try instead.

You can also drag a file onto Quick Find: it reads only the file's
*name* (for the extension) to seed a search — never its contents, and
nothing leaves the browser.

Selecting a result opens the tool exactly the way its card would
(embedded viewer, or a new tab if its `meta.json` says `"open": "tab"`),
at that specific action's destination if one was picked.

First time you open Workshop, a landing gate asks Explore or Quick Find
up front; after that your choice (and whichever mode you're in) is
remembered per browser, and the header pill lets you switch anytime.

**Keyboard shortcuts:** `Ctrl+K` jumps to Quick Find (and re-selects the
query text if you're already there), `/` focuses Explore's filter field,
`↑`/`↓` move through Quick Find's results, `Enter` selects, `Esc` clears
the Quick Find query (or backs out to Explore if it's already empty) and
closes any open overlay/viewer, `?` shows the full shortcut list.

**Pins and recent tools/commands** live in `data/user_state.json` — separate
from `cache/`, and gitignored, since it's your actual usage history, not
something a rescan should ever regenerate or a fresh clone should inherit.

**Rebuild all tools**, from Quick Find, re-checks every buildable tool and
only rebuilds what's actually changed (same content-hash fingerprint cache
`build_tools.py` uses) — running it with nothing changed is a fast no-op,
not a full rebuild.

## How a tool gets picked up

Workshop looks at each folder in `apps/` and figures out what it is:

| Type | What it needs | Picked up |
|------|----------------|-----------|
| **Static** | a folder with `index.html` (+ css/js/img) | Live, via Rescan |
| **Flask** | `app.py` with a module-level `app = Flask(__name__)` | Needs a server restart |
| **Node** | `package.json` with a `build` script (React, Vite, whatever compiles) | Live, via Rescan, once built |

Static tools get `<base href="/apps/your-tool/">` injected into their HTML
automatically, so relative `css/js/img` paths just work no matter what URL
loaded them — you don't need to know or hardcode the folder name. Flask tools
are mounted as fully independent apps via werkzeug's
`DispatcherMiddleware`, so they keep their own routes and in-memory state.
Node tools get built by `build_tools.py` and then served exactly like a static
tool once the build succeeds.

`build_tools.py` also handles PHP tools (`composer.json` → `composer install`)
and standalone Python tools (`requirements.txt` / `pyproject.toml` /
`Pipfile`, not Flask) which each get their own isolated `.venv/` so they
don't collide with Workshop's own dependencies.

Each Node tool's card also has its own **⟲** rebuild button, for when you've
just edited its source and don't want to wait on a full `build_tools.py` run —
this is the one place the server itself triggers a build, and it only touches
that single tool. If a build fails, the card shows a red "build failed" badge
with a link to the full log, and the Open button stays disabled until it
builds clean.

### Application state

Every tool has exactly one state, shown as a badge on its card, and the Open
button is only ever live when it's `ready`:

| State | Meaning |
|---|---|
| `ready` | Usable right now |
| `needs build` | Has an install/build step that hasn't run yet — run `build_tools.py` |
| `build failed` | Its last build/install attempt failed — click through to the log |
| `unsupported` | The folder has no entry point Workshop recognizes (no `app.py`, no `package.json` build script, no `index.html`, no `composer.json`) |
| `disabled` | You set `"disabled": true` in its `meta.json` |

A folder Workshop doesn't understand, or a Flask app whose `app.py` throws on
import, used to just print a warning to the terminal and otherwise vanish
from the dashboard with no explanation. Now it still gets a card — flagged
`unsupported` or `failed` with the actual error — because one broken tool
should only ever cost you that one card, not an explanation you have to go
dig for in the terminal.

## Adding a tool of your own

You don't have to — everything in the box already works out of the box. But
if you build something new and want it living here too, **the full
contract — types, `meta.json`, actions, everything below — is written up
in detail in [`docs/app-development-guide.md`](docs/app-development-guide.md),
meant to be handed straight to an AI along with your tool's purpose.**
Short version:

**Static (HTML/CSS/JS):** drop the folder into `apps/`, e.g.
`apps/my-tool/index.html`, using relative paths for its own assets. Click
Rescan bench — it shows up immediately.

**Flask:** put the project in `apps/my-tool/`, make sure its Flask instance
is literally named `app` at module level, keep its own `templates/`/`static/`
inside that same folder, then restart `python3 run.py`. Rescan alone won't
mount a new Flask tool — only a restart does that.

**Node/anything with a build step:** drop the folder in `apps/`, run
`python3 scripts/build_tools.py`, then Rescan.

Optional `meta.json` next to the entry file customizes the card:

```json
{
  "id": "my-awesome-tool",
  "name": "My Awesome Tool",
  "description": "One line, shown on the card.",
  "version": "1.0.0",
  "category": "Utilities",
  "keywords": ["converter", "images"],
  "open": "embed",
  "disabled": false,
  "actions": [
    { "label": "Do the specific thing", "aliases": ["alt phrasing"], "path": "?mode=thing" }
  ]
}
```

Every key is optional. Leave the whole file out and Workshop turns the
folder name into a title (`my-tool` → "My Tool"), shows no description, and
falls back to `"0.0.0"` / `"Uncategorized"` for version/category.

- **`id`** — a stable identifier, independent of the folder name. Defaults
  to a slug of the folder. If two tools' `meta.json` ever declare the same
  `id`, the second one silently falls back to its folder-derived id instead
  of colliding, and it's noted on the dashboard.
- **`category`** / **`keywords`** — power Explore's category filter chips
  and text filter, and Quick Find's matching; otherwise cosmetic.
- **`disabled`** — set `true` to pull a tool off the bench without deleting
  it. Its card stays visible (badged `disabled`) so you remember it exists.
- **`actions`** — lets someone type what they want to *do* ("convert jpg to
  png") into Quick Find and land directly on that mode of your tool, not
  just its homepage. Each entry needs a `label`, optionally `aliases`
  (other phrasings), and a `path` appended after your tool's URL — a
  query string/hash for static/node apps, or a real route for Flask
  apps. Full contract, including working reference implementations, is
  in `docs/app-development-guide.md` §6 — see `apps/Image Converter/`
  (declared `?to=<fmt>` actions) or `apps/calculator/` (the
  `"intents"` + `?expr=` convention, §6a) for real examples already in
  this repo. §6b also covers `produces`/`accepts`, an optional label-only
  hint (no data transfer) that lets Quick Find suggest a follow-up tool.

`"open"` controls how the **Open →** button behaves:

- `"embed"` (default, or just omit the key) — opens inside Workshop's
  own in-page viewer, as a tab alongside any other apps you already
  have open.
- `"tab"` — always opens in a real new browser tab instead. Use this
  for an app that doesn't play well inside an iframe (sets
  `X-Frame-Options`/CSP `frame-ancestors`, does its own frame-busting
  check, or needs a browser API — camera, real fullscreen, etc. — that
  behaves differently or is blocked inside an embedded frame).

## Routing, for reference

| Request | Handled by |
|---|---|
| `/` | Dashboard |
| `/refresh` | Rescans `apps/`, rebuilds the cache, redirects to `/` |
| `/apps/<folder>/...` (Flask) | Intercepted by `DispatcherMiddleware` before Flask routing — runs as its own app |
| `/apps/<folder>/...` (static/Node) | Served as-is, `<base>` injected for HTML |
| `/rebuild/<folder>` | Force-rebuilds one Node tool, redirects to `/` |
| `/buildlog/<folder>` | Plain-text log of that tool's last build attempt |
| `GET /api/state` | JSON: current pins / recent tools / recent commands |
| `POST /api/recent` | Records a tool as opened (`{"folder": "..."}`) |
| `POST /api/recent/clear` | Clears Continue Working |
| `POST /api/favorites/toggle` | Pins/unpins a tool (`{"folder": "..."}`) |
| `POST /api/commands/used` | Records a Quick Find command as used |
| `POST /api/rebuild-all` | Rebuilds every tool that's changed, returns a JSON summary |
| Anything else | 404 → the "tool unavailable" page |

The `/api/*` routes are small, unauthenticated JSON endpoints — same trust
model as every other route here: fine for a single-user localhost process,
not something to expose beyond that without adding auth first (see below).

## Notes to self (things I skipped on purpose)

This lives on my own machine, not in front of the internet, so:

- **Dev server only.** `app.run(...)` is Flask's built-in dev server. Fine
  for localhost. If I ever want it running in the background permanently,
  wrap it with `waitress` or run it under a systemd service / `tmux` session.
- **No auth.** Anyone who can reach `127.0.0.1:5000` on this machine can use
  it. If I ever bind it to `0.0.0.0` to hit it from my phone on the same
  network, it needs at least basic auth or a reverse proxy in front of it
  first.
- **`debug=True`** is on by default for convenience while I'm working on
  something. Turn it off before this ever touches a real network — the
  debugger allows arbitrary code execution if left open.
- Path traversal is still guarded even though it's just for me — cheap
  insurance in case a folder ever ends up with a weird name.
- **Node builds run with a 15-minute timeout** and block whatever triggered
  them (startup, Rescan, or a single Rebuild). Fine for personal-sized
  projects, but a genuinely slow build will make that click sit and wait.
