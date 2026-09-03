# Workshop — Design System

**Concept:** a drafting table by day, a cyanotype blueprint by night. Every
surface is a "spec sheet" — flat, gridded, annotated in mono type, with
crop marks and dashed rules like a real engineering drawing. No icons, no
photography, no gradients-as-decoration. The only "logo" is the typography.

Give this whole file to any AI ("Claude, ChatGPT, whatever") along with
your new app's purpose, and ask it to build in this style. It's written to
be copy-pasteable as CSS custom properties.

---

## 1. Concept & rules

- **No app icons, ever.** Identity comes from the name (in the display
  font) and a type badge, never from a glyph or logo mark.
- **Flat, not soft.** No neumorphism, no big drop shadows, no blurred glass.
  Borders are 1–2px solid lines. The only shadow used is a low, tight one
  on hover to suggest lift — nothing ambient.
- **Everything reads like a technical document.** Mono type for labels,
  paths, badges, and anything "systemic." A humanist sans for body prose.
  A tall condensed display face for headings only.
- **Two literal lighting conditions**, not just a color swap: *day* =
  drafting paper, warm and matte. *night* = blueprint cyanotype, cool navy
  with pale cyan ink. The toggle is a physical light switch, not a sun/moon
  icon.
- **Motion is diegetic.** Animations should feel like something in the
  workshop actually happening — a light switching on, a pen drawing a
  line, a counter ticking up — not generic fade/slide-ins bolted on for
  their own sake.

---

## 2. Color tokens

Two themes, swapped via `html[data-theme="night"]`. Default (no attribute,
or `data-theme="day"`) is the paper/day theme.

```css
:root {
  /* day — drafting paper */
  --bg: #ece5d2;         /* page background */
  --bg-deep: #e2dac2;    /* recessed / code chip background */
  --paper: #f8f4e8;      /* card / panel surface, slightly lighter than bg */
  --ink: #23261f;        /* primary text, near-black warm */
  --ink-soft: #63604e;   /* secondary text */
  --ink-faint: #9b9781;  /* tertiary text, captions, crop marks */
  --line: #c7bb98;       /* borders */
  --line-soft: #d9cfae;  /* faint grid lines */
  --accent: #b8441f;     /* rust/stamp orange — CTAs, focus, highlights */
  --accent-ink: #fbf1e6; /* text/icon color ON TOP of --accent */
  --ok: #3f6b45;         /* success / "flask" type */
  --warn: #8a5a00;       /* warning / "static" type */
  --fail: #a3311c;       /* error / failed build */
  color-scheme: light;
}

html[data-theme="night"] {
  /* night — blueprint cyanotype */
  --bg: #0d1d31;
  --bg-deep: #0a1626;
  --paper: #123058;
  --ink: #d9e8f4;
  --ink-soft: #8fadc7;
  --ink-faint: #4d6f8f;
  --line: #24476b;
  --line-soft: #1a3452;
  --accent: #ff7a45;      /* brighter/warmer so it still pops on navy */
  --accent-ink: #241005;
  --ok: #7fe3b4;
  --warn: #f2c14e;
  --fail: #ff8a70;
  color-scheme: dark;
}
```

Rules for using these:
- `--accent` is a **stamp color** — used sparingly, for the one primary
  action per screen (open, confirm, rescan) and focus rings. Never as a
  large background fill except on that one CTA.
- `--ok` / `--warn` / `--fail` are semantic only (build status, badges).
  Don't reuse them decoratively.
- Never hardcode hex in a component — always reference the variable, so
  a component is theme-correct for free.

---

## 3. Typography

Three families, three strict jobs. Don't blend their roles.

```html
<link href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@600;700;800;900&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```

| Role | Font | Where |
|---|---|---|
| **Display** | `Big Shoulders Display`, 700–900 weight, uppercase, tight line-height (~0.85–1.05) | Page titles, card titles — headings only, nothing else |
| **Body** | `Inter`, 400–600 | Descriptions, paragraphs, prose |
| **Mono** | `JetBrains Mono`, 400–700 | Labels, eyebrows, badges, paths, buttons, form fields, anything system-generated |

