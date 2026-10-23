# Documentation Legend

This file is a map. It does **not** repeat the documentation. It tells you which file to open for each topic. Every document stays where it is.

Last checked against the code: 2026-10-22 (library `package.json` version `1.0.13`, website loads `1.0.12`, library tests 159 pass, website tests 71 pass).

---

## 1. Where each document lives

| Document | Who it is for | What is in it |
|---|---|---|
| [`README.md`](README.md) | Library users and website users | Installing the library, `<scatter-plot>` / `<line-plot>` / `<canvas-scatter-plot>` usage, `setChartProperties` parameters, tooltips, zoom/pan/reset, theme color, how to use the website |
| [`zing-plot-web/README.md`](zing-plot-web/README.md) | Website developers | Map of `script.js`, how data flows from the form/file to the chart, the axis-range formula, version pinning, running the site locally, website quirks |
| [`SVG_TO_CANVAS_MIGRATION.md`](SVG_TO_CANVAS_MIGRATION.md) | Anyone who wants the finished story of the canvas work | Why Canvas, architecture before/after, what changed in which file, verification, limitations |
| [`plans/canvas-scatter-plot/README.md`](plans/canvas-scatter-plot/README.md) | Developers working on the canvas chart | Quick reference: files, demo page, `drawPoints` / `findPointAt` API, tests, known limits, FAQ |
| [`plans/canvas-scatter-plot/PLAN.md`](plans/canvas-scatter-plot/PLAN.md) | Historical | The original plan (hybrid SVG + canvas), options compared, benchmarks. Kept as the reasoning behind the work; the design was later changed (see the notes at its top) |
| [`plans/canvas-scatter-plot/step-1-draw-points.md`](plans/canvas-scatter-plot/step-1-draw-points.md), [`step-2-…`](plans/canvas-scatter-plot/step-2-canvas-scatter-element.md), [`step-3-…`](plans/canvas-scatter-plot/step-3-full-canvas.md) | Historical | Change logs for each step of the canvas work, in order |
| [`docs/adr/0001-input-validation-and-column-selection.md`](docs/adr/0001-input-validation-and-column-selection.md) | Website developers | Decision record: which numbers and file formats the website accepts, the column picker, limits |
| [`docs/adr/0002-Responsive-visual-redesign-for-website.md`](docs/adr/0002-Responsive-visual-redesign-for-website.md) | Website developers / designers | Decision record: the current page layout, the single chart-type selector |
| [`qa/TEST_PLAN.md`](qa/TEST_PLAN.md) | QA, anyone adding tests | How to run tests, how the tests reach the code in Node, the bad-input fixtures, bug list |
| [`qa/fixtures/manifest.json`](qa/fixtures/manifest.json) | QA | Expected result for every fixture file (its `_readme` field explains the format) |
| [`zing-plot-plus-plus/demo/canvas-features.js`](zing-plot-plus-plus/demo/canvas-features.js) (comment at the top) | Canvas developers | How to add a feature card to the demo page |
| `CANVAS-FOLLOWUPS.md` | Local only (not committed; excluded in `.git/info/exclude`) | Personal to-do notes for the canvas work |

## 2. Find a topic

| I want to know… | Look here |
|---|---|
| How to install the library | `README.md` → *Installation* |
| What each `setChartProperties(...)` argument means | `README.md` → *What the `setChartProperties` arguments mean* |
| Why my chart shows nothing | `README.md` → the **NOTE** under *Adding data or attributes to the scatter plot*; for the website, `zing-plot-web/README.md` → *Quirks* |
| Which properties redraw the chart and which don't | `README.md` → *Which changes redraw the chart* |
| How to use `<canvas-scatter-plot>` | `README.md` → *Example 3*; deeper detail in `plans/canvas-scatter-plot/README.md` → *Using `<canvas-scatter-plot>`* |
| Why there is no hover tooltip | `README.md` → *Hover tooltips* |
| Zoom, pan and the ↺ reset button | `README.md` → *Zooming, panning and resetting the view*; implementation notes in `SVG_TO_CANVAS_MIGRATION.md` §10 |
| Changing the chart color | `README.md` → *Changing the chart color* |
| How canvas drawing / hit-testing works | `SVG_TO_CANVAS_MIGRATION.md` §4–§6, `plans/canvas-scatter-plot/README.md` → *API* |
| Accessibility of the canvas chart | `SVG_TO_CANVAS_MIGRATION.md` §7 |
| PNG export | `SVG_TO_CANVAS_MIGRATION.md` §8 (library side), `zing-plot-web/README.md` → *Saving a PNG* (website side) |
| What CSV / JSON files the website accepts | `docs/adr/0001-…` → *Decisions*; summary in `README.md` → *Trying it out*, step 2 |
| Why negative numbers don't show on the website | `docs/adr/0001-…` → *Consequences*; `zing-plot-web/README.md` → *How the axis range is chosen* |
| The website layout and why there is only one chart-type selector | `docs/adr/0002-…` |
| Running the tests | `qa/TEST_PLAN.md` → *Running the tests* |
| How tests run without a browser | `qa/TEST_PLAN.md` → *How the tests reach the code without changing it* |
| Adding a bad-input test file | `qa/TEST_PLAN.md` → *Adding a bad input* |
| Which bugs are fixed and which are open | `qa/TEST_PLAN.md` → *Bug status as of 2026-10-22* |
| Benchmarks: SVG vs Canvas vs WebGL | `plans/canvas-scatter-plot/PLAN.md` §4, `plans/canvas-scatter-plot/README.md` → *10,000-point stats* |
| Seeing the site with local (unpublished) library code | `zing-plot-web/README.md` → *Running the website locally* |
| How releases reach npm and the live site | `zing-plot-web/README.md` → *Library version used by the site* |

