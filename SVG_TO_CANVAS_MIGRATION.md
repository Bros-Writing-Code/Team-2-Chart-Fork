# SVG-to-Canvas Migration

## Scope

This project migrated its production scatter-chart rendering from SVG to the HTML Canvas 2D API. The migration introduced a separate `<canvas-scatter-plot>` web component and updated Zing Plot Web to use it for scatter charts.

The migration applies to scatter charts only:

- `<canvas-scatter-plot>` draws the complete scatter chart on Canvas.
- `<scatter-plot>` remains available as the original SVG implementation.
- `<line-plot>` continues to use SVG.

The public chart-data format and the `setChartProperties(...)` call were preserved, so callers can supply the same titles, labels, points, dimensions, ranges, and tick settings to either scatter renderer.

## Why Canvas Was Chosen

The SVG scatter renderer creates one `<circle>` DOM element for every data point. At the website's supported limit of 10,000 points, this produces about 10,000 circle elements and roughly 1.3 MB of SVG markup. Each redraw requires the browser to rebuild and process those elements.

Canvas uses one visible `<canvas>` element regardless of the number of points. Points are issued as drawing commands rather than retained as individual DOM nodes. This makes Canvas a good fit for this project because:

- scatter plots can contain up to 10,000 points;
- zooming, panning, resizing, and data changes redraw the chart repeatedly;
- PNG output is naturally raster-based;
- the project needs no per-point DOM content after custom hover hit-testing is provided;
- Canvas 2D gives the required performance without the additional complexity of WebGL.

The repository's 10,000-point automated check currently reports that SVG generation creates approximately 1,308 KB of markup and 10,000 circle elements. In the same Node test environment, the Canvas drawing calls complete faster and create no point markup. These timings use a recording fake Canvas context, so they verify relative work in the library and guard against regressions; they are not a substitute for browser paint benchmarks.

## Rendering Architecture Before and After

Before the migration, `PlotBaseElement.generateGraph()` generated the chart frame and each scatter point as SVG markup. Every point was represented by a circle, and browser events on those circles powered the tooltip.

The completed Canvas component has this structure:

```text
<canvas-scatter-plot> shadow root
├── <style>
├── <canvas role="img" aria-label="...">
└── <button class="reset-view-control">↺</button>
```

The canvas contains the background, grid, axes, ticks, title, axis labels, and points. The reset control remains a real HTML button so it can receive keyboard focus and expose an accessible name.

Both SVG and Canvas use `computeLayout()` from `src/plotBase.js`. This shared function calculates margins, component sizes, tick values, and the data-to-pixel scale functions. Sharing this calculation prevents the two renderers from drifting apart.

## How the Migration Was Carried Out

### 1. Canvas point drawing was isolated

`src/canvasPoints.js` introduced `drawPoints(ctx, points, scaleX, scaleY, radius)`. It converts every data coordinate with the existing scale functions and draws a filled circle through the Canvas 2D context.

This first step separated the low-level drawing operation from the web component and made it testable without a browser.

### 2. A separate Canvas scatter component was added

`src/canvasScatterPlot.js` introduced `CanvasScatterPlotElement`, registered as `<canvas-scatter-plot>`. It extends `PlotBaseElement`, which preserves the existing setters, viewport behavior, and `setChartProperties(...)` API.

The work initially passed through a hybrid implementation with an SVG frame and Canvas points. It was then changed to the current full-Canvas design, where the entire chart is drawn on one canvas. Keeping a separate custom element allowed the existing SVG scatter and line components to remain operational during and after the migration.

### 3. Layout logic was shared

The calculations that had lived inside SVG generation were extracted into reusable helpers in `src/plotBase.js`:

- `computeLayout()` calculates chart dimensions, scales, and ticks;
- `getTicks()` produces suitable axis values;
- `formatAxisNumber()` formats normal and scientific-notation tick labels;
- `resetButtonLayout()` supplies consistent reset-control placement.

The Canvas renderer consumes these helpers and uses the same positions as the SVG renderer.

### 4. The complete chart was drawn with Canvas 2D

`CanvasScatterPlotElement.drawChart()` now draws the chart in layers:

1. white background;
2. dashed grid lines and tick text;
3. axes;
4. title and axis labels;
5. points clipped to the plot rectangle.

Canvas font sizes, alignments, line widths, colors, point radius, and opacity mirror the SVG styles. The point color is read from the `--chart-color-theme` CSS custom property, with `#3498db` as the fallback.

### 5. High-density displays were handled

The visible canvas keeps the requested CSS width and height, while its backing dimensions are multiplied by `window.devicePixelRatio`. The drawing context is scaled by the same ratio. This keeps chart lines, points, and text sharp on Retina and other high-density displays.

### 6. SVG DOM events were replaced with hit-testing

