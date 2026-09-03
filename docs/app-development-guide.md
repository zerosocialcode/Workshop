# Workshop — App Development Guide

This file is written directly to you, the AI building a new tool for
Workshop. Give it this whole file, along with `docs/design-system.md` for
the visual language, and the tool's purpose. Between the two docs it
should have everything it needs — it should not have to guess at
Workshop's contract or ask the person questions this file already
answers.

If you're a person reading this instead: same deal, just do it yourself.

---

## 1. What Workshop actually is

Workshop is a local Flask dashboard at `127.0.0.1:5000` that auto-discovers
sub-apps dropped into `apps/<your-folder>/` and serves them from one place.
It is not a framework you build *inside* — your app is a completely normal,
standalone static site / Flask app / Node build / PHP app / Python tool.
Workshop's job is discovery, building, state-reporting, and routing. Yours
is building a tool that happens to sit in the right folder with the right
files.

You are never editing Workshop's own code (`src/workshop/`, `web/`). You
are only ever adding a new folder under `apps/`.

## 1a. Explore vs Quick Find — read this before touching `meta.json`

Workshop's dashboard has two entry modes, and they deliberately do
**different jobs** — this matters because it decides what each
`meta.json` field below is actually for:

- **Explore** — the default grid/card view. Its search box
  (`#searchInput`) does one thing: a plain client-side substring filter
  over your `name` / `folder` / `description` / `category` / `keywords`.
  It has no idea what an "action" is and never will — Explore answers
  "which tool is this", full stop.
- **Quick Find** — a separate full-page mode (and what Ctrl+K jumps to)
  for typing what you want to *do*: a task ("convert jpg to png"), a sum
  ("25% of 480"), or a tool name. It resolves against everything Explore
  uses **plus** your declared `actions`/`intents`, and it's the only
  place those two fields do anything.