Guidelines:
- Display headings are always `text-transform: uppercase; letter-spacing: 0.01em;`.
- Eyebrows/labels are always mono, small (0.6–0.7rem), uppercase, wide
  letter-spacing (0.14–0.18em), colored `--ink-faint`.
- Buttons and badges are always mono uppercase, never the body font.
- Never use a serif anywhere. Never use more than these three families.

---

## 4. Layout & structure

- **Background:** a faint graph-paper grid on every full page —
  `repeating-linear-gradient` at 1px lines, 34px spacing, color
  `--line-soft`, layered under the flat `--bg` color. Optionally drifts
  slowly (see §6).
- **Registration crop marks:** small fixed `+`-shaped crosses in all four
  page corners (`--ink-faint`, ~22px, low opacity). Purely atmospheric —
  reinforces the "printed sheet" idea.
- **Border radius:** small and consistent — `3px`–`4px` everywhere
  (buttons, inputs, cards, modals). Never fully rounded/pill-shaped except
  legacy elements you're intentionally deviating from.
- **Borders over shadows.** Cards, inputs, and buttons are usually a solid
  1px `--line` (or `--ink` for emphasis) border on a `--paper` surface,
  not a shadow-only surface.
- **Corner ticks on cards:** an L-shaped tick (2px border, ~9px) in the
  top-left and bottom-right corners of any "spec sheet" card
  (`::before`/`::after`), in `--ink-faint`, brightening to `--accent` and
  growing slightly on hover. This is the signature card treatment — reuse
  it on every card-like surface across sub-apps for visual continuity.
- **Titles get a title-block header:** an eyebrow line (mono, small,
  "Sheet 01 — whatever this screen is"), then a big display heading, then
  a mono subtitle, sitting above a 2px `--ink` bottom border.

---

## 5. Components

### Buttons
- **Primary action:** solid `--accent` background, `--accent-ink` text,
  1px `--accent` border, mono uppercase, small (0.72–0.78rem),
  letter-spacing 0.06em, radius 3px, padding ~11px 20px.
- **Secondary/dark action** (e.g. "Open"): solid `--ink` background,
  `--paper` text — same shape rules.
- **Tertiary/ghost:** transparent background, `--line` border,
  `--ink-soft` text; on hover border/text go to `--ink`.
- Hover = `filter: brightness(1.08)` or a subtle glow ring
  (`box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 16%, transparent)`),
  never scale-up.

### Badges
Small mono pill-ish tag (radius 3px, not fully round), transparent
background, 1px border in a semantic color (`--ok`/`--warn`/`--fail`/
neutral `--line`), text same color as the border. Uppercase, letter-spacing
~0.09em, font-size ~0.6rem.

### Cards
`--paper` background, 1px `--line` border, radius 4px, corner ticks (see
§4), padding ~18–20px. On hover: border goes `--accent`, lift
`translateY(-3px)`, add a tight low shadow
(`0 10px 26px -14px color-mix(in srgb, var(--ink) 55%, transparent)`).

### Inputs
`--paper` background, 1px `--ink` border (not `--line` — inputs get the
stronger border), mono font, radius 3px. Focus = accent glow ring, same
recipe as button hover glow. Always precede with a mono field label
(§3 eyebrow style).

### Modals
Overlay: `color-mix(in srgb, var(--ink) 35%, transparent)` scrim, no blur.
Modal card: `--paper`, 1px `--ink` border, radius 4px, no big radius/no
neumorphism. Enter with a spring-ish scale (`0.94 → 1`, cubic-bezier
`.3,1.4,.4,1`) plus fade.