Canvas pixels are not individual DOM elements, so point hover cannot rely on `<circle>` events. `findPointAt()` in `src/canvasPoints.js` scans the plotted points, compares their scaled pixel positions with the pointer, and returns the closest point inside the allowed distance.

`setupHoverListeners()` converts browser coordinates into chart coordinates, accounts for CSS scaling, calls `findPointAt()`, and updates the existing `<tool-tip-modal>`. If points overlap at the same distance, the later point is selected because it was drawn on top.

The current linear lookup is suitable for the website's 10,000-point limit. A spatial index would be the natural follow-up if the supported data size grows substantially.

### 7. Accessibility was restored around the pixel surface

SVG text and points have DOM representations; Canvas content does not. The Canvas element therefore uses `role="img"` and a generated `aria-label` containing the chart title, axis description, and point count.

The reset action is an overlaid native button with a title and `aria-label`. Chart text rendered inside Canvas remains raster content and cannot be selected or individually navigated by assistive technology.

### 8. PNG export was updated

`CanvasScatterPlotElement.toImageCanvas(width, height)` redraws the chart onto a new canvas at the requested output size. Zing Plot Web's `chartToCanvas()` uses this method when the chart supplies it. The existing SVG-to-image path remains in place for SVG line charts.

This prevents the Canvas points from being omitted during export and lets the Canvas chart be redrawn sharply at the export resolution.

### 9. The website switched its scatter renderer

`zing-plot-web/index.html` loads both the normal chart module and `canvasScatterPlot.js` from package version `1.0.12`. In `zing-plot-web/script.js`, scatter selection now creates `canvas-scatter-plot`, while line selection creates `line-plot`.

The website therefore uses Canvas for scatter charts without removing the library's original SVG components.

### 10. Zoom, pan, and reset behavior was shared

Renderer-independent viewport behavior lives in `PlotBaseElement`. Wheel input updates the visible ranges, pointer dragging pans the viewport, and the reset control restores the initial chart bounds. Because a viewport change calls `renderGraph()`, the Canvas chart is redrawn using the new shared layout.

## Main Files Changed or Added

| File | Migration responsibility |
|---|---|
| `zing-plot-plus-plus/src/canvasPoints.js` | Draws Canvas points and performs hover hit-testing. |
| `zing-plot-plus-plus/src/canvasScatterPlot.js` | Implements the full-Canvas scatter web component, accessibility description, hover behavior, HiDPI drawing, and image export. |
| `zing-plot-plus-plus/src/plotBase.js` | Provides shared layout, tick formatting, viewport, zoom, pan, and reset behavior to both renderers. |
| `zing-plot-plus-plus/tests/canvasPoints.test.js` | Tests point drawing and nearest-point selection. |
| `zing-plot-plus-plus/tests/canvasScatterPlot.test.js` | Compares Canvas positions and styles with SVG output and checks clipping, labels, colors, accessibility, and reset placement. |
| `zing-plot-plus-plus/tests/canvasScatterPlot.10k.test.js` | Checks all 10,000 points and reports markup and drawing statistics. |
| `zing-plot-plus-plus/tests/helpers/fake-canvas.js` | Records Canvas operations so drawing can be verified in Node. |
| `zing-plot-plus-plus/demo/canvas-vs-svg.html` | Provides the side-by-side renderer and performance demo. |
| `zing-plot-web/index.html` | Loads the Canvas component from the published package. |
| `zing-plot-web/script.js` | Uses Canvas for scatter charts and supports Canvas-based PNG export. |

## Verification

The current repository was verified with both automated suites:

```bash
cd zing-plot-plus-plus
npm test

cd ../zing-plot-web
node --test --test-reporter=spec
```

At the time of this scan:

- the library suite passes 42 tests with 0 failures;
- the website and fixture suite passes 71 tests with 0 failures;
- the 10,000-point test confirms that all Canvas points use the same pixel positions as the SVG implementation;
- parity tests compare Canvas grid lines, axes, ticks, titles, labels, fonts, alignment, clipping, theme color, and point placement with SVG output.

For visual verification, serve the repository over HTTP and open `zing-plot-plus-plus/demo/canvas-vs-svg.html`. The demo renders SVG and Canvas versions side by side and offers 1,000, 10,000, and 50,000-point datasets. It should be opened through a local web server because browser module imports are blocked when the page is opened directly from disk.

## Result and Current Limitations

The migration reduced a large scatter chart from thousands of retained SVG point nodes to one Canvas drawing surface while preserving the existing chart-data API, visual layout, hover tooltip, theme color, PNG export, zooming, panning, and reset behavior.

The main tradeoffs are inherent to Canvas: rendered text is not selectable, individual points do not exist in the accessibility tree, and hover requires manual hit-testing. The project addresses these with a chart-level accessible description, a native reset button, and point hit-testing. SVG remains available for the existing scatter component and continues to render line charts where retained vector content is still useful.
