Notes

- INPUT DATA AREA: left panel form inputs and the "Drag & Drop" upload box are where the app should accept user data (CSV / JSON / manual entries).

# Zing-Plot-Web: developer notes

The website that shows off the library. It is three static files (`index.html`, `script.js`, `style.css`) with no build step. User instructions are in the [root README › Trying it out](../README.md#-trying-it-out). Other documents are listed in [`DOCS_LEGEND.md`](../DOCS_LEGEND.md).

## Files

| File | What it does |
|---|---|
| `index.html` | Page markup. Loads `script.js` and the chart library from the jsDelivr CDN. The `<tool-tip-modal id="my-tooltip">` near the top is what the scatter chart's hover tooltip uses. |
| `script.js` | All behavior: reading the form and files, validating, drawing the chart, saving PNGs. A classic (non-module) script. |
| `style.css` | Layout and look; see [ADR 0002](../docs/adr/0002-Responsive-visual-redesign-for-website.md). |
| `tests/` | `parsing.test.mjs` (input functions) and `fixtures.test.mjs` (every file in `qa/fixtures/`). See [`qa/TEST_PLAN.md`](../qa/TEST_PLAN.md). |

> **`app.js` means `script.js`.** Several HTML comments in `index.html` (for example "Extend renderChart() in app.js") refer to `app.js`. There is no such file; the functions they name are all in `script.js`.

## How data gets to the chart

```text
Manual entry ── "Generate Chart" ─► handleGenerateChart ─► readForm ─► validate ──┐
File upload ─── importFile ─► parseCSV / parseJSON ─► numericColumns ─►           │
                defaultColumns ─► applyColumns ─► buildDataset ─► validate ───────┤
X/Y column drop-downs ─► handleColumnChange ─► applyColumns ─────────────────────┤
Chart-type tab ─► setType ───────────────────────────────────────────────────────┤
Window resize (250 ms debounce, only if the size changed) ───────────────────────┤
                                                                                  ▼
                                   `dataset` (one shared object) ─► renderChart()
```

- `dataset` holds the last **successfully** generated or imported data. Switching chart type redraws `dataset`, not whatever is currently typed in the form.
- `renderChart()` throws the old chart element away and creates a new one every time (`<line-plot>` for "Linear", `<canvas-scatter-plot>` for "Scatter Plot"), sized to the `.chart-container`. So any zoom or pan is lost on every redraw.
- `notify(text, kind)` writes to the `#message` line under the form: `kind = true` shows an error (red), `"warning"` a warning (yellow), anything else plain text. An empty `text` hides it.
- `imported` remembers the last uploaded file's columns, for the X/Y drop-downs. `imported.applied` is the pair currently shown, used to undo a drop-down change that fails validation.

Validation rules and the reasons behind them are in [ADR 0001](../docs/adr/0001-input-validation-and-column-selection.md).

### Limits (constants at the top of `script.js`)

| Constant | Value | Also written in |
|---|---|---|
| `MAX_POINTS` | 10,000 | `index.html` upload hint ("up to 10,000 points"). Change both together |
| `MAX_FILE_BYTES` | 5 MB | `index.html` upload hint and the error text in `importFile()` |
| `MAX_ABS` | 1e300 | Error text in `toNumber()` |
| `TITLE_MAX` / `LABEL_MAX` | 100 / 60 | `maxlength` on the inputs in `index.html` |

## How the axis range is chosen

`renderChart()` calls `setChartProperties(...)` with:

| Argument | Value |
|---|---|
| width, height | The `.chart-container`'s current size in pixels |
| `centerOrigin`, `anchorX`, `anchorY` | `false, 0, 0`: the bottom-left corner is always (0, 0) |
| `rangeX` | `max(x) + (max(x) - min(x)) * 0.1` |
| `rangeY` | `max(y) + (max(y) - min(y)) * 0.1` |
| `ticks` | `10` |

What this means:

- Negative values are accepted by validation but drawn **below or left of the visible area**.
- If **every** X (or Y) value is negative, the range comes out negative. `<line-plot>` then refuses to draw (blank preview). `<canvas-scatter-plot>` draws an empty frame with no tick numbers and no points.
- A single point `(0, 0)` gives a range of 0, which the library treats as 1.
- Data far from 0 (e.g. 1000–1010) is squeezed against the far edge, because the axis still starts at 0.

This is a known, accepted limitation (ADR 0001 › Consequences). It goes away when `renderChart()` passes an anchor based on `min(x)` / `min(y)`.

## Saving a PNG

`handleSaveChart()` → `chartToCanvas(chart, 1268, 1420)` → PNG download.

- `<canvas-scatter-plot>` has a `toImageCanvas()` method, so it redraws itself at that size.
- `<line-plot>` (SVG) has no such method. Its `<svg>` is cloned, serialized, loaded as an image, and drawn onto a canvas.
- Either way the chart keeps its shape and is centered in the 1268 × 1420 image. Leftover space is transparent.
- The file name is the chart title with everything except letters, numbers, spaces, `-` and `_` removed, or `chart.png` if nothing is left.

## Quirks worth knowing

- **Empty preview on first load.** The last line of `script.js` is commented "Initialize the controls and display the default chart", but it only calls `bindEvents()`. No chart is drawn until the user generates, uploads, switches type or resizes the window.
- **`escapeXML()` in `script.js` is not used** by the page. The library escapes SVG text itself. The function is still covered by `tests/parsing.test.mjs`.
- **No hover tooltip on line charts.** Only `<canvas-scatter-plot>` wires up the tooltip (see the [root README › Hover tooltips](../README.md#hover-tooltips)).
- **The duplicate Line/Scatter buttons in the preview toolbar** (`.preview-type`) still exist in the HTML and `setType()` still keeps them in sync, but CSS hides them (`display: none !important`), per ADR 0002.
- **`style.css` has no rule for `canvas-scatter-plot`.** `.chart-container > line-plot, .chart-container > scatter-plot` get `width/height: 100%`; the canvas chart sizes itself from the numbers `renderChart()` passes, so it still fills the container.
- **`// BACKEND HOOK` comments** in `importFile()` and `handleSaveChart()` mark where server upload or cloud saving could be added. There is no backend today.

## Library version used by the site

`index.html` loads two files from a **pinned** version of the npm package `bros-zing-plot-plus-plus`:

```html
<script src="https://cdn.jsdelivr.net/npm/bros-zing-plot-plus-plus@1.0.12/src/detailedPlots.js" type="module" defer></script>
<script src="https://cdn.jsdelivr.net/npm/bros-zing-plot-plus-plus@1.0.12/src/canvasScatterPlot.js" type="module" defer></script>
```

The site does **not** use the library code in `../zing-plot-plus-plus/src/` directly. Library changes reach the site in three steps:

1. Bump `version` in `zing-plot-plus-plus/package.json` and merge to `main`. `.github/workflows/publish-zing-plot-plus-plus.yml` runs the library tests and publishes that version to npm. If the version is already on npm, it skips publishing **without failing**, so forgetting the bump means nothing is published.
2. Change both `@1.0.12` tags above to the new version.
3. Merge to `main`. `.github/workflows/post-gh-pages.yml` deploys this `zing-plot-web/` folder to GitHub Pages.

As of 2026-10-22, `package.json` says `1.0.13` while the site still loads `1.0.12`.

## Running the website locally

Browsers block module imports from `file://`, so serve the repo over HTTP from the repo root:

```bash
python3 -m http.server 8000      # or: npx serve .
```

Then open `http://localhost:8000/zing-plot-web/`. That uses the **published** library (see above).

To try **unpublished** library changes, temporarily change the two script tags to `../zing-plot-plus-plus/src/detailedPlots.js` and `../zing-plot-plus-plus/src/canvasScatterPlot.js`, and **undo that before committing**.

> If you have the local helper `preview.sh` (not committed), note that its `sed` command looks for `npm/zing-plot-plus-plus@`, the package's old name. It doesn't match the current `npm/bros-zing-plot-plus-plus@` tags, so its "local library" page still loads the published version.

## Tests

```bash
cd zing-plot-web && node --test --test-reporter=spec
```

`script.js` binds DOM listeners as soon as it loads, so the tests run the real file in a `node:vm` sandbox with a fake `window`/`document` (`tests/helpers/load-script.mjs`) and call its functions directly. `load-script.mjs` re-implements `importFile()`'s file-extension and size checks by hand, so update both if those change.
