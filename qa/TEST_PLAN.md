# Zing Plot Plus Plus: QA Test Plan

Owner: Gage (QA). Last run: 2026-10-11 against `main` @ `d067559` (library `zing-plot-plus-plus@1.0.8`).

> **Status note (2026-10-22, docs check against `main` @ `252d3a2`, library `bros-zing-plot-plus-plus@1.0.13`):** most of the results and bug tables below are from the 2026-10-11 run and are now out of date. All high/medium/low bugs listed below have been fixed. Current numbers and status are in [Bug status as of 2026-10-22](#bug-status-as-of-2026-10-22). The npm package this fork publishes is `bros-zing-plot-plus-plus` (set up in PR #20, "Restore bros-zing-plot-plus-plus setup"); `zing-plot-plus-plus` is the original team's package. Other documents are mapped in [`DOCS_LEGEND.md`](../DOCS_LEGEND.md).

## Goal

Try to break the tool before users do, and turn each break into an automated
check so it stays fixed. Each part of the tool has its own test approach:

| Layer | What it covers | How it's tested |
|---|---|---|
| Library (`zing-plot-plus-plus/src`) | Chart object → SVG: scaling, ticks, labels, scatter points, line path, tooltip formatting | Unit tests: `zing-plot-plus-plus/tests/plots.test.js` |
| Library, Canvas chart and edge cases *(added after this plan was written)* | `<canvas-scatter-plot>` drawn on a recording fake canvas and compared with the SVG output; `drawPoints` / `findPointAt`; zero ranges, ticks, number formatting, zoom/pan/reset viewport | `zing-plot-plus-plus/tests/canvasScatterPlot.test.js`, `canvasScatterPlot.10k.test.js`, `canvasPoints.test.js`, `edgeCases.test.js`. Fake context: `tests/helpers/fake-canvas.js` |
| Site input (`zing-plot-web/script.js`) | Manual entry, CSV/JSON parsing, validation | Unit tests: `zing-plot-web/tests/parsing.test.mjs` |
| Bad-input corpus (`qa/fixtures/`) | 46 hostile and edge-case files, each with an expected outcome in `manifest.json` (now 48 files) | Data-driven tests: `zing-plot-web/tests/fixtures.test.mjs` |
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

Manifest fields the test reads: `expect`, `error`, `errorNot`, `x`, `y`, `n` (point count),
`title`, `xLabel`, `yLabel`, `maxTitleLength`, `maxLabelLength`, and `parseBug` (turns the
test into a TODO). `why` is a human note. `renderBug` is **only** a note: the fixture test
checks parsing, not drawing, so it ignores `renderBug`. The two remaining `renderBug` tags
(`BUG-02` on `html-in-header.csv`, `BUG-04` on `single-point-origin.csv`) refer to bugs that
have since been fixed.

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


Fixture files are in `qa/fixtures/`.

### High: fix first

| ID | Problem | Reproduce | Fix | Owner |
|---|---|---|---|---|
| BUG-02 | Title/labels are inserted as raw HTML: a CSV header can run JavaScript, and the data points vanish | `html-in-header.csv` | Escape text in the library | Charlie |

### Medium

| ID | Problem | Reproduce | Fix | Owner |
|---|---|---|---|---|
| BUG-04 | A single point at (0, 0) gives NaN coordinates and a blank chart | `single-point-origin.csv` | Treat a zero range as 1 | Charlie |
| BUG-14 | Publish CI fails on every push without a version bump | Actions history | Skip if the version is already on npm | Brian |
| BUG-15 | `package.json` `main` points to a missing file | `import 'zing-plot-plus-plus'` | Point to `src/detailedPlots.js` | Brian |

### Low

| ID | Problem | Reproduce | Fix | Owner |
|---|---|---|---|---|
| BUG-03 | Missing labels print "undefined" | Library call without labels | Default to empty | Charlie |
| BUG-16 | `// TODO` in the SVG `<style>` silently drops a CSS rule | `plotBase.js` | Use `/* */` | Charlie |
| BUG-17 | Changing a label attribute after render throws | `setAttribute('x-axis-label', …)` | Fix the selectors | Brian |

BUG-06, -07, -08, -09, -10, -12 and -13 were input-handling bugs (there is no BUG-11 in the repo); they are described and fixed in
[ADR 0001](../docs/adr/0001-input-validation-and-column-selection.md) and have tests in
`zing-plot-web/tests/parsing.test.mjs`.

## Bug status as of 2026-10-22

Checked by reading the code and running both suites on `main` @ `252d3a2`.

| Suite | Pass | TODO (known bug) | Fail |
|---|---|---|---|
| Library (`npm test`) | 159 | 0 | 0 |
| Site + fixtures (`node --test`) | 71 | 0 | 0 |

| ID | Status | Where the fix is |
|---|---|---|
| BUG-02 | Fixed | `escapeXML()` in `plotBase.js` `generateGraph()`; the canvas chart draws text as-is, which is safe |
| BUG-03 | Fixed | `?? ''` for title/labels in `generateGraph()` and `drawChart()` |
| BUG-04 | Fixed | `computeLayout()` treats a zero range as 1 |
| BUG-06 – BUG-10, BUG-12, BUG-13 | Fixed | ADR 0001 (site input handling) |
| BUG-14 | Fixed | Publish workflow skips if the version is already on npm |
| BUG-15 | Fixed | `package.json` `main` is `src/detailedPlots.js` |
| BUG-16 | Fixed | The comment in the SVG `<style>` is now `/* TODO */` |
| BUG-17 | Fixed in code | Label selectors use `querySelectorAll('.label-text')[0/1]`. Only the canvas chart's version of `attributeChangedCallback` has a test |
| BUG-18, BUG-19 | Fixed | Commit `6204897`: tooltip `formatValue()` now handles negative numbers like positive ones, and the canvas `aria-label` says "1 point" instead of "1 points". The commit doesn't say which ID is which |

Open issues found while checking the docs (no BUG ID yet):

| Problem | Where |
|---|---|
| `<scatter-plot>` and `<line-plot>` show no hover tooltip: the base `renderGraph()` stopped calling `setupHoverListeners()` in commit `4f79abe` | `plotBase.js` `renderGraph()` |
| With all-negative X or Y data the website's line chart is blank and the scatter chart is an empty frame, because the site always anchors at 0 (accepted in ADR 0001 › Consequences) | `zing-plot-web/script.js` `renderChart()` |
| The website shows no chart on first load, although the last comment in `script.js` says it does | `zing-plot-web/script.js` (last lines) |

## Manual / exploratory checklist

| Check | Status |
|---|---|
| Every render-relevant fixture loaded via the real `importFile()` in Chrome, both chart types; SVG inspected for NaN, visible points, ticks, injected elements | Done (findings above) |
| Save PNG with normal data | Not yet run |
| Save PNG after numeric-title import | Done (BUG-09) |
| Tooltip hover follows point, shows correct values, hides on leave | Not yet run |
| Window resize redraws the chart | Not yet run |
| Phone-width layout (the `.app` uses `width: 130%` + `scale(0.6)`) | Not yet run, worth checking. *Note: the `width: 130%` + `scale(0.6)` trick was removed in the responsive redesign ([ADR 0002](../docs/adr/0002-Responsive-visual-redesign-for-website.md)); the layout now stacks below 820 px* |
| Drag-and-drop upload | Not yet run |
| Keyboard-only use (tabs, form, file button) | Not yet run |
| Chart type switch keeps data | Done (works) |
| 10,000-point dataset renders on both chart types | Done (works) |

## How the tests reach the code without changing it

- **Library:** the components extend `HTMLElement`, which Node doesn't have.
  `tests/helpers/dom-stub.js` provides a stand-in `HTMLElement` and a
  `customElements.define` that records each class. Tests call `generateGraph()`
  on `Object.create(Class.prototype)` and check the SVG string.
  For `<canvas-scatter-plot>`, tests call `drawChart()` with the recording context
  from `tests/helpers/fake-canvas.js` and compare what it "drew" (lines, text,
  circles, clip rectangle, colors) with the SVG built for the same data.
  `dom-stub.js` must be imported **before** any `src/` file.
- **Site:** `script.js` is a classic browser script that binds DOM listeners when it
  loads. `tests/helpers/load-script.mjs` runs the real file in a `node:vm` sandbox
  with a no-op `window`/`document`, then calls its functions directly. If
  `script.js` is ever split into modules, swap this for normal imports.
