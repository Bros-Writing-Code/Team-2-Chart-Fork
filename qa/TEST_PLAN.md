# Zing Plot Plus Plus: QA Test Plan

Owner: Gage (QA). Last run: 2026-10-11 against `main` @ `d067559` (library `zing-plot-plus-plus@1.0.8`).

## Goal

Try to break the tool before users do, and turn each break into an automated
check so it stays fixed. Each part of the tool has its own test approach:

| Layer | What it covers | How it's tested |
|---|---|---|
| Library (`zing-plot-plus-plus/src`) | Chart object → SVG: scaling, ticks, labels, scatter points, line path, tooltip formatting | Unit tests: `zing-plot-plus-plus/tests/plots.test.js` |
| Site input (`zing-plot-web/script.js`) | Manual entry, CSV/JSON parsing, validation | Unit tests: `zing-plot-web/tests/parsing.test.mjs` |
| Bad-input corpus (`qa/fixtures/`) | 46 hostile and edge-case files, each with an expected outcome in `manifest.json` | Data-driven tests: `zing-plot-web/tests/fixtures.test.mjs` |
| Rendering in a real browser | Things only visible on screen: blank charts, NaN, injected HTML, overflow | Manual / scripted browser runs (results below) |

## Running the tests

Requires Node 20 or later. There's nothing to install, because both suites use Node's built-in test runner.

```bash
cd zing-plot-plus-plus && npm test
```

```bash
cd zing-plot-web && node --test
```

CI (`.github/workflows/test.yml`) runs both on every push and pull request. The
publish workflow also runs the library tests before `npm publish`.

### Known bugs are TODO tests

A test marked `{ todo: 'BUG-xx ...' }` describes behaviour we **want** but don't have yet.
It runs and shows up as `# TODO` in the output, but doesn't turn CI red. When you
fix a bug, the TODO test starts passing. Delete its `todo` option so it becomes a
normal test that guards the fix. For fixtures, delete `parseBug` from the
manifest entry.

### Adding a bad input

Put the file in `qa/fixtures/` and add an entry to `qa/fixtures/manifest.json`
(`expect: "ok"` plus the expected values, or `expect: "error"` plus a fragment of the message).
A test fails if a file has no manifest entry.

## Results summary

| Suite | Pass | TODO (known bug) | Fail |
|---|---|---|---|
| Library | 14 | 3 | 0 |
| Site + fixtures | 52 | 9 | 0 |

The parser handled most of the hostile input correctly: empty files, missing
columns, words in number columns, blank cells, unclosed quotes, BOM and CRLF line endings,
Infinity/NaN, and over 10,000 rows. The serious problems turned up in **rendering**:
input that parses fine still draws a broken or blank chart.

## Bugs found

14 open bugs. BUG-01 (line chart not sorted by X) was fixed by David in #3. Owners follow the meeting-notes roles; reassign in GitHub issues as needed.
Fixture files are in `qa/fixtures/`.

### High: fix first

| ID | Problem | Reproduce | Fix | Owner |
|---|---|---|---|---|
| BUG-02 | Title/labels are inserted as raw HTML: a CSV header can run JavaScript, and the data points vanish | `html-in-header.csv` | Escape text in the library | Charlie |

### Medium

| ID | Problem | Reproduce | Fix | Owner |
|---|---|---|---|---|
| BUG-04 | A single point at (0, 0) gives NaN coordinates and a blank chart | `single-point-origin.csv` | Treat a zero range as 1 | Charlie |
| BUG-08 | Imported titles/labels have no length limit; 100k characters overflow the chart | `title-100k-chars.json` | Apply the form's limits | Nathan |
| BUG-09 | A numeric JSON title breaks Save | `numeric-title.json`, then Save | Convert the title to a string | Nathan |
| BUG-10 | A trailing comma adds a phantom 0 (`1, 2, 3,`) | Manual entry | Ignore empty entries | Nathan |
| BUG-14 | Publish CI fails on every push without a version bump | Actions history | Skip if the version is already on npm | Brian |
| BUG-15 | `package.json` `main` points to a missing file | `import 'zing-plot-plus-plus'` | Point to `src/detailedPlots.js` | Brian |

### Low

| ID | Problem | Reproduce | Fix | Owner |
|---|---|---|---|---|
| BUG-03 | Missing labels print "undefined" | Library call without labels | Default to empty | Charlie |
| BUG-06 | `null` in JSON shows a raw JavaScript error | `null-point.json` | Validate each point | Nathan |
| BUG-07 | Hex/binary accepted as numbers (`0x10` → 16) | `hex-binary-values.csv` | Accept decimal only | Nathan |
| BUG-12 | Values near the float max overflow the axis to Infinity | `huge-values.csv` | Reject values over 1e300 | Nathan |
| BUG-13 | A leading comma gives a misleading error | Manual entry `,1,2` | Same fix as BUG-10 | Nathan |
| BUG-16 | `// TODO` in the SVG `<style>` silently drops a CSS rule | `plotBase.js` | Use `/* */` | Charlie |
| BUG-17 | Changing a label attribute after render throws | `setAttribute('x-axis-label', …)` | Fix the selectors | Brian |

## Manual / exploratory checklist

| Check | Status |
|---|---|
| Every render-relevant fixture loaded via the real `importFile()` in Chrome, both chart types; SVG inspected for NaN, visible points, ticks, injected elements | Done (findings above) |
| Save PNG with normal data | Not yet run |
| Save PNG after numeric-title import | Done (BUG-09) |
| Tooltip hover follows point, shows correct values, hides on leave | Not yet run |
| Window resize redraws the chart | Not yet run |
| Phone-width layout (the `.app` uses `width: 130%` + `scale(0.6)`) | Not yet run, worth checking |
| Drag-and-drop upload | Not yet run |
| Keyboard-only use (tabs, form, file button) | Not yet run |
| Chart type switch keeps data | Done (works) |
| 10,000-point dataset renders on both chart types | Done (works) |

## How the tests reach the code without changing it

- **Library:** the components extend `HTMLElement`, which Node doesn't have.
  `tests/helpers/dom-stub.js` provides a stand-in `HTMLElement` and a
  `customElements.define` that records each class. Tests call `generateGraph()`
  on `Object.create(Class.prototype)` and check the SVG string.
- **Site:** `script.js` is a classic browser script that binds DOM listeners when it
  loads. `tests/helpers/load-script.mjs` runs the real file in a `node:vm` sandbox
  with a no-op `window`/`document`, then calls its functions directly. If
  `script.js` is ever split into modules, swap this for normal imports.