Concretely: `keywords`/`category`/`description` are read by **both**
modes (Explore's filter and Quick Find's resolver each read them for
their own purpose — that's shared metadata, not shared UI). `actions`
and `intents` are read by **Quick Find only** — declaring them changes
nothing about how your tool shows up in Explore. If you're only trying
to make your tool easier to *find in the grid*, you only need
`keywords`. If you want someone to be able to type what they want and
land directly on a specific screen of your tool, you need `actions`
(§6).

## 2. The one hard rule

**Everything your app needs lives inside its own folder.** No reaching
into `../` for shared code, no assuming a global CSS file exists, no
depending on another sub-app's assets. Each folder is fully self-contained
— that's what lets Workshop discover, build, and (eventually) delete tools
independently without anything else breaking.

## 3. Pick a type

Workshop looks at your folder's contents, in this exact order, and
classifies it as the first thing that matches:

| # | If the folder has… | Type | Picked up |
|---|---|---|---|
| 1 | `app.py` with a module-level `app = Flask(__name__)` | **flask** | Needs a server restart |
| 2 | `package.json` with a `"build"` script | **node** | Live via Rescan, once built |
| 3 | `index.html` or `index.htm` | **static** | Live via Rescan |
| 4 | `composer.json` | **php** | Its deps get installed by `build_tools.py`; only actually opens in a browser if it also has an entry point Workshop recognizes (usually paired with `index.html` or an `app.py`) |
| 5 | `requirements.txt` / `pyproject.toml` / `Pipfile` (and none of the above) | **python** | Standalone tool — same caveat as php: needs its own way of exposing a page if you want it opened in a browser |
| — | none of the above | **unsupported** | Shown on the dashboard, badged `unsupported`, never openable |

**When in doubt, build static or Flask.** They're the two fully-supported,
directly-openable types with no caveats. Node is for when you're already
generating a real frontend build (React/Vite/etc.) — don't reach for it
just to write plain HTML/CSS/JS; that's what static is for.

### Static
A plain folder of `index.html` + `css/`/`js/`/`img/` — whatever you'd ship
to any static host. Use **relative paths** for your own assets
(`css/style.css`, not `/css/style.css`) — Workshop injects
`<base href="/apps/your-folder/">` automatically, so relative paths resolve
correctly no matter what URL loaded the page, but absolute paths starting
with `/` will break (they'd resolve against Workshop's own root, not
yours).

### Flask
A normal Flask app. The **only** requirement: `app.py` must define a
module-level object literally named `app`:

```python
from flask import Flask
app = Flask(__name__)

@app.route("/")
def index():
    return "hello from inside Workshop"
```

Workshop mounts this as a fully independent app via werkzeug's
`DispatcherMiddleware` at `/apps/<your-folder>/` — your routes, your
session state, your everything, isolated from Workshop and every other
sub-app. Keep your own `templates/`/`static/` inside your own folder
(Flask's usual convention — nothing Workshop-specific here).

One consequence worth knowing: a new Flask app needs the server
*restarted* to appear (not just Rescanned), because mounting happens once
at process startup. If your `app.py` throws on import, Workshop catches it
and reports your tool as `failed` on the dashboard instead of crashing —
but you obviously still want it to actually import cleanly.

Another consequence worth knowing, if your app is more than one file:
Workshop mounts `app.py` by importing it in-process via
`importlib.util.spec_from_file_location` (see `src/workshop/mounting.py`)
— it does **not** run it as `python app.py`. That distinction matters
because Python normally auto-adds a script's own folder to `sys.path`
when you run it directly, but `importlib` loading a file by path does
**not** do this. So if your Flask app's logic lives across multiple
files in its own folder (`app.py` importing a sibling `helpers.py`, say),
a plain `from helpers import thing` will work fine when you test it with
`python app.py` locally, then fail with `ModuleNotFoundError` the moment
Workshop mounts it — even though the file is right there. The fix is two
lines at the top of `app.py`, before any sibling imports:

```python
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from helpers import thing  # now resolves under either import style
```

This stays entirely inside your own folder, so it doesn't violate §2's
self-containment rule — it just makes your folder's sibling imports work
the same way regardless of *how* something ends up importing `app.py`.

### Node
`package.json` with a `"build"` script. `build_tools.py` runs your build
and Workshop serves whatever comes out (`dist/`, `build/`, `out/` —
whatever your tool produces) exactly like a static app once it succeeds.

### PHP / standalone Python
Supported for dependency installation (`composer install` /
an isolated `.venv/`), but neither gets a generic "open in browser" path
the way static/flask/node do. If you want a PHP or Python tool that opens
in a browser, give it a real web-facing entry point Workshop already
understands — in practice that almost always means: just build it as
Flask instead.

## 4. `meta.json` — full schema

Optional, but write one — every field has a sane fallback, but the
fallbacks are generic and won't help anyone find your tool. Place it next
to your entry file (`apps/your-folder/meta.json`):

```json
{
  "id": "your-tool",
  "name": "Your Tool",
  "description": "One line, shown on the card. Say what it DOES, not how.",
  "version": "1.0.0",
  "category": "Utilities",
  "keywords": ["extra", "search", "terms"],
  "open": "embed",
  "disabled": false,
  "actions": [
    { "label": "Do the specific thing", "aliases": ["alt phrasing"], "path": "?mode=thing" }
  ]
}
```

| Key | Type | Default | Notes |
|---|---|---|---|
| `id` | string | slug of folder name | Stable identifier, independent of the folder name. If two tools declare the same `id`, the second one silently falls back to its folder name and it's flagged on the dashboard — pick something you're confident is unique, or just omit it. |
| `name` | string | Title-cased folder name | Shown as the card title. |
| `description` | string | `""` | One line. Shown on the card; matched by Explore's filter and (as a low-weight fallback) by Quick Find. |
| `version` | string | `"0.0.0"` | Free-form (`"1.2.0"`, `"beta"`, whatever you use). Cosmetic. |
| `category` | string | `"Uncategorized"` | Powers Explore's category filter chips; also matched by both Explore's filter and Quick Find. |
| `keywords` | array of strings | `[]` | Extra terms **both** Explore's filter and Quick Find match on that aren't in the name/description. See §1a. |
| `intents` | array of strings | `[]` | Optional task-style tags for Quick Find's *dynamic* matching only — see §6a. Not shown anywhere, not read by Explore. |
| `produces` / `accepts` | array of strings | `[]` | Optional MIME-style tags for the "Continue with" suggestion — see §6b. Labels only, not a data pipe. Not read by Explore. |
| `open` | `"embed"` \| `"tab"` | `"embed"` | See §5. |
| `disabled` | boolean | `false` | `true` pulls it off the bench without deleting it — still shows as a card, badged `disabled`. |
| `actions` | array | `[]` | See §6. Read by Quick Find only — routes a typed task to a specific mode of your tool. Has zero effect on Explore. |

Everything is optional; a missing/invalid `meta.json` never breaks
discovery — your folder still gets a card, just with generic defaults, and
any specific problem is reported on the card as `meta_error` rather than
hidden.

## 5. `"open": "embed"` vs `"tab"`

Workshop has an in-page viewer that opens tools as tabs inside its own
overlay, so several can be open side-by-side without losing state. That's
`"embed"`, the default — leave it alone unless you have a specific reason
not to.

Use `"tab"` (always opens a real new browser tab) if your app:
- Sets `X-Frame-Options` / a CSP `frame-ancestors` that blocks framing,
- Does its own frame-busting check (`if (window !== window.top) ...`),
- Needs a browser API that behaves differently or is blocked inside an
  iframe — camera/mic, real fullscreen, clipboard write, etc.

If you're not sure, build it as `"embed"` first and switch to `"tab"` only
if you actually hit one of the above.

## 6. Declaring actions — the Quick Find contract

This is the part that lets someone type **what they want to do** — "convert
jpg to png", "resize this", "make a new file" — into Quick Find (Workshop's
task/command entry point — see §1a) and land directly on that specific
mode of your tool, instead of just its homepage, without Workshop knowing
anything in advance about what your tool does. Ctrl+K is just a shortcut
that jumps straight into Quick Find; there is no separate matching engine
to satisfy — declare an action once and it works everywhere Quick Find is
reached. The mechanism has exactly two responsibilities, split cleanly
between Workshop and you:

- **Workshop's job:** index every action every tool declares, match the
  typed query against them (label/alias text — substring, prefix, and a
  word-overlap fallback for looser phrasing — plus the two dynamic
  conventions in §6a), and when one's picked, navigate to
  `/apps/<your-folder>/<path>` — nothing fancier than that.
- **Your job:** declare the actions, and make your own frontend actually
  look at that URL and land on the right screen. Workshop can hand you the
  destination; it can't make your app understand it.

### Declaring an action

In `meta.json`:

```json
"actions": [
  {
    "label": "Convert JPG to PNG",
    "aliases": ["jpg to png", "convert jpg to png", "png from jpg"],
    "path": "?from=jpg&to=png"
  }
]
```

- **`label`** (required) — what shows in Quick Find's results. Written as
  an instruction ("Convert JPG to PNG"), not a noun phrase.
- **`aliases`** (optional) — other phrasings someone might type. The label
  itself is always included automatically, so a bare `{label, path}` with
  no aliases still gets one working search term for free. Add more when
  people might reasonably phrase it differently ("shrink" as well as
  "resize", say).
- **`path`** (required) — appended directly after `/apps/<your-folder>/`.
  For **static/node** apps this should be a query string (`?mode=x`) or a
  hash (`#mode=x`) — you only have one real HTML file, so query/hash is
  how you receive the "which mode" signal. For **flask** apps this can
  instead be a genuine second route (`"path": "convert/jpg-to-png"`)
  handled server-side, since Flask apps have real routing.

### Reading it back, app-side (static/node apps)

On page load, read `location.search` (or `location.hash`) and jump to
that state — this is the entire integration, usually a handful of lines:

```js
const params = new URLSearchParams(location.search);
const from = params.get('from');
const to = params.get('to');
if (from && to) {
  // pre-select the from/to formats, skip straight to that screen
}
```

`apps/Image Converter/index.html`, function `applyRequestedFormat()` near
the bottom of the file, is a small, complete, working reference in this
repo — it declares seven `?to=<format>` actions in its `meta.json` and
reads `?to=` in exactly this shape. Open both files before writing your
own; it's meant to be copied from. (`apps/calculator/src/App.tsx` is the
Flask-free, React/Vite version of the same idea, but via `intents` +
`?expr=` — see §6a — rather than a literal declared action per format.)