## 3. Code map (files with no document of their own)

| Code | What it is | Explained in |
|---|---|---|
| `zing-plot-plus-plus/src/plotBase.js` | Base class `PlotBaseElement` (setters, `setChartProperties`, SVG drawing, zoom/pan/reset), `<tool-tip-modal>`, layout helpers `computeLayout` / `getTicks` / `formatAxisNumber` / `resetButtonLayout` | JSDoc in the file; `README.md`; `SVG_TO_CANVAS_MIGRATION.md` §3 and §10 |
| `zing-plot-plus-plus/src/detailedPlots.js` | `<scatter-plot>` and `<line-plot>` (SVG). **This is the package entry** (`main` in `package.json`) | `README.md` |
| `zing-plot-plus-plus/src/canvasScatterPlot.js` | `<canvas-scatter-plot>`. **Not** loaded by the package entry; import it separately | `README.md` → *Example 3*; `plans/canvas-scatter-plot/` |
| `zing-plot-plus-plus/src/canvasPoints.js` | `drawPoints()` and `findPointAt()` | `plans/canvas-scatter-plot/README.md` → *API* |
| `zing-plot-plus-plus/src/index.js` | A leftover `helloWorld()` placeholder. Nothing imports it and it is **not** the package entry. Safe to ignore | This table |
| `zing-plot-plus-plus/demo/demo.html` + `demo-script.js` | Old SVG demo (scatter + line). It passes an object (`{ x: 250, y: 250 }`) as `centerOrigin`; only the boolean `true` centers the chart, so this demo is **not** centered | `README.md` → *What the `setChartProperties` arguments mean* |
| `zing-plot-plus-plus/demo/canvas-vs-svg.html` + `canvas-features.js` | Side-by-side SVG/Canvas demo with timings. Its "Zooming and scrolling" card still says *planned*, but zoom/pan is now built in | `plans/canvas-scatter-plot/README.md` → *Demo* |
| `zing-plot-plus-plus/tests/` | Library tests (`node:test`); helpers in `tests/helpers/` | `qa/TEST_PLAN.md` |
| `zing-plot-web/index.html`, `script.js`, `style.css` | The website. HTML comments in `index.html` say `app.js`; the file is `script.js` | `zing-plot-web/README.md` |
| `zing-plot-web/tests/` | Website parsing and fixture tests | `qa/TEST_PLAN.md` |
| `plans/canvas-scatter-plot/bench/` | `node-bench.mjs` and `browser-bench.html` benchmarks | `plans/canvas-scatter-plot/PLAN.md` §4 |
| `.github/workflows/test.yml` | Runs both test suites on every push and pull request | `qa/TEST_PLAN.md` → *Running the tests* |
| `.github/workflows/publish-zing-plot-plus-plus.yml` | On push to `main`: runs library tests, then publishes to npm **only if** that version is not on npm yet | `zing-plot-web/README.md` → *Library version used by the site* |
| `.github/workflows/post-gh-pages.yml` | On push to `main`: deploys the `zing-plot-web/` folder to GitHub Pages | `zing-plot-web/README.md` → *Library version used by the site* |
| `preview.sh`, `testCanvasScatterPlot.html` (repo root) | Local helper files, not committed. `testCanvasScatterPlot.html` is listed in `zing-plot-web/.gitignore`, but it sits in the repo root, so that rule doesn't match it | `CANVAS-FOLLOWUPS.md` (local) |

## 4. Words used across the docs

| Term | Meaning |
|---|---|
| SVG chart | `<scatter-plot>` or `<line-plot>`: builds an SVG string and puts it in the element's shadow DOM |
| Canvas chart | `<canvas-scatter-plot>`: draws everything on one `<canvas>` |
| Anchor (`anchorX`, `anchorY`) | The data value at the chart's center (if `centerOrigin` is `true`) or at its bottom-left corner (otherwise) |
| Range (`rangeX`, `rangeY`) | How many data units the visible axis covers |
| Viewport | The currently visible anchor + range, which zoom and pan change |
| Initial viewport | The anchor + range from the last `setChartProperties` call; the ↺ button goes back to it |
| `BUG-xx` | A bug ID from `qa/TEST_PLAN.md` |
| ADR | Architecture Decision Record, in `docs/adr/` |
| Fixture | A sample input file in `qa/fixtures/` |
