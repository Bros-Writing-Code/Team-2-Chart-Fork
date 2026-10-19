# Step 2: `<canvas-scatter-plot>` element

> Part of [Canvas Scatter Plot](README.md) ([full plan](PLAN.md)) · Issue #4 "SVG to Canvas"
> Branch: `feat/canvas-draw-points`

## TL;DR

Adds a new, standalone chart element, `<canvas-scatter-plot>`. It looks like `<scatter-plot>`, with the same axes, grid, title and labels, but **draws its points on a `<canvas>`** using `drawPoints()` from step 1.
**No existing file was edited**, so `<scatter-plot>`, `<line-plot>`, the website and the npm package are unchanged.

---

## What changed

| File | Status | What it is |
|---|---|---|
| `zing-plot-plus-plus/src/canvasScatterPlot.js` | **New** | The `<canvas-scatter-plot>` element |
| `zing-plot-plus-plus/tests/canvasScatterPlot.test.js` | **New** | 3 unit tests |
| `zing-plot-plus-plus/tests/canvasScatterPlot.10k.test.js` | **New** | 10,000-point test that also prints speed and size stats |

## How it works

`CanvasScatterPlotElement` **extends `PlotBaseElement`**, the same base class `<scatter-plot>` uses, and overrides three things:

| Method | What it does |
|---|---|
| `applyPlotElements(...)` | Returns `''` (no SVG circles). Saves the layout `generateGraph()` worked out (margins, sizes, `scaleX`, `scaleY`) for the canvas. |
| `renderGraph()` | Calls the base `renderGraph()` (builds the SVG frame), then adds a `<canvas>` the same size as the chart on top of it and calls `drawCanvasPoints`. |
| `drawCanvasPoints(ctx)` | Clips to the plot area (so points outside the range don't draw over the axes, same as the SVG `clip-path`), sets the default blue, and calls `drawPoints`. |

```
<canvas-scatter-plot>  (shadow root)
 ├─ <svg>      axes, grid, ticks, title, labels   ← from PlotBaseElement, unchanged
 ├─ <style>    puts the canvas exactly over the SVG
 └─ <canvas>   the points                          ← new
```

The canvas has `pointer-events: none`, so the mouse passes through it to the SVG underneath.

## Using it

```html
<canvas-scatter-plot id="chart"></canvas-scatter-plot>
<script type="module">
  import './zing-plot-plus-plus/src/canvasScatterPlot.js';

  const points = [[1, 2], [3, 5], [5, 3], [7, 8], [9, 6]].map((coordinate) => ({ coordinate }));
  document.getElementById('chart').setChartProperties(
    { title: 'Canvas Scatter', 'x-axis-label': 'X', 'y-axis-label': 'Y', points },
    500, 400, false, 0, 0, 10, 10, 5,
  );
</script>
```

Same `setChartProperties(...)` call as `<scatter-plot>`. Only the tag name and the import differ.

## The tests

| Test | Checks |
|---|---|
| keeps the SVG axes and labels but has no SVG points | The frame is still built; no `<circle>`s |
| draws each point on the same pixel as `<scatter-plot>` does | Canvas circles match the SVG circles exactly (position and radius) |
| clips the points to the plot area | The clip rectangle is the plot area (80, 32, 400×320 for a 500×400 chart) |

| draws 10,000 points correctly (`canvasScatterPlot.10k.test.js`) | At the website's 10,000-point limit: every point drawn on the same pixel as `<scatter-plot>`, no SVG circles, and much smaller markup. Prints stats; see [README › 10,000-point stats](README.md#10000-point-stats). |

`renderGraph()` itself (creating the canvas in the page) needs a real browser, so it's checked by hand. See below.

Library suite: **24 pass, 0 fail, 0 TODO** (20 before + 4 new).

## Effect on the rest of the code

| Area | Effect |
|---|---|
| `<scatter-plot>`, `<line-plot>` | None |
| `plotBase.js`, `detailedPlots.js` | Not edited. `PlotBaseElement` is only imported and extended. |
| Website, PNG export, npm package | None. The new element isn't imported by `detailedPlots.js`, so it isn't in the package by default. |
| Teammates' branches | New files only, so merging shouldn't conflict |

**One dependency to watch:** if someone changes `generateGraph()`'s parameters or `applyPlotElements`'s signature in `plotBase.js`, this element may break. The tests will catch it.

## Known limits (planned for later steps)

| Not yet | Effect |
|---|---|
| Hover tooltip | Nothing happens on hover (no circles to hover over) |
| PNG export | The website's export copies only the SVG, so points would be missing. The website doesn't use this element yet. |
| Theme color (`--chart-color-theme`) and 0.8 opacity | Points are always solid `#3498db` |
| HiDPI / Retina | Points may look slightly soft on high-resolution screens |
| Title/label attribute changes | Work as in `<scatter-plot>` (inherited) |

## Not verified yet

The tests run in Node. The element hasn't been opened in a real browser as part of this step, because the development sandbox can't run one. Before merging, check it by hand:
1. Put the "Using it" snippet in an `.html` file at the repo root.
2. Run `npx serve .` and open the file.
3. Expect the usual chart frame with five blue dots, the same as `<scatter-plot>` would show.