### Reading it back, app-side (Flask apps)

If you used a real route as the path, this is just... a Flask route. Handle
it exactly like any other:

```python
@app.route("/convert/jpg-to-png")
def jpg_to_png():
    return render_template("converter.html", from_fmt="jpg", to_fmt="png")
```

### What NOT to do

- Don't declare an action you haven't actually wired up app-side. A
  Quick Find result that lands on your homepage instead of the promised
  mode is worse than not declaring it at all — it's a broken promise, not
  a missing feature.
- Don't invent a `path` scheme for a static app that assumes server-side
  routing (a real sub-path like `/convert/jpg-to-png` with no query
  string) — Workshop will 404 trying to serve a file that doesn't exist at
  that path for anything that isn't Flask. Static/node apps get exactly
  one real URL; query string or hash is how you branch inside it.
- Don't over-declare. A handful of genuinely distinct things your tool can
  jump to is useful; declaring an action for every button in your UI just
  turns Quick Find into noise. If it's not something someone would
  plausibly type instead of clicking around to find it, it probably
  doesn't need to be an action.

### 6a. Two dynamic conventions Quick Find already understands

Beyond literal alias matching, Quick Find recognizes two lightweight,
opt-in conventions — recognized by *pattern*, not by hardcoding your app's
name, so any app that follows them gets the behavior for free:

- **`?to=<value>` actions resolve from any "A to B" phrasing**, not just
  the literal aliases you wrote. If your action's `path` contains
  `to=png`, typing "gif to png" or "avif to png" resolves to it at high
  confidence even though neither appears in your `aliases` — you only
  need one `?to=<format>`-style action per target format, not one per
  source/target pair.
