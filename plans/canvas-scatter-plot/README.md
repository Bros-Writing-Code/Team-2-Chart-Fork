# Canvas Scatter Plot

> Issue #4 "SVG to Canvas" · Branch `feat/canvas-draw-points` · Status: **step 1 of 6**

## TL;DR

Zing Plot Plus Plus draws scatter points as SVG `<circle>` elements, one per point.
This work moves the **points** onto an HTML `<canvas>`, which stays fast with thousands of points, while the axes, labels and title stay in SVG.

Right now there is one building block, `drawPoints()`. **The chart does not use it yet**, so nothing changes for users.

---

## Contents

- [Where things are](#where-things-are)
- [How it will fit into the chart](#how-it-will-fit-into-the-chart)
- [API: `drawPoints`](#api-drawpoints)
- [Try it in a browser](#try-it-in-a-browser)
- [Tests](#tests)
- [Progress](#progress)
- [FAQ](#faq)
- [Adding the next step](#adding-the-next-step)

---

## Where things are

| Path (from repo root) | What it is |
|---|---|
| `zing-plot-plus-plus/src/canvasPoints.js` | The code: `drawPoints()` |
| `zing-plot-plus-plus/tests/canvasPoints.test.js` | Its tests |
| `plans/canvas-scatter-plot/README.md` | **This file**: the quick reference |
| `plans/canvas-scatter-plot/PLAN.md` | The full plan: why Canvas, options compared, design, risks |
| `plans/canvas-scatter-plot/step-1-draw-points.md` | What step 1 changed and what was left for later |
| `plans/canvas-scatter-plot/bench/` | Benchmarks comparing SVG, Canvas and WebGL |

## How it will fit into the chart

```
<scatter-plot>
 ├─ <svg>      axes, grid, tick numbers, title, labels   (stays as it is)
 └─ <canvas>   the data points, drawn by drawPoints()     (new, from step 2)
```

Today the chart is only the `<svg>` part, with the points inside it.

## API: `drawPoints`

```js
import { drawPoints } from './src/canvasPoints.js';

drawPoints(ctx, points, scaleX, scaleY, radius);
```

| Parameter | Type | Meaning |
|---|---|---|
| `ctx` | `CanvasRenderingContext2D` | From `canvas.getContext('2d')` |
| `points` | `Array<{ coordinate: [x, y] }>` | The same point format the chart already uses |
| `scaleX` | `(x) => pixelX` | Turns a data X value into a pixel position |
| `scaleY` | `(y) => pixelY` | Turns a data Y value into a pixel position (remember the canvas Y axis points down) |
| `radius` | `number` | Circle radius in pixels |

Returns nothing. It draws one filled circle per point in the context's current `fillStyle` (black by default).

**Not handled yet** (coming in later steps): theme color and opacity, drawing all points in one path for speed, and skipping `NaN`/`Infinity` points.

## Try it in a browser

Save this as an `.html` file in the repo root and open it through a local server (browsers block module imports from `file://`). For example, run `npx serve .` and visit the file.

```html
<canvas id="c" width="300" height="200" style="border:1px solid #ccc"></canvas>
<script type="module">
  import { drawPoints } from './zing-plot-plus-plus/src/canvasPoints.js';

  const ctx = document.getElementById('c').getContext('2d');
  const points = [[1, 2], [3, 5], [5, 3], [7, 8], [9, 6]].map((coordinate) => ({ coordinate }));

  ctx.fillStyle = '#3498db';
  drawPoints(ctx, points, (x) => x * 30, (y) => 200 - y * 20, 5);
</script>
```

You should see five blue dots rising from left to right.

## Tests

```bash
cd zing-plot-plus-plus && npm test
```

| Test | Checks |
|---|---|
| draws one circle per point, at its scaled position | Points go in, circles come out at the right pixels |
| draws nothing for zero points | No crash on empty data |

There is no browser in Node, so the tests give `drawPoints` a **fake context**: a small object that records each circle instead of drawing it. CI runs these on every push.

## Progress

| Step | What | Status |
|---|---|---|
| 1 | `drawPoints()` + 2 tests | ✅ [Done](step-1-draw-points.md) |
| 2 | `renderer="canvas"` option on `<scatter-plot>` (off by default) | Next |
| 3 | Color and opacity, one path for all points, same-pixel and batching tests | Planned |
| 4 | Hover and tooltip on canvas | Planned |
| 5 | PNG export includes canvas points | Planned |
| 6 | Sharp on HiDPI screens, screen-reader label, switch the website to canvas | Planned |

## FAQ

**Why Canvas instead of SVG?**
SVG creates one page element per point. At the site's limit of 10,000 rows, that's 10,000 elements and about 1.3 MB of markup, rebuilt on every change. A canvas is a single element no matter how many points it holds. Numbers are in [PLAN.md §4](PLAN.md#4-benchmarks-why-canvas).

**Why not move everything to Canvas?**
Text drawn on a canvas is just pixels: it can't be selected, is harder for screen readers, and needs extra work to stay sharp. Keeping the axes and labels in SVG also keeps the existing label-update code and tests working.

**Why not WebGL?**
It only pays off with hundreds of thousands of points or more, and it's much harder to write and test. See [PLAN.md §2](PLAN.md#2-options-considered).

**Does this look like other charting libraries?**
`beginPath` → `arc` → `fill` is the browser's built-in way to draw a circle, so all canvas libraries have similar lines. Nothing was copied, and the fake-context test helper is hand-written.

**Does this affect the line plot?**
No. `<line-plot>` stays on SVG.

## Adding the next step

1. Keep each push small: one idea, a few tests.
2. Add a `step-N-<name>.md` next to this file, in the same format as [step-1-draw-points.md](step-1-draw-points.md): TL;DR, what changed, tests, effect on other code, what's left for later.
3. Update the **Progress** table here and in [PLAN.md](PLAN.md).
