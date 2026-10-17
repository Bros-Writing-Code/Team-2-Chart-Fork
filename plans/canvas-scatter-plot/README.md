# Canvas Scatter Plot

> Issue #4 "SVG to Canvas" · Branch `feat/canvas-draw-points` · Status: **step 2 of 6**

## TL;DR

Zing Plot Plus Plus draws scatter points as SVG `<circle>` elements, one per point, which gets slow with thousands of points.
This work adds **`<canvas-scatter-plot>`**, a standalone chart element that looks the same but draws its **points on an HTML `<canvas>`**. The axes, labels and title stay in SVG.

It lives in its own files, so **`<scatter-plot>`, `<line-plot>` and the website are untouched**, and teammates can pull it in without conflicts.

---

## Contents

- [Where things are](#where-things-are)
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
| `zing-plot-plus-plus/src/canvasPoints.js` | `drawPoints()`, which draws the circles |
| `zing-plot-plus-plus/tests/canvasScatterPlot.test.js` | Tests for the element |
| `zing-plot-plus-plus/tests/canvasPoints.test.js` | Tests for `drawPoints` |
| `plans/canvas-scatter-plot/README.md` | **This file**: the quick reference |
| `plans/canvas-scatter-plot/PLAN.md` | The full plan: why Canvas, options compared, design, risks |
| `plans/canvas-scatter-plot/step-1-draw-points.md` | What step 1 changed |
| `plans/canvas-scatter-plot/step-2-canvas-scatter-element.md` | What step 2 changed |
| `plans/canvas-scatter-plot/bench/` | Benchmarks comparing SVG, Canvas and WebGL |

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

You should see a normal Zing chart (title, axes, grid, labels) with five blue dots.
Don't commit the test page. Delete it when you're done, or ignore it locally by adding its name to `.git/info/exclude`.

## How it works

```
<canvas-scatter-plot>  (shadow root)
 ├─ <svg>      axes, grid, ticks, title, labels   ← built by PlotBaseElement (shared with <scatter-plot>)
 ├─ <style>    puts the canvas exactly over the SVG
 └─ <canvas>   the points, drawn by drawPoints()
```

`CanvasScatterPlotElement` extends `PlotBaseElement`, the same base class as `<scatter-plot>`:

1. The base class builds the SVG frame and calls `applyPlotElements`. Ours returns no circles and saves the layout (margins, sizes, `scaleX`, `scaleY`).
2. `renderGraph()` adds a `<canvas>` the same size as the chart on top of the SVG.
3. `drawCanvasPoints()` clips to the plot area and calls `drawPoints()`. Every point lands on the same pixel `<scatter-plot>` would use, and a test checks this.

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

## Tests

```bash
cd zing-plot-plus-plus && npm test
```

| File | Test | Checks |
|---|---|---|
| `canvasPoints.test.js` | draws one circle per point, at its scaled position | Points in, circles out at the right pixels |
| | draws nothing for zero points | No crash on empty data |
| `canvasScatterPlot.test.js` | keeps the SVG axes and labels but has no SVG points | Frame still built, no `<circle>`s |
| | draws each point on the same pixel as `<scatter-plot>` does | Canvas matches SVG exactly |
| | clips the points to the plot area | Points can't draw over the axes |
| `canvasScatterPlot.10k.test.js` | draws 10,000 points correctly | All 10,000 points (the website's limit) are drawn on the same pixels as `<scatter-plot>`, and the markup is far smaller. Prints stats (below). |

There is no browser in Node, so the tests use a **fake canvas context**: a small hand-written object that records what would be drawn. CI runs these on every push. Current result: **24 pass, 0 fail**.

### 10,000-point stats

The 10k test prints these every time it runs (`npm test` shows them as `ℹ` lines). Example run, median of 5:

| | `<scatter-plot>` (SVG) | `<canvas-scatter-plot>` |
|---|---|---|
| Time to build the SVG | 14.7 ms | 0.3 ms (frame only) |
| SVG markup size | 1,307 KB | 3 KB (**379× smaller**) |
| Page elements for the points | 10,000 `<circle>`s | 1 `<canvas>` |
| Time to issue the canvas drawing calls | — | 3.0 ms |
| Points on the same pixels | — | ✅ all 10,000 |

Timings vary by machine, so the test reports them rather than failing on them. The only time check is a generous 1-second limit on drawing, to catch an accidental big slowdown. These numbers come from Node with a fake canvas: they show how much work our code does, not how long the browser takes to paint. The SVG side also still has to be parsed and laid out by the browser, which isn't included here. For real browser timings, see `bench/browser-bench.html` in [PLAN.md §4b](PLAN.md#4b-in-browser-benchmark-to-run).

## Known limits

Planned for later steps:

| Not yet | Effect today |
|---|---|
| Hover tooltip | Nothing happens on hover |
| PNG export | The website's export would leave the points out (the website doesn't use this element yet) |
| Theme color and opacity | Points are always solid `#3498db` |
| HiDPI / Retina | Points may look slightly soft |
| Speed tuning (one path for all points) | Fine for normal data, slower than it could be at tens of thousands of points |

## Progress

| Step | What | Status |
|---|---|---|
| 1 | `drawPoints()` + 2 tests | ✅ [Done](step-1-draw-points.md) |
| 2 | Standalone `<canvas-scatter-plot>` element + 3 tests | ✅ [Done](step-2-canvas-scatter-element.md) |
| 3 | Theme color and opacity, one path for all points | Next |
| 4 | Hover and tooltip on canvas | Planned |
| 5 | PNG export includes canvas points | Planned |
| 6 | Sharp on HiDPI screens, screen-reader label, switch the website to canvas | Planned |

## FAQ

**Why a separate element instead of changing `<scatter-plot>`?**
It keeps the work in its own files, so nothing existing can break and teammates can merge or import it without conflicts. It reuses the shared base class, so there's no copied axis/label code. Whether it later replaces `<scatter-plot>` or becomes an option on it is a team decision.

**Why Canvas instead of SVG?**
SVG creates one page element per point. At the site's limit of 10,000 rows, that's 10,000 elements and about 1.3 MB of markup, rebuilt on every change. A canvas is a single element no matter how many points it holds. Numbers are in [PLAN.md §4](PLAN.md#4-benchmarks-why-canvas).

**Why not move everything to Canvas?**
Text drawn on a canvas is just pixels: it can't be selected, is harder for screen readers, and needs extra work to stay sharp. Keeping axes and labels in SVG also keeps the shared base class and its tests working.

**Why not WebGL?**
It only pays off with hundreds of thousands of points or more, and it's much harder to write and test. See [PLAN.md §2](PLAN.md#2-options-considered).

**Does this look like other charting libraries?**
`beginPath` → `arc` → `fill` is the browser's built-in way to draw a circle, so all canvas libraries have similar lines. Nothing was copied, and the fake-context test helpers are hand-written.

**Can another issue build on this?**
Yes. For example, zooming and scrolling (#3) could build on `<canvas-scatter-plot>`, since redrawing a canvas is cheap. Merge this branch, or import `canvasScatterPlot.js`.

## Adding the next step

1. Keep each push small: one idea, a few tests.
2. Add a `step-N-<name>.md` next to this file, in the same format as the existing step docs: TL;DR, what changed, tests, effect on other code, what's left for later.
3. Update the **Progress** table here and in [PLAN.md](PLAN.md).