### The theme toggle (signature element)
A literal wall light-switch: a 76×44px plate (`--paper` fill, 2px `--ink`
border, radius 6px, two small "mounting screw" dots via `box-shadow`
tricks on `::before`), with a rocker (`--ink` block, `--accent` dot
centered) that slides from left (day) to right (night) with a springy
`cubic-bezier(.5,1.8,.5,1)` transition. Labelled above with a mono
"LIGHTS" eyebrow and below with the current state ("Day"/"Night"). If you
build this per-app, keep the same markup/ids so behavior is copy-pasteable
(see §7).

---

## 6. Motion principles

Every animation should feel like a real, physical thing happening in a
workshop — not a generic UI flourish. Always respect
`prefers-reduced-motion: reduce` (turn everything off, no exceptions).

- **Page load:** header and search/controls fade+rise in
  (`translateY(16px)→0`, ~0.6s, `cubic-bezier(.2,.8,.2,1)`). Cards do the
  same but staggered ~70ms apart (`animation-delay: calc(var(--i) * 70ms)`
  using an inline `--i` index per card). A heading's underline "draws"
  itself left-to-right (`scaleX(0)→1`) shortly after load, like a pen
  finishing a line.
- **Ambient/idle:** the background grid drifts very slowly (position
  animates over ~70s, linear, infinite) — barely perceptible, just enough
  to feel alive. A small status dot near an eyebrow label pulses gently
  (opacity/scale, ~2.2s ease-in-out infinite) to suggest a live connection.
- **Theme toggle:** clicking the switch triggers a radial "light flood" —
  a fixed full-screen overlay with `radial-gradient` centered on the
  switch's screen position, animating opacity `0 → 0.85 → 0`
  (~0.7s), with the actual theme swapping at roughly the midpoint. It
  should read as the room's lighting changing, not a CSS variable snap.
- **Hover/interaction:** cards lift + corner ticks grow and recolor to
  accent; buttons brighten or get a soft glow ring, never scale; a
  refresh/rescan icon spins on hover, and (nicer touch) actually spins for
  a beat via JS before a real navigation fires, so the click reads as
  doing work; destructive/failed states (e.g. a "build failed" badge)
  pulse gently in their semantic color instead of sitting static.
- **Never:** bouncing, elastic overshoot on more than the toggle, confetti,
  parallax-on-scroll, or anything that doesn't map to something
  physically happening.

---

## 7. Reusable base (drop into any new sub-app)

This is the minimum any Workshop sub-app needs to look native inside the
dashboard. Paste the token block from §2, the font `<link>` from §3, and
this reset:

```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  min-height: 100vh;
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--ink);
  background:
    repeating-linear-gradient(0deg, var(--line-soft) 0, var(--line-soft) 1px, transparent 1px, transparent 34px),
    repeating-linear-gradient(90deg, var(--line-soft) 0, var(--line-soft) 1px, transparent 1px, transparent 34px),
    var(--bg);
  background-attachment: fixed;
  transition: background-color 0.4s ease, color 0.4s ease;
}
```

If the sub-app should also carry its own light switch (optional — the
parent dashboard already has one), reuse the exact `#themeToggle` /
`.rocker` markup and CSS from the dashboard so behavior matches pixel for
pixel, and read/write the same `localStorage` key: `workshop-theme`
(`"day"` or `"night"`) so the whole workshop's lighting stays in sync
across tabs.

---

## 8. Prompt you can hand to any AI

> Build this in the "Workshop" design system: a drafting-table/blueprint
> theme with two literal lighting modes (day = warm paper, night = navy
> cyanotype blueprint), flat 1px-bordered surfaces with small L-shaped
> corner ticks on cards, no icons anywhere, three fonts only (Big Shoulders
> Display for headings, Inter for body, JetBrains Mono for labels/badges/
> buttons), rust-orange (#b8441f day / #ff7a45 night) as the single accent
> used sparingly, 3–4px border radius everywhere, and motion that reads as
> physical (staggered card rise-in, a drawn underline, a slow-drifting
> background grid, a radial "light flood" on theme switch) rather than
> generic UI animation. Full token values and component rules are in the
> attached style guide — follow it exactly rather than inventing new
> colors or fonts.