- **Arithmetic queries** ("25% of 480", "12 * 8") resolve to whichever app
  declares `"intents": ["calculate_expression"]` (or `"do_math"`), landing
  on it with `?expr=<encoded expression>` already filled in — see
  `apps/calculator/src/App.tsx` for the ~4-line integration (it reads
  `?expr=` and reuses the same "restore from history" path the UI already
  had). Only one app should declare this intent; if none does, arithmetic
  queries just fall through to normal keyword matching.

Neither convention requires an `intents` entry to work for the `?to=`
case — it only reads existing `actions[].path`. `intents` is otherwise
free-form: use it for any task-style tag you want future matching (Quick
Find or otherwise) to key off, beyond what `keywords` already covers.

### 6b. `produces` / `accepts` — the "next tool" hint (not a data pipe)

`docs/platform-evolution.md`'s Phase 7 describes a longer-term workflow
canvas (chaining tools into a pipeline) but is explicit that it's *"NOT an
immediate priority"* and shouldn't be built until three things are true
first — the last being *"input/output compatibility is proven useful,"*
with *"the first version should be deliberately simple."* `produces` and
`accepts` are that first version, and the whole extent of what's built
today:

```json
{
  "produces": ["text/javascript"],
  "accepts": ["text/javascript"]
}
```

Free-form MIME-style strings — no enforced vocabulary, just match by
exact string. If Quick Find's idle view sees the most recently used tool
declares `produces` values that overlap another ready tool's `accepts`,
it shows that tool under a "Continue with" group. That's genuinely all
it does: **no file, payload, or state is ever passed between tools.** The
person still exports/copies their own output and brings it to the next
tool themselves — this only tells them such a next tool exists. Don't
build anything in your app that assumes Workshop will hand it another
tool's output; nothing does that yet, and per the platform doc, it
shouldn't until this labeling step has proven itself with more real
tools using it. See `apps/codeeditor/meta.json` and
`apps/javascript-obfuscator/meta.json` for the one real pair currently
declared (both read/write JS text, so they're genuinely a next-step-of-
each-other, unlike most of Workshop's other tools).

## 7. Application state — what shows on your card

Every tool has exactly one state, and yours will be one of:

| State | When |
|---|---|
| `ready` | Normal — your entry point exists and (if buildable) last built clean |
| `needs_build` | Buildable type, no successful build yet — the person needs to run `build_tools.py` |
| `failed` | Your last build/install attempt failed, or (Flask) your `app.py` threw on import |
| `unsupported` | Workshop couldn't classify your folder under §3 at all |
| `disabled` | Someone set `"disabled": true` in your `meta.json` |

Only `ready` tools are openable. There's nothing to configure here — just
know that a broken build or a bad import doesn't crash Workshop or hide
your tool, it shows up honestly labeled instead.

## 8. Visual style

Not required — Workshop will happily serve an app in any style. But if you
want it to look like it belongs on the bench rather than looking like a
generic embedded webpage, give `docs/design-system.md` to whoever/whatever
is building the UI. It's written the same way this file is: handable
directly to an AI, with copy-pasteable CSS tokens and a one-paragraph
prompt at the bottom.

## 9. Before you call it done

- [ ] Folder is self-contained (§2) — no reaching outside `apps/your-folder/`
- [ ] Correct type detected — check with `python3 scripts/build_tools.py --list`
- [ ] `meta.json` has at least `name`, `description`, `category`
- [ ] Static/node apps use relative asset paths, not absolute (`/...`)
- [ ] Flask apps expose a module-level `app` and import cleanly
- [ ] Multi-file Flask apps add their own folder to `sys.path` at the top
      of `app.py` before importing sibling files (§3) — don't just trust
      a local `python app.py` test, since that masks this specific bug
- [ ] Every declared `action` is actually wired up app-side (§6) — test
      each one by opening `/apps/your-folder/<path>` directly in a browser
- [ ] Tested **Explore**: your tool's name/keywords actually surface in
      the grid filter (§1a) — this only reads `name`/`keywords`/
      `description`/`category`, so a typo there is invisible to Quick
      Find's separate matching and vice versa; test both, not just one
- [ ] Tested **Quick Find**: typed a phrase matching each declared action
      (not just the literal label — try an alias, and try it with a
      filler word like "convert" or "open" in front) and confirmed it
      resolves to the right result, not just the tool's homepage
- [ ] Ran `python3 scripts/build_tools.py`, then **Rescan bench**, and
      confirmed the card shows `ready` — not `failed`, not `unsupported`
- [ ] Opened it from the dashboard and confirmed it actually works inside
      the embedded viewer (or set `"open": "tab"` if it can't)
