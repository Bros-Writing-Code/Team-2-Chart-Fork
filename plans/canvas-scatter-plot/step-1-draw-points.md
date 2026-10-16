# Step 1: `drawPoints` (canvas scatter helper)

> Part of [Canvas Scatter Plot](README.md) ([full plan](PLAN.md)) · Issue #4 "SVG to Canvas"
> Branch: `feat/canvas-draw-points`

## TL;DR

Adds one small function, `drawPoints()`, that draws scatter points onto an HTML `<canvas>`, plus two tests.
**Nothing uses it yet**, so the charts, the website and the npm package behave exactly as before.

---

## What changed

| File | Status | What it is |
|---|---|---|
| `zing-plot-plus-plus/src/canvasPoints.js` | **New** | `drawPoints(ctx, points, scaleX, scaleY, radius)` |
| `zing-plot-plus-plus/tests/canvasPoints.test.js` | **New** | 2 unit tests using a hand-written fake canvas |

No existing file was edited.

## How `drawPoints` works

```js
drawPoints(ctx, points, scaleX, scaleY, radius)
```

| Parameter | Meaning | Where it will come from later |
|---|---|---|
| `ctx` | A canvas 2D context (`canvas.getContext('2d')`) | The `<canvas>` added in step 2 |
| `points` | `[{ coordinate: [x, y] }, ...]`, the same format the chart already uses | `chartData.points` |
| `scaleX`, `scaleY` | Turn a data value into a pixel position | Already computed in `generateGraph()` |
| `radius` | Circle size in pixels | `sizes.pointRadius` in `generateGraph()` |

For each point it starts a path, adds a circle at `(scaleX(x), scaleY(y))`, and fills it.
That's the standard way to draw a circle with the browser's Canvas 2D API.

## The tests

Canvas doesn't exist in Node, so the tests pass in a **fake context**: a plain object that writes down each circle instead of drawing it.

| Test | Checks |
|---|---|
| draws one circle per point, at its scaled position | 2 points in, 2 circles out, at the scaled coordinates with the given radius |
| draws nothing for zero points | An empty list draws no circles and doesn't crash |

Run them: `cd zing-plot-plus-plus && npm test` (CI runs this on every push).

## Effect on the rest of the code

| Area | Effect |
|---|---|
| `<scatter-plot>` / `<line-plot>` | None. They still render with SVG. |
| Tooltip, PNG export, website | None |
| npm package API | None. `drawPoints` isn't exported from `detailedPlots.js`. |
| Open bug-fix work (#2, branch `fix/chart-base`) | No conflict. `plotBase.js` isn't touched. |
| Existing tests | Unchanged: 16 pass, 3 known-bug TODOs (BUG-02/03/04) |

## Deliberately left out (planned for later pushes)

Kept out to make this step as small as possible:

| Not yet | Why it matters | Planned for |
|---|---|---|
| Color and 0.8 opacity | Points are drawn in the canvas default (black) | When the canvas is wired into `<scatter-plot>` |
| One path for all points | Faster with thousands of points | Right after the canvas appears on screen |
| Skipping `NaN`/`Infinity` points | Defined behaviour for bad data (today the canvas silently ignores them) | Hover/validation work |
| Test: same pixels as the SVG version | Proves the move to canvas doesn't shift any point | When wiring into `generateGraph()` |
| Test: single path/fill | Guards the performance fix | With "one path for all points" |

## Note on similarity to other libraries

`beginPath` → `arc` → `fill` is the browser's built-in way to draw a circle, so every canvas charting library (Chart.js, uPlot, D3 canvas examples) has similar lines. No library code was copied. The fake-context test idea is a common pattern (the `jest-canvas-mock` package does it on a large scale). Ours is a few hand-written lines with no dependency.

## Next step

**Step 2:** add a `renderer="canvas"` option to `<scatter-plot>` that layers a `<canvas>` over the plot area and calls `drawPoints`. Off by default, so nothing changes unless it's switched on.
