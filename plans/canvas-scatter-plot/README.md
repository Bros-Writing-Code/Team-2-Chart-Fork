# Canvas Scatter Plot

> Issue #4 "SVG to Canvas" · Branch `feat/canvas-draw-points` · Status: **step 3 done: whole scatter chart on canvas**

## TL;DR

Zing Plot Plus Plus draws scatter points as SVG `<circle>` elements, one per point, which gets slow with thousands of points.
This work adds **`<canvas-scatter-plot>`**, a chart element that looks the same as `<scatter-plot>` but draws **the whole chart on one HTML `<canvas>`**: axes, grid, labels, title and points. No SVG.

It has hover tooltips, PNG export, the theme color, sharp drawing on HiDPI screens and a screen-reader label. **The website uses it for scatter charts** from library version 1.0.11. `<scatter-plot>` and `<line-plot>` are still SVG and unchanged.

---

## Contents

- [Where things are](#where-things-are)
- [Demo](#demo)
- [Using `<canvas-scatter-plot>`](#using-canvas-scatter-plot)
- [Try it in a browser](#try-it-in-a-browser)
- [How it works](#how-it-works)
- [API: `drawPoints`](#api-drawpoints)
- [Tests](#tests)
- [Known limits](#known-limits)
- [Progress](#progress)
- [FAQ](#faq)
- [Adding the next step](#adding-the-next-step)

---

## Where things are

| Path (from repo root) | What it is |
|---|---|
| `zing-plot-plus-plus/src/canvasScatterPlot.js` | The `<canvas-scatter-plot>` element |
| `zing-plot-plus-plus/src/canvasPoints.js` | `drawPoints()` draws the circles, `findPointAt()` finds the one under the mouse |
| `zing-plot-plus-plus/src/plotBase.js` | `computeLayout()`: the layout shared by the SVG and canvas charts |
| `zing-plot-plus-plus/tests/canvasScatterPlot.test.js` | Tests for the element |
| `zing-plot-plus-plus/tests/canvasPoints.test.js` | Tests for `drawPoints` and `findPointAt` |
| `zing-plot-plus-plus/tests/helpers/fake-canvas.js` | Fake canvas for tests: records lines, text and circles |
| `zing-plot-plus-plus/demo/canvas-vs-svg.html` | Live side-by-side demo with timings ([how to run](#demo)) |
| `zing-plot-plus-plus/demo/canvas-features.js` | The demo's feature list: update it when the canvas chart gains a feature |
| `plans/canvas-scatter-plot/README.md` | **This file**: the quick reference |
| `plans/canvas-scatter-plot/PLAN.md` | The full plan: why Canvas, options compared, design, risks |
| `plans/canvas-scatter-plot/step-1-draw-points.md` | What step 1 changed |
| `plans/canvas-scatter-plot/step-2-canvas-scatter-element.md` | What step 2 changed |
| `plans/canvas-scatter-plot/step-3-full-canvas.md` | What step 3 changed: the whole chart on canvas |
| `plans/canvas-scatter-plot/bench/` | Benchmarks comparing SVG, Canvas and WebGL |

## Demo

A page that draws the same points with `<scatter-plot>` (SVG) and `<canvas-scatter-plot>` side by side and measures both in your browser.

1. From the repo root, start a local server: `npx serve .` (or `python3 -m http.server`).
2. Open `/zing-plot-plus-plus/demo/canvas-vs-svg.html` on the address it prints, e.g. `http://localhost:3000/zing-plot-plus-plus/demo/canvas-vs-svg.html`.

Opening the file by double-clicking won't work: browsers block the library imports for files opened directly from disk.

What it shows:
- **Both charts** with 1,000, 10,000 or 50,000 points.
- **Measurements**: time until each chart is on screen, number of elements, markup size, and the average of 20 redraws (roughly what zooming costs).
- **Canvas features**: a card per feature with its status (Done, In progress or Planned) and where it belongs. Done features can have a "try it" control, e.g. **Check positions** confirms every canvas point matches its SVG twin.

**When you add a feature** (tooltips, zoom, export…), add or update its entry in `zing-plot-plus-plus/demo/canvas-features.js`. Set `status: 'done'` and, if useful, give it a `setup()` function that adds a button or control to its card. The comment at the top of that file explains each field. The page picks it up automatically.

## Using `<canvas-scatter-plot>`

It works exactly like `<scatter-plot>`. Only the tag name and the import are different.

```html
<canvas-scatter-plot id="chart"></canvas-scatter-plot>
<script type="module">
  import './zing-plot-plus-plus/src/canvasScatterPlot.js';

  const points = [[1, 2], [3, 5], [5, 3], [7, 8], [9, 6]].map((coordinate) => ({ coordinate }));
  document.getElementById('chart').setChartProperties(
    { title: 'Canvas Scatter', 'x-axis-label': 'X', 'y-axis-label': 'Y', points },
    500, 400,      // width, height
    false, 0, 0,   // centerOrigin, anchorX, anchorY
    10, 10, 5,     // rangeX, rangeY, ticks
  );
</script>
```

Adjust the import path to where the page lives relative to `zing-plot-plus-plus/`. It isn't part of the npm package's main file yet, so import `canvasScatterPlot.js` directly.

## Try it in a browser

1. **Create a file** in the repo root (the `Team-2-Chart-Fork` folder), e.g. `try-canvas.html`.
2. **Copy the code block from [Using `<canvas-scatter-plot>`](#using-canvas-scatter-plot)** above into it.
3. **Start a local server** from the repo root: `npx serve .`. Opening the file by double-clicking won't work, because browsers block the `import` line for files opened directly from disk.
4. **Open** the address it prints plus the file name, e.g. `http://localhost:3000/try-canvas.html`.

You should see a normal Zing chart (title, axes, grid, labels) with five blue dots. For the hover tooltip, also add `<tool-tip-modal id="my-tooltip"></tool-tip-modal>` to the page.
Don't commit the test page. Delete it when you're done, or ignore it locally by adding its name to `.git/info/exclude`.

## How it works

```
<canvas-scatter-plot>  (shadow root)
 ├─ <style>
 └─ <canvas role="img" aria-label="…">   everything: background, grid, axes, ticks, title, labels, points
```

`CanvasScatterPlotElement` extends `PlotBaseElement`, the same base class as `<scatter-plot>`, so it has the same setters and `setChartProperties(...)`:

1. `renderGraph()` calls `computeLayout()` from `plotBase.js`, the same margins, scales and ticks `<scatter-plot>` uses.
2. It makes a `<canvas>` at the screen's pixel density (sharp on Retina) and calls `drawChart()`, which draws everything with the same colors, fonts and positions as the SVG version. Tests check this line by line.
3. On `mousemove`, `findPointAt()` finds the point under the mouse and fills in the page's `<tool-tip-modal id="my-tooltip">`.
4. `toImageCanvas(width, height)` draws the chart at any size, for saving as PNG.

Details are in [step-3-full-canvas.md](step-3-full-canvas.md).

## API: `drawPoints`

The low-level function the element uses. You only need it if you're drawing on your own canvas.

```js
import { drawPoints } from './zing-plot-plus-plus/src/canvasPoints.js';

drawPoints(ctx, points, scaleX, scaleY, radius);
```

| Parameter | Type | Meaning |
|---|---|---|
| `ctx` | `CanvasRenderingContext2D` | From `canvas.getContext('2d')` |
| `points` | `Array<{ coordinate: [x, y] }>` | The same point format the chart uses |
| `scaleX` | `(x) => pixelX` | Turns a data X value into a pixel position |
| `scaleY` | `(y) => pixelY` | Turns a data Y value into a pixel position (the canvas Y axis points down) |
| `radius` | `number` | Circle radius in pixels |

Draws one filled circle per point in the context's current `fillStyle`.

```js
import { findPointAt } from './zing-plot-plus-plus/src/canvasPoints.js';

const point = findPointAt(points, scaleX, scaleY, mouseX, mouseY, maxDistance); // or null
```

Returns the point drawn closest to `(mouseX, mouseY)` if it's within `maxDistance` pixels. On a tie, it returns the later point, which is drawn on top.

## Tests

```bash
cd zing-plot-plus-plus && npm test
```

| File | Checks |
|---|---|
| `canvasPoints.test.js` | `drawPoints`: circles at the right pixels, nothing for empty data. `findPointAt`: exact hit, closest of several, ties, nothing in range. |
| `canvasScatterPlot.test.js` | Every point, grid line, axis, tick number, title and label is drawn where `<scatter-plot>` puts it. Fonts, theme color and 0.8 opacity, clipping, empty data, raw text without HTML escaping, screen-reader label. |
| `canvasScatterPlot.10k.test.js` | All 10,000 points (the website's limit) on the same pixels as `<scatter-plot>`. Prints stats (below). |

There is no browser in Node, so the tests use a **fake canvas context**: a small hand-written object that records what would be drawn. CI runs these on every push. Current result: **35 pass, 0 fail**.

### 10,000-point stats

The 10k test prints these every time it runs (`npm test` shows them as `ℹ` lines). Example run, median of 5:

| | `<scatter-plot>` (SVG) | `<canvas-scatter-plot>` |
|---|---|---|
| Time to build the chart | 16.2 ms (SVG markup) | 4.1 ms (canvas draw calls, whole chart) |
| Markup size | 1,307 KB | none |
| Page elements for the chart | ~10,000 | 1 `<canvas>` |
| Points on the same pixels | — | ✅ all 10,000 |

Timings vary by machine, so the test reports them rather than failing on them. The only time check is a generous 1-second limit on drawing, to catch an accidental big slowdown. These numbers come from Node with a fake canvas: they show how much work our code does, not how long the browser takes to paint. The SVG side also still has to be parsed and laid out by the browser, which isn't included here. For real browser timings, see `bench/browser-bench.html` in [PLAN.md §4b](PLAN.md#4b-in-browser-benchmark-to-run).

## Known limits

| Limit | Effect |
|---|---|
| Chart text is pixels | It can't be selected or copied. Screen readers get the `aria-label` summary, not each value. |
| Live site waits on npm | The site loads `zing-plot-plus-plus@1.0.11` from the CDN, which exists only after this reaches `main` and the publish workflow runs. |
| Hover checks every point | Fine at 10,000. Much larger data with zoom (#3) may need a spatial index. |

## Progress

| Step | What | Status |
|---|---|---|
| 1 | `drawPoints()` + 2 tests | ✅ [Done](step-1-draw-points.md) |
| 2 | Standalone `<canvas-scatter-plot>` element (SVG frame, canvas points) | ✅ [Done](step-2-canvas-scatter-element.md) |
| 3 | Whole chart on canvas: hover, PNG export, theme color, HiDPI, screen-reader label, website uses it | ✅ [Done](step-3-full-canvas.md) |

Steps 3–6 of the original plan were combined into step 3 when the team chose a fully canvas scatter chart.

## FAQ

**Why a separate element instead of changing `<scatter-plot>`?**
It keeps the work in its own files, so nothing existing can break and teammates can merge or import it without conflicts. It reuses the shared base class, so there's no copied axis/label code. Whether it later replaces `<scatter-plot>` or becomes an option on it is a team decision.

**Why Canvas instead of SVG?**
SVG creates one page element per point. At the site's limit of 10,000 rows, that's 10,000 elements and about 1.3 MB of markup, rebuilt on every change. A canvas is a single element no matter how many points it holds. Numbers are in [PLAN.md §4](PLAN.md#4-benchmarks-why-canvas).

**Why is the whole chart canvas now, not just the points?**
The team lead asked for the scatter chart to be all canvas. One canvas also makes PNG export and hover simpler. The costs: chart text can't be selected, screen readers get a summary label instead of the text, and the canvas needs HiDPI scaling to stay sharp. All three are handled or noted under [Known limits](#known-limits).

**Why not WebGL?**
It only pays off with hundreds of thousands of points or more, and it's much harder to write and test. See [PLAN.md §2](PLAN.md#2-options-considered).

**Does this look like other charting libraries?**
`beginPath` → `arc` → `fill` is the browser's built-in way to draw a circle, so all canvas libraries have similar lines. Nothing was copied, and the fake-context test helpers are hand-written.

**Can another issue build on this?**
Yes. For example, zooming and scrolling (#3) could build on `<canvas-scatter-plot>`, since redrawing a canvas is cheap: change the range and call `renderGraph()`. Merge this branch, or import `canvasScatterPlot.js`.

## Adding the next step

1. Keep each push small: one idea, a few tests.
2. Add a `step-N-<name>.md` next to this file, in the same format as the existing step docs: TL;DR, what changed, tests, effect on other code, what's left for later.
3. Update the **Progress** table here and in [PLAN.md](PLAN.md).
