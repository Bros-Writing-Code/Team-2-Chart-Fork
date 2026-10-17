# Step 3: Whole scatter chart on canvas

> Part of [Canvas Scatter Plot](README.md) ([full plan](PLAN.md)) · Issue #4 "SVG to Canvas"
> Branch: `feat/canvas-draw-points`

## TL;DR

`<canvas-scatter-plot>` now draws the **whole chart on one `<canvas>`**: background, grid, axes, tick numbers, title, axis labels and points. It uses **no SVG at all**.
It also gains a **hover tooltip**, **PNG export**, the **theme color**, **sharp drawing on HiDPI screens** and a **screen-reader label**. The **website now uses it for scatter charts**.

`<scatter-plot>` and `<line-plot>` are still SVG and are unchanged.

**Why:** the team lead asked for the scatter chart to be fully canvas, instead of the hybrid (SVG frame + canvas points) from steps 1–2. This replaces the old steps 3–6 in one go.

---

## What changed

Four commits:

| Commit | What |
|---|---|
| 3a | `plotBase.js`: the layout math moved out of `generateGraph()` into exported helpers: `computeLayout()`, `getTicks()`, `formatAxisNumber()`. **The SVG output is byte-for-byte unchanged** (checked against the old code, and all old tests pass). |
| 3b | `canvasScatterPlot.js` draws the whole chart on a canvas. New fake-canvas test helper and new tests. |
| 3c | `canvasPoints.js` gains `findPointAt()`, and the canvas chart uses it for the hover tooltip. |
| 3d | Website: scatter uses `<canvas-scatter-plot>`, PNG export supports canvas, library version bumped to **1.0.11**. Docs. |

| File | Status |
|---|---|
| `zing-plot-plus-plus/src/plotBase.js` | Edited: helpers extracted, no behavior change |
| `zing-plot-plus-plus/src/canvasScatterPlot.js` | Rewritten |
| `zing-plot-plus-plus/src/canvasPoints.js` | `findPointAt()` added |
| `zing-plot-plus-plus/tests/helpers/fake-canvas.js` | **New**: records lines, text, circles and styles |
| `zing-plot-plus-plus/tests/canvasScatterPlot.test.js` | Rewritten: 10 tests |
| `zing-plot-plus-plus/tests/canvasScatterPlot.10k.test.js` | Updated for the new drawing code |
| `zing-plot-plus-plus/tests/canvasPoints.test.js` | 4 `findPointAt` tests added |
| `zing-plot-plus-plus/package.json` | Version `1.0.10` → `1.0.11` |
| `zing-plot-web/index.html` | Loads `@1.0.11`, plus `canvasScatterPlot.js` |
| `zing-plot-web/script.js` | Scatter → `<canvas-scatter-plot>`. PNG export split into `chartToCanvas()`. |

## How it works

```
<canvas-scatter-plot>  (shadow root)
 ├─ <style>
 └─ <canvas role="img" aria-label="Sales. Scatter plot of Month vs Units, 6 points">
        everything: background, grid, axes, ticks, title, labels, points
```

| Method | What it does |
|---|---|
| `renderGraph()` | Calls `computeLayout()` (the same layout `<scatter-plot>` uses), makes a canvas at the screen's pixel density, and calls `drawChart()`. |
| `drawChart(ctx, data, layout, w, h, color)` | Draws everything. Colors, fonts, line widths and positions copy the SVG styles in `generateGraph()`. |
| `setupHoverListeners()` | On `mousemove`, `findPointAt()` finds the nearest point and fills in `<tool-tip-modal id="my-tooltip">`, the same way the SVG chart does. Converts for CSS scaling, because the website shrinks the app with `transform: scale(0.6)`. |
| `toImageCanvas(w, h)` | Draws the chart fresh at any size, for PNG export. |
| `attributeChangedCallback` | Changing `title`, `x-axis-label` or `y-axis-label` redraws the chart. |
| `connectedCallback` | Redraws once the chart is on the page, so the `--chart-color-theme` CSS variable can be read. |

