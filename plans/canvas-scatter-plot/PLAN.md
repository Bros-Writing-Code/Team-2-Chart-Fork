# Plan: Scatter Plot Rendering, SVG → Canvas

> Status: **In progress, step 1 of 6.**
> Scope: `<scatter-plot>` in `zing-plot-plus-plus`. `<line-plot>` stays on SVG for now.

## Progress

The plan is delivered in very small pushes. Each one has its own short write-up.

| Step | What | Status | Details |
|---|---|---|---|
| 1 | `drawPoints()` helper + 2 tests (not used by the chart yet) | ✅ Done | [step-1-draw-points.md](step-1-draw-points.md) |
| 2 | `renderer="canvas"` option on `<scatter-plot>` (off by default) | Next | — |
| 3 | Color/opacity, one path for all points, same-pixel and batching tests | Planned | — |
| 4 | Hover lookup + tooltip on canvas | Planned | — |
| 5 | PNG export includes canvas points | Planned | — |
| 6 | HiDPI, screen-reader label, switch the website to canvas | Planned | — |

These replace the coarser steps in [§6](#6-implementation-steps). Tests listed in [§7](#7-test-plan) are added in the step that needs them.

---

## TL;DR

- **Problem.** Today every scatter point is its own SVG `<circle>`, built as one long HTML string and parsed with `innerHTML`. With 10,000 points (the site's row limit) that is **10,000 DOM nodes and ~1.3 MB of markup**, rebuilt from scratch on every change to width, range, anchor or ticks.
- **Proposal.** Use a **hybrid renderer**. The chart frame (axes, grid, tick labels, title) stays in **SVG**, and the points are drawn on one **`<canvas>`** layered over the plot area.
- **Why hybrid and not Canvas for everything?** Text stays sharp, selectable and accessible. The current title/label update code (`attributeChangedCallback`) and most existing tests keep working, and only the part that grows with the data changes.
- **Why not WebGL?** It's only worth it past roughly 100k–1M points. The site caps uploads at 10k, and WebGL would add shader code, lost-context handling and harder testing for a team project. Keep it as a future option.
- **What has to change besides drawing:** hover/tooltip (no per-point elements to listen on), PNG export (it currently serializes the SVG only, so **points would disappear from exports**), HiDPI sharpness, and accessibility.
- **Rollout.** A `renderer="svg|canvas"` attribute, defaulting to `svg` until the canvas path passes the parity tests, then flipping the default to `canvas`.
- **Evidence.** See [§4 Benchmarks](#4-benchmarks-why-canvas). They were run against the library's real `generateGraph()`, and a browser benchmark is included for the team to run.

---

## Table of contents

1. [How the scatter plot works today](#1-how-the-scatter-plot-works-today)
2. [Options considered](#2-options-considered)
3. [Recommendation](#3-recommendation-hybrid-svg-frame--canvas-points)
4. [Benchmarks (why Canvas)](#4-benchmarks-why-canvas)
5. [Design](#5-design)
6. [Implementation steps](#6-implementation-steps)
7. [Test plan](#7-test-plan)
8. [Risks and mitigations](#8-risks-and-mitigations)
9. [Rollout and rollback](#9-rollout-and-rollback)
10. [Open questions for the team](#10-open-questions-for-the-team)

---

## 1. How the scatter plot works today

| Piece | File | What it does |
|---|---|---|
| `PlotBaseElement.generateGraph()` | `zing-plot-plus-plus/src/plotBase.js:228` | Builds the whole chart (background, grid, ticks, axes, title, labels) as **one SVG string**. Computes `margin`, `sizes`, `scaleX`, `scaleY`. |
| `ScatterPlotElement.applyPlotElements()` | `zing-plot-plus-plus/src/detailedPlots.js:7` | Appends one `<circle ... data-x data-y class="point">` per point inside `<g clip-path="url(#plot-clip)">`. |
| `renderGraph()` | `plotBase.js:416` | `shadowDOM.innerHTML = generateGraph(...)`, then `setupHoverListeners()`. Runs on every setter (`Width`, `RangeX`, …). |
| `setupHoverListeners()` | `plotBase.js:434` | Listens for `mouseover` on `<circle>` and reads `data-x`/`data-y` plus `getBoundingClientRect()` to place `#my-tooltip`. |
| `attributeChangedCallback()` | `plotBase.js:392` | Updates `.title-text` / `.label-text` in place without a re-render. |
| PNG export | `zing-plot-web/script.js:338` | Clones the shadow-root `<svg>`, serializes it, draws it onto a canvas, saves a PNG. |
| Tests | `zing-plot-plus-plus/tests/plots.test.js` | Regex over the SVG string (`<circle cx=… cy=…>`), in Node with a tiny DOM stub and **no browser**. |

What this means for performance: the cost of the chart frame stays roughly fixed, but **the points cost O(N) in string building, HTML parsing, DOM nodes, style resolution, layout and paint**, and all of it is paid again on every re-render.

---

## 2. Options considered

Scored for **our** case: scatter plots, at most 10k points on the site, a zero-dependency library, Node-only tests, a student team.

| Option | How points are drawn | Perf at 10k pts | Crisp text / a11y | Hover | Testable in Node | Complexity | Verdict |
|---|---|---|---|---|---|---|---|
| **SVG (today)** | 1 DOM node per point | Slow to build/re-render; heavy DOM | ✅ excellent | ✅ free (DOM events) | ✅ string regex | Low | Fine ≤ ~1k pts |
| **Canvas 2D (everything)** | Immediate-mode pixels | ✅ fast | ⚠️ text is pixels: no selection, needs DPR care, no a11y | Manual hit-test | ⚠️ needs fake ctx | Medium | Breaks label updates and tests |
| **Hybrid: SVG frame + Canvas points** ⭐ | Canvas for points only | ✅ fast | ✅ text stays SVG | Manual hit-test (cheap, §4) | ✅ SVG part unchanged, canvas via fake ctx | Medium | **Recommended** |
| **WebGL (raw or `regl`)** | GPU `gl.POINTS` | ✅✅ fastest at 100k+ | Needs SVG/HTML overlay for text | Manual (or GPU picking) | ❌ hard without a browser | High | Overkill for 10k |
| **WebGPU** | GPU compute/render | ✅✅ | Same as WebGL | Manual | ❌ | Very high, uneven browser support | Not now |
| **OffscreenCanvas + Web Worker** | Canvas drawn off main thread | ✅ keeps UI responsive | Same as Canvas | Manual + messaging | ⚠️ | High | Possible later upgrade of the hybrid |
| **Third-party libs** (Chart.js / uPlot use Canvas; Plotly has `scattergl` on WebGL; ECharts can switch SVG↔Canvas; D3 can target either) | Varies | ✅ | ✅ | ✅ built-in | n/a | Adds a dependency | Out of scope: the project *is* the charting library. Useful as **design references**. |

Takeaway: established libraries converge on the same rule, **SVG for small or highly interactive marks and Canvas/WebGL for many marks**. Several (ECharts, Plotly) offer both renderers because neither wins everywhere. That supports making the renderer a switch rather than a hard rewrite.

---

## 3. Recommendation: hybrid SVG frame + Canvas points

```
<scatter-plot>  (shadow root)
 └─ div.zpp-stack            position: relative; width/height = chart size
     ├─ <svg>                axes, grid, ticks, title, labels   (unchanged)
     └─ <canvas>             absolutely positioned over the plot area only,
                             draws all points; receives mouse events
```

Why this shape:

1. **Smallest blast radius.** `generateGraph()` keeps returning the SVG frame. Only `applyPlotElements()` for scatter changes, from "return circles" to "return nothing; draw on canvas".
2. **Text stays SVG**, so `attributeChangedCallback` (title/label live updates), selectable text, and the tick/label tests keep working.
3. **The canvas covers only the plot rect**, so clipping is just the canvas edge and there's no need for `clip-path`.
4. **Same math.** The canvas uses the exact `scaleX`/`scaleY` closures from `generateGraph()`, so points land on the same pixels as the SVG version. That's what lets us write a parity test.

---

## 4. Benchmarks (why Canvas)

### 4a. Measured in Node against the real library code

`bench/node-bench.mjs` imports `src/detailedPlots.js` and calls the real `generateGraph()` for a scatter plot (500×500, random points, median of 7 runs). It also times the hover lookup the canvas version will need. Node 24, macOS, run on 2026‑10‑16.

| Points | SVG string build (ms) | SVG markup size | `<circle>` DOM nodes | Canvas hover, brute force (1000 lookups) | Canvas hover, grid index (1000 lookups) | Grid build |
|---:|---:|---:|---:|---:|---:|---:|
| 100 | 0.7 | 18 KB | 100 | 6.0 ms | 1.4 ms | 0.05 ms |
| 1,000 | 1.3 | 133 KB | 1,000 | 28.6 ms | 2.3 ms | 0.09 ms |
| **10,000 (site max)** | **11.7** | **1.29 MB** | **10,000** | 43.6 ms | **0.8 ms** | 0.44 ms |
| 50,000 | 48.3 | 6.4 MB | 50,000 | 93.1 ms | 3.5 ms | 2.1 ms |
| 100,000 | 94.8 | 12.8 MB | 100,000 | 186.1 ms | 17.0 ms | 4.3 ms |

How to read it:

- **The string build is only the first step of the SVG cost.** After it, the browser still has to parse 1.3 MB of HTML, create 10k elements, resolve CSS for each, lay out and paint them. That happens on every `Width`/`RangeX`/`Ticks` change. The canvas version builds no string and creates no nodes.
- **Markup size grows linearly at about 130 bytes per point.** That's also memory held by the DOM for as long as the chart is on the page.
- **Hover on canvas is cheap.** Even the naive scan is ~0.04 ms per mouse move at 10k points, well inside one 16 ms frame. With a uniform grid index (rebuilt in under 0.5 ms per render) it's under 0.001 ms. Losing DOM events is therefore **not** a performance concern.

Re-run: `node plans/canvas-scatter-plot/bench/node-bench.mjs`

Re-run on 2026‑10‑17 after merging `main` (PR #9, label escaping and the zero-range fix): same results within run-to-run noise. At 10,000 points: 11.2 ms SVG build, 1.29 MB markup, 44 ms for 1000 brute-force lookups.

### 4b. In-browser benchmark (to run)

`bench/browser-bench.html` renders the same data three ways in a real browser and forces each renderer to finish before stopping the timer:

| Renderer | What's timed |
|---|---|
| SVG | build string as the library does + `innerHTML` + forced layout (*paint not included, which favours SVG*) |
| Canvas 2D | one path of `arc()`s + `fill()` + `getImageData` flush |
| WebGL | buffer upload + `gl.POINTS` + `readPixels` flush |

It also times 1000 hover lookups with `elementFromPoint` (SVG) vs brute-force and grid lookups (canvas).

I couldn't run it here because headless Chrome is blocked by this environment's sandbox. To run it:

```bash
# Option A: open in any browser and read the JSON at the bottom of the page
open plans/canvas-scatter-plot/bench/browser-bench.html

# Option B: headless Chrome, prints the JSON
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
  --dump-dom "file://$PWD/plans/canvas-scatter-plot/bench/browser-bench.html" | grep -o 'RESULTS.*END'
```

Paste the results here:

| Points | SVG (ms) | Canvas 2D (ms) | WebGL (ms) | SVG nodes |
|---:|---:|---:|---:|---:|
| 100 | _tbd_ | _tbd_ | _tbd_ | _tbd_ |
| 1,000 | _tbd_ | _tbd_ | _tbd_ | _tbd_ |
| 10,000 | _tbd_ | _tbd_ | _tbd_ | _tbd_ |
| 50,000 | _tbd_ | _tbd_ | _tbd_ | _tbd_ |
| 100,000 | _tbd_ | _tbd_ | _tbd_ | _tbd_ |

**Hypothesis to confirm or reject:** at ≤ 1k points all three are "instant" (< 16 ms) and SVG is fine. At 10k, Canvas should be several times faster than SVG. WebGL only clearly beats Canvas 2D well past 10k. If the numbers come back otherwise (for example Canvas is *not* meaningfully faster at 10k), **stop and reconsider before building §6.**

### 4c. Qualitative comparison (scatter-specific)

| Concern | SVG | Canvas 2D | WebGL |
|---|---|---|---|
| Cost per extra point | DOM node + style + layout | A few path ops | A few bytes in a GPU buffer |
| Overlapping points / alpha | Fine | Fine (`globalAlpha`) | Fine (blending) |
| Zoom/pan (future) | Re-render all nodes | Redraw in one call | Change a uniform (cheapest) |
| Per-point styling (size/color by value) | Easy (attributes) | Easy (`fillStyle` per batch) | Shader attributes |
| Hover/tooltip | Built-in events | Hit-test (cheap, §4a) | Hit-test or GPU picking |
| Export to PNG | Serialize → rasterize | `toBlob()` directly | `toBlob()` (needs `preserveDrawingBuffer`) |
| Export to vector (SVG/PDF) | ✅ native | ❌ raster only | ❌ raster only |
| Screen readers | Per-element (not used today) | Needs fallback text | Needs fallback text |
| HiDPI sharpness | Automatic | Must scale by `devicePixelRatio` | Must scale by `devicePixelRatio` |

---

## 5. Design

### 5.1 Public API (backwards compatible)

```html
<scatter-plot renderer="canvas" ...></scatter-plot>   <!-- new, opt-in -->
<scatter-plot ...></scatter-plot>                     <!-- unchanged: svg -->
```

- `renderer` attribute / `Renderer` setter: `"svg"` (default in phase 1) or `"canvas"`.
- `setChartProperties(...)` signature **unchanged**.
- No new dependencies.

### 5.2 Code shape (pseudo-structure, not final code)

| Unit | Responsibility | Testable in Node? |
|---|---|---|
| `generateGraph()` | Unchanged. Still returns the SVG frame string. With `renderer=canvas`, scatter's `applyPlotElements` returns `''`. | ✅ (existing tests) |
| **`computeLayout(width, height, center, anchorX, anchorY, rangeX, rangeY)`** | Extracts the `margin`/`sizes`/`scaleX`/`scaleY` math out of `generateGraph()` so SVG and Canvas share **one** source of truth. | ✅ pure |
| **`drawPoints(ctx, points, layout, style)`** | Draws all points: clear, `globalAlpha=0.8`, one `beginPath`, `moveTo`+`arc` per point, one `fill` (+ optional `stroke`). Skips non-finite coordinates. | ✅ with a recording fake ctx |
| **`buildHitIndex(points, layout)` / `findNearest(index, mx, my, radius)`** | Uniform grid, about 16 px cells, nearest point within radius. | ✅ pure |
| `renderGraph()` | Sets SVG frame, then (canvas mode) creates/reuses `<canvas>`, sizes it for DPR, calls `drawPoints`, rebuilds hit index. | Browser only |
| `setupHoverListeners()` | Split per renderer: SVG keeps `mouseover` on `<circle>`; canvas uses `mousemove` (rAF-throttled) + `findNearest` → same `#my-tooltip` attributes. | Logic ✅, wiring browser |

### 5.3 Details that are easy to get wrong

1. **HiDPI.** Set `canvas.width = plotWidth * dpr`, `canvas.style.width = plotWidth + 'px'`, then `ctx.setTransform(dpr,0,0,dpr,0,0)`. Otherwise points look blurry on Retina.
2. **Coordinate offset.** The canvas sits at `(margin.left, margin.top)`, so draw at `scaleX(x) - margin.left`, `scaleY(y) - margin.top`.
3. **Theme color.** The SVG uses `var(--chart-color-theme, #3498db)`. Canvas can't read CSS variables directly, so use `getComputedStyle(this).getPropertyValue('--chart-color-theme').trim() || '#3498db'`, read once per render.
4. **Stroke and opacity parity.** Today it's fill + stroke, same color, `opacity: 0.8`, stroke width `max(axisStroke/2, 0.5)`. Match this, or deliberately simplify and note it.
5. **Clipping.** The canvas edge is the clip. Points partly outside are cut exactly like today's `clip-path`.
6. **NaN and Infinity.** `arc()` with NaN silently draws nothing (SVG drew an invalid circle). Filter explicitly so behaviour is defined. BUG‑04 (zero range → NaN) is fixed on `main` (PR #9 treats a zero range as 1), so this only covers bad input data.
7. **Tooltip position.** Today it uses the circle's `getBoundingClientRect()`. Canvas mode uses `canvas.getBoundingClientRect()` + the point's pixel offset + scroll. Keep the same `window.__followRaf` / `__tooltipTimeout` handshake with `<tool-tip-modal>`.
8. **Event listener leaks.** `renderGraph()` replaces `innerHTML` each time. In canvas mode, attach listeners once to a persistent canvas (or use an `AbortController`) so re-renders don't stack duplicate handlers.
9. **PNG export (`zing-plot-web/script.js:338`).** It currently clones only the `<svg>`, so **canvas points would be missing from the PNG**. Fix: rasterize the SVG as today, then `drawImage(pointsCanvas, margin.left*scale, margin.top*scale, ...)` onto the same export canvas. Better still, add a library method `chart.toBlob()` so the site doesn't need to know the internals.
10. **Accessibility.** Give the canvas `role="img"` and an `aria-label` like `"Scatter plot, 1,234 points, X from 0 to 10, Y from 0 to 10"`. Optional: a visually hidden data table.
11. **`<line-plot>` uses the same base class.** Keep its SVG path and invisible hover circles unchanged. The renderer switch should be scatter-only for now.

---

## 6. Implementation steps

Each step is one small PR with its own tests, so CI stays green the whole way.

| # | Step | Done when |
|---|---|---|
| 0 | Run `bench/browser-bench.html` and fill the §4b table. **Go/no-go.** | Team agrees the numbers justify the change |
| 1 | Extract `computeLayout()` from `generateGraph()` (pure refactor). | All existing tests pass unchanged |
| 2 | Add `drawPoints(ctx, …)` + recording fake ctx in `tests/helpers/`. | Unit + parity tests (§7.1) pass |
| 3 | Add `buildHitIndex` / `findNearest`. | Hit-test unit tests pass |
| 4 | Add `renderer` attribute; canvas layer in `renderGraph()`; DPR; theme color; a11y label. | Manual check in `demo/demo.html` with both renderers side by side |
| 5 | Canvas hover → existing tooltip. | Manual checklist (§7.4) passes |
| 6 | Fix PNG export to composite canvas (or add `toBlob()`). | Exported PNG contains points; checked against a 10k-row fixture |
| 7 | Use `renderer="canvas"` in `zing-plot-web` for scatter. | QA fixtures (`max-rows-10000.csv` etc.) render correctly |
| 8 | Update root `README.md` (new attribute), `qa/TEST_PLAN.md`, bump version (minor). | Docs merged |
| 9 | After one release with no regressions: flip default to `canvas`. | See §9 |

---

## 7. Test plan

All automated tests use the existing setup: Node's built-in `node:test`, **no new dependencies**, run by `.github/workflows/test.yml`.

### 7.1 Unit tests (`zing-plot-plus-plus/tests/canvas.test.js`, new)

Uses a **recording fake context**: an object whose methods (`arc`, `fill`, `moveTo`, `setTransform`, …) push `{op, args}` into an array. This is the canvas equivalent of the regex helpers we already use for SVG.

| Test | Asserts |
|---|---|
| draws one arc per point | `arc` call count === `points.length` |
| **SVG ↔ Canvas parity** ⭐ | For the same input, every `arc(x, y, r)` + canvas offset equals the `cx, cy, r` of the corresponding SVG `<circle>` (reuse `circles()` from `plots.test.js`). This guarantees the move to canvas doesn't move any point. |
| maps domain corners to plot corners | (0,0) → bottom-left, (10,10) → top-right of plot rect (mirrors existing SVG test) |
| centerOrigin | anchor lands at canvas centre |
| zero points | no `arc`, still clears the canvas, no throw |
| batches into one path | exactly one `beginPath` and one `fill` per render (performance guard) |
| non-finite coordinates skipped | `NaN`/`Infinity` points produce no `arc` and no throw |
| HiDPI | with `dpr = 2`: `setTransform(2,0,0,2,0,0)` called, backing size = 2× CSS size |
| theme colour fallback | no CSS var → `#3498db`; with var → that colour |
| `computeLayout` matches old inline math | margins/plot size for 500×400 equal the `PLOT` constants already in `plots.test.js` |

### 7.2 Hit-testing tests

| Test | Asserts |
|---|---|
| exact hit | mouse at a point's pixel → returns that point |
| within radius / outside radius | `r-0.1` hits, `r+0.1` misses |
| nearest wins | two overlapping points → closest returned |
| grid cell boundaries | point just across a cell edge is still found |
| grid ≡ brute force | 1,000 random queries on 10k random points give identical results |
| empty data | returns `null` |

### 7.3 Existing tests

- `plots.test.js` scatter tests keep running against `renderer="svg"` (still supported).
- `line-plot` and chart-base tests: **must pass unchanged**.
- `zing-plot-web` parsing/fixture tests: unaffected (parsing doesn't touch rendering).
- BUG-02/03/04 were fixed in PR #9, so their tests are now normal tests and must keep passing.

### 7.4 Manual browser checklist (`demo/demo.html` and the site)

- [ ] Points visually identical between `svg` and `canvas` modes (screenshot side by side)
- [ ] Sharp on a Retina/HiDPI display and after browser zoom 200%
- [ ] Tooltip appears on hover, shows right X/Y, follows, hides after leaving
- [ ] Changing `Width`, `RangeX`, `Ticks`, `CenterOrigin` redraws correctly; no duplicate tooltips (listener leak)
- [ ] Changing title/labels via attributes updates without redraw
- [ ] `--chart-color-theme` CSS variable is respected
- [ ] PNG export contains the points
- [ ] `qa/fixtures/max-rows-10000.csv` renders and stays responsive while hovering
- [ ] Points at the plot edge are clipped exactly like before
- [ ] Screen reader announces the `aria-label`

### 7.5 Performance regression guard

- Keep `bench/node-bench.mjs` and `bench/browser-bench.html` in the repo.
- Optional CI check (Node): `drawPoints` on 10k points with the fake ctx stays under a generous budget (e.g. 50 ms). That catches an accidental O(N²) or per-point `beginPath/fill`.

---

## 8. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Exported PNGs lose points | **High** if forgotten | High | Step 6 is mandatory before step 7; checklist item |
| Blurry points on HiDPI | Medium | Medium | DPR scaling + unit test |
| Hover feels different (radius/precision) | Medium | Low | Use the same radius as `pointRadius`, maybe +2 px for easier targeting |
| Duplicate listeners after re-render | Medium | Medium | Persistent canvas / `AbortController`; checklist item |
| Pixel misalignment vs SVG | Low | Medium | Shared `computeLayout` + parity test |
| Loss of vector export / per-point DOM | Certain (by design) | Low | Keep `renderer="svg"` available for users who need it |
| Benchmarks show no real gain | Low | High | Step 0 go/no-go gate |

---

## 9. Rollout and rollback

1. **Release N (minor):** `renderer` attribute added, default `svg`. Site opts into `canvas` for scatter.
2. **Release N+1:** if no regressions, default becomes `canvas` for `<scatter-plot>`. Document `renderer="svg"` as the way to keep vector output.
3. **Rollback:** a one-line revert of the default, or set `renderer="svg"` on the site. No data or API migration involved.

---

## 10. Open questions for the team

1. Should the default switch to canvas automatically above some point count (e.g. `> 2,000`) instead of a global default? ECharts and Plotly take this kind of "pick by size" approach.
2. Do we want a public `toBlob()` / `toDataURL()` on the element so the site stops reaching into `shadowRoot`?
3. Is per-point color/size (e.g. a third data column) on the roadmap? It favours designing `drawPoints` around batches by style now.
4. Should `<line-plot>` follow later (one canvas `stroke()` for the line), or stay SVG?
5. Is zoom/pan planned? If so, it strengthens the case for canvas (and eventually WebGL).

---

### Files in this folder

| File | Purpose |
|---|---|
| `README.md` | Quick reference for the canvas scatter plot (start here) |
| `PLAN.md` | This plan |
| `step-1-draw-points.md` | What step 1 changed, its tests, and what was left for later |
| `bench/node-bench.mjs` | Measures the real library's SVG build cost + canvas hit-test cost (Node, no deps) |
| `bench/browser-bench.html` | SVG vs Canvas 2D vs WebGL render + hover timing in a real browser |
