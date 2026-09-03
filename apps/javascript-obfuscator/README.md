# JavaScript Obfuscator — Workshop Spec-Sheet Edition

A local, browser-based JavaScript obfuscation studio built on the [`javascript-obfuscator`](https://www.npmjs.com/package/javascript-obfuscator) engine. It gives you a live editor, a granular AST transform control panel, real transformation metrics, a sandboxed side-by-side execution preview, and a static "resistance" self-check report — all in a single-page React app with no backend.

Everything runs client-side in your browser. No source code you paste in is ever sent to a server.

---

## 1. Requirements

- Node.js (v18+ recommended)
- npm (bundled with Node) — the project also has a `bun.lock`, so Bun works too if you prefer it

---

## 2. Installation & Running

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

The app runs at **http://localhost:3000** by default.

Other scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server on port 3000 |
| `npm run build` | Produces a production build in `dist/` |
| `npm run preview` | Serves the production build locally to sanity-check it |
| `npm run lint` | Type-checks the project with `tsc --noEmit` (no separate linter is configured) |
| `npm test` | Runs the Vitest suite covering the obfuscation engine and the resistance-audit heuristics |
| `npm run clean` | Removes the `dist/` build output |

There is no API key or `.env` setup required to run the obfuscator itself — the `.env.example` in the repo is a leftover from the original AI Studio scaffold and is not used by any code path.

---

## 3. The Basic Workflow

1. **Paste or write source code** in the left-hand editor pane (or load one of the four built-in sample scripts, or drag-and-drop a `.js` file onto the editor).
2. **Pick a preset** (or hand-tune individual passes) in the configuration panel below the editor.
3. The app **auto-recompiles ~150ms after you stop typing** — there's no explicit "Run" step required, though a manual re-run is also available.
4. Read the **output pane** on the right for the obfuscated code plus size/entropy/coverage metrics.
5. Optionally open **Audit Resistance** to run the sandboxed side-by-side execution check and the static resistance self-check report.
6. **Download** the obfuscated file once you're satisfied.

---

## 4. The Editor Pane (left side)

- **Paste code directly**, type from scratch, or **drag-and-drop a `.js` file** onto the pane.
- **Sample script menu** — four realistic sample scripts are bundled for testing presets quickly:
  - `AUTH_TOKEN_VERIFIER.JS` (cryptography/security)
  - `KEY_DERIVATION_ENGINE.JS` (algorithms/math)
  - `SECURE_GATEWAY_CLIENT.JS` (networking/data)
  - `LICENSE_KEY_VALIDATOR.JS` (licensing/entitlements)
- **Live stats bar**: line count, character count, size in KB.
- **Seed control**: shows the current numeric obfuscation seed and a **🎲 REROLL** button that generates a fresh random seed. Presets ship with a fixed seed each, so re-running the same preset on the same input normally produces byte-identical output — reroll if you want a distinct variant of the same configuration.
- **Manual re-obfuscate button**, in case you don't want to wait for the debounce.

---

## 5. Choosing a Preset

Four presets are available from the configuration panel. Each one is a full set of pre-tuned options — selecting one overwrites your current custom settings.

| Preset | Intent | Notable settings |
|---|---|---|
| **Draft** | Fast minification only, for testing logic changes | No control-flow flattening, no string array, mangled short identifiers (`a`, `b`, `c`) |
| **Balanced** | Reasonable protection without heavy size bloat | Control-flow flattening (0.45), hex identifiers, Base64 string array, string splitting |
| **Industrial** | Strong default for production shipping | Control-flow flattening (0.70), dead code injection, **RC4** string encryption, self-defending mode, Unicode escaping |
| **Max Armor** | Maximum resistance, largest output size | Everything in Industrial plus higher thresholds, global renaming, **dual RC4 + Base64** string cipher, 100% string-array threshold |

You can start from any preset and then hand-tune individual options afterward — this doesn't lock you into the preset's exact values.

---

## 6. The Configuration Panel (manual tuning)

The panel is organized into six "layers," each toggle mapping directly onto a `javascript-obfuscator` option:

### Layer 01 — Identifier & Scope Mangling
- **Variable generator**: `hexadecimal` (`_0x4a1f`), `mangled` (`a`, `b`, `c`), or `dictionary` (`O0`, `OO`, `O0O`)
- **Rename Global Scopes** — also renames top-level/global identifiers, not just local ones
- **Transform Object Key Properties** — obfuscates object property names too

### Layer 02 — String Cipher & Rotation Matrix
- **Enable string array** — extracts string literals into a shared array
- **Encoding**: none / Base64 / RC4 / dual (RC4 + Base64 layered)
- **Rotate**, **Shuffle**, **Index chaining**, **Split strings** — additional scrambling passes on top of the base string array

### Layer 03 — Control Flow Flattening (CFF)
- Converts linear code into a `while` + `switch` state-machine dispatcher
- **Threshold** (0.0–1.0) controls what fraction of eligible blocks get flattened

### Layer 04 — Dead Code & Opaque Predicates
- Injects non-functional filler code and always-true/false predicate branches to confuse static analysis
- **Threshold** (0.0–1.0) controls injection density

### Layer 05 — Constant Folding & Bitwise
- **Numbers to Bitwise Polynomials** — rewrites numeric literals as arithmetic/bitwise expressions
- **Unicode Character Escaping**
- **Single-line Production Minification** (the `compact` option)

### Layer 06 — Self-Defending & Anti-Tamper
- **Anti-Beautification / Format Tamper Trap** (`selfDefending`) — breaks execution if the code is reformatted/beautified
- **Anti-Debugging Lockout** (`debugProtection`) — injects a recurring `debugger;` trap
  - When enabled, an **interval field** appears (0–10,000ms, default 2000ms) controlling how often the trap fires. Keep this off if you plan to actually debug the output in DevTools — it will freeze the tab.
- **Disable Console Output Calls** — strips `console.*` calls from the compiled output

### Reserved Identifier Protection List
A dedicated panel below the six layers lets you protect specific names from being renamed — critical if your code has external API surface (exports, DOM globals, etc.) that must keep its original name to keep working after obfuscation.

- **Quick-add preset buttons** for common groups: Browser DOM/Global, Node.js/CommonJS, Modern Web APIs, React/Component Exports
- Add custom names manually
- **Clear all** button to reset the list
- All four presets ship with `window`, `document`, `module`, `exports`, `require` reserved by default

---

## 7. Reading the Output Pane

- **Toggle line breaks** for human-readable inspection vs. the raw compacted output the obfuscator actually produces
- **Metrics displayed**:
  - Original vs. obfuscated size (bytes) and the percentage size increase
  - Original vs. obfuscated line count
  - Shannon entropy (bits/char) for both original and obfuscated code — higher entropy generally signals more randomized/encrypted content
  - **Coverage Score** (0–10) and a text rating (BASIC MINIFICATION → MODERATE TRANSFORM → BALANCED COVERAGE → HIGH COVERAGE), computed from which passes are enabled and at what thresholds — this is a configuration-strength score, not a measured resistance score
  - SHA-256 checksum of the obfuscated output (computed via the real Web Crypto API)
- **Parser/Transform errors** are surfaced directly in this pane if your source code fails to parse or a transform throws
- **Download button** saves the obfuscated file as `protected_script_<checksum>.js`

---

## 8. AST Pipeline Viewer

Below the editor/output panes, a 5-stage viewer shows a simplified illustration of the transform pipeline the engine conceptually runs through (parsing → identifier mangling → string array extraction → control-flow flattening → final compaction), with a short code snippet per stage. This is an educational visualization of the pipeline shape, not a live step-by-step trace of your specific input.

---

## 9. Audit Resistance (Preview + Self-Check Modal)

Click **[AUDIT RESISTANCE]** (banner button) or the preview icon in the output pane to open the modal. It runs two independent checks:

### A. Functional Equivalence Preview
Both your **original** and **obfuscated** code are executed in **fully isolated sandboxed iframes** (`sandbox="allow-scripts"`, explicitly *without* `allow-same-origin` — so the sandboxed code cannot touch your page's DOM, cookies, storage, or make same-origin network calls). Console output and return values from both runs are compared:

| Result | Meaning |
|---|---|
| `100% FUNCTIONAL EQUIVALENCE VERIFIED` | Original and obfuscated code produced identical logs and return value |
| `MISMATCH // RETURN VALUE OR LOG DIVERGENCE` | Obfuscation changed observable behavior — investigate before shipping |
| `TIMEOUT` | Execution exceeded the safety time limit (often caused by debug-protection traps or an infinite loop) |
| `EXECUTION FAILED` | One of the two runs threw an error |

### B. Static Inspection Heuristic ("Resistance Report")
**Important — read this section before trusting the grade.** This report performs **static pattern-matching (regex) against the compiled output** to verify that the transforms you enabled are actually physically present in the code — e.g., detecting a `while(true){switch(...)}` state-machine shape for control-flow flattening, or checking whether original string literals still appear in plaintext. It does **not** run a real deobfuscator, AST unpacker, or any external tool (like Restringer) — the "restringer_sim" and similar checks are simulated approximations of what such a tool would likely find, based on known output signatures of this specific obfuscator version.

Treat the `TIER-A`/`B`/`C`/`D` grade as a **"did my chosen settings actually produce the expected structure"** sanity check, not as a certified resistance rating against real-world reverse engineers or automated deobfuscation pipelines.

The report also flags **plaintext string leaks** (e.g., secrets left un-encrypted because string protection was off or a value fell outside the string-array threshold) — this is one of the more actionable checks, since it directly points at data you may have assumed was hidden but wasn't.

---

## 10. Security Reality Check — please read

A banner in the app states this directly, and it's worth repeating here:

> Obfuscation raises the reverse-engineering barrier by increasing AST entropy & complexity. It does **not** encrypt code at rest and **cannot** make client-side API secrets safe against inspection.

Concretely:
- Anything obfuscated here still runs as plain JavaScript in the end user's browser or Node process — a sufficiently motivated person can always set a breakpoint, dump memory, or run the code and observe its behavior.
- **Never rely on obfuscation as your only protection for secrets** (API keys, private tokens, license logic that must not be bypassable). Secrets belong server-side.
- Obfuscation is best used to raise the cost of casual copying/tampering and to slow down automated scraping/analysis — not as a substitute for real access control.

---

## 11. Testing

The project ships a Vitest suite (`src/lib/__tests__/heuristicCheck.test.ts`) that exercises the obfuscation engine and the resistance-audit heuristics directly — useful if you modify `obfuscationEngine.ts` or upgrade the `javascript-obfuscator` dependency, since the audit's regex checks are tied to that library's specific output format and can silently break on a version bump.

```bash
npm test
```

---

## 12. Project Structure

```
src/
  App.tsx                        # Top-level layout, state, debounced compile loop
  types.ts                       # All shared TypeScript interfaces
  lib/
    obfuscationEngine.ts         # Wraps javascript-obfuscator; computes metrics + resistance audit
    presets.ts                   # Draft/Balanced/Industrial/Max Armor configs + sample scripts
    sandboxRunner.ts             # Isolated iframe execution harness for the preview modal
    __tests__/
      heuristicCheck.test.ts     # Vitest suite for the engine + audit heuristics
  components/
    EditorPane.tsx                # Source input, file drop, sample menu, seed control
    ConfigPanel.tsx                # The 6-layer transform control panel + reserved names
    OutputPane.tsx                # Obfuscated output, metrics, download
    AstPipelineViewer.tsx          # 5-stage pipeline illustration
    PreviewRunnerModal.tsx         # Sandbox execution + resistance report modal
    TitleBlock.tsx / ThemeSwitch.tsx / RegistrationMarks.tsx   # Visual chrome
```

---

## 13. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Output pane shows a parser error | Your source has a syntax error, or uses very new syntax the obfuscator's parser doesn't support yet |
| Preview modal reports `TIMEOUT` | Debug protection is enabled and blocking execution, or your code has an actual infinite loop — try disabling debug protection first |
| Preview modal reports `MISMATCH` | Check whether your code relies on `Function.prototype.toString()`, exact stack traces, or timing — these can behave differently after transformation |
| DevTools freezes while inspecting obfuscated output | Anti-Debugging Lockout (`debugProtection`) is on — this is intentional; turn it off in the config panel while developing |
| Same preset + same input always gives identical output | Expected — presets use a fixed seed. Use the 🎲 REROLL button next to the seed field for a fresh variant |