**Points:** in SVG each point is a circle with a thin outline in the same color, faded to 0.8 as a whole. On canvas that looks identical to one filled circle that is half an outline width larger, at 0.8 opacity, so that's what `drawChart()` draws (`pointDrawRadius()`).

**Text:** canvas draws text as-is, so `R&D <2026>` shows exactly like that. It doesn't need HTML escaping.

## Tests

Library suite: **35 pass, 0 fail** (24 before). Website suite: unchanged, **52 pass + 9 TODO**.

The fake canvas records what would be drawn. The tests compare it with the SVG that `<scatter-plot>` builds for the same data:

| Test | Checks |
|---|---|
| draws each point on the same pixel as `<scatter-plot>` | Point positions match the SVG `<circle>`s |
| draws the grid lines and axes where the SVG has them | Every `<line>`: position and color |
| draws the tick numbers, title and labels where the SVG has them | Every `<text>`: content and position |
| uses the same fonts and text alignment as the SVG styles | Font sizes and weights; y ticks right-aligned |
| shows title and labels exactly as given, without HTML escaping | `R&D <2026>` and `Tom's` |
| uses the theme color at 0.8 opacity | Color passed in, alpha 0.8 |
| draws points slightly larger, to cover the SVG circle outline | Radius is `pointDrawRadius()` |
| clips the points to the plot area | Clip is 80, 32, 400×320 for a 500×400 chart |
| fills a white background and still draws the frame with no points | Empty data |
| describes the chart in words for screen readers | `aria-label` text |
| `findPointAt` × 4 | Exact hit, closest of several, ties go to the top point, nothing in range |
| 10,000 points | All drawn on the same pixels as `<scatter-plot>` |

10k stats from one run: SVG build 16.2 ms and 1,307 KB of markup, vs. canvas draw calls 4.1 ms with no markup.

## Effect on the rest of the code

| Area | Effect |
|---|---|
| `<scatter-plot>`, `<line-plot>` | No visible change. Their layout now comes from `computeLayout()`, with byte-identical output. |
| Website | Scatter charts are canvas. Line charts are still SVG. PNG export works for both. |
| **Live website** | Loads the library from npm at `@1.0.11`. **The site switches to canvas only once 1.0.11 is published**, which the existing workflow does when this reaches `main`. Until then the CDN link 404s, so **merge to `main` before relying on the deployed site**. |
| Branch `fix/chart-base` | Touches the same lines in `plotBase.js`, so expect a small merge conflict. **Also:** it HTML-escapes the title and labels when they're set (`&` → `&amp;`). That's right for SVG but wrong for canvas, which would show `R&amp;D`. The escaping should stay in the SVG output only (`escapeXML()` in `generateGraph()` already does this on `main`). |

## How to check it in a browser

Opening files directly won't work, because browsers block module imports from disk. From the repo root:

```bash
python3 -m http.server 8000    # or: npx serve .
```

1. **Demo:** open `http://localhost:8000/zing-plot-plus-plus/demo/canvas-vs-svg.html`. The two charts should look the same. Hover a canvas point to see the tooltip.
2. **Website with the local library:** the site loads the library from npm, so it uses the new code only after 1.0.11 is published. To check it before then, temporarily change the two `@1.0.11` script tags in `zing-plot-web/index.html` to `../zing-plot-plus-plus/src/...`, open `http://localhost:8000/zing-plot-web/`, and **undo that before committing**.

What to look for: the scatter chart matches the old one, hover shows X/Y, **Save PNG** includes the points, and text is sharp on a Retina screen.

## Known limits

| Limit | Notes |
|---|---|
| Chart text can't be selected or copied | It's pixels. The `aria-label` gives screen readers a summary, but not each value. |
| Hover checks every point | Fine at 10,000 points (well under a millisecond). Zooming with far more points (#3) may need a spatial index. |
| `<line-plot>` is still SVG | Out of scope for this step, by team decision. |
| Not checked in a real browser by Claude | The sandbox blocks local servers. Run the check above before merging. |
