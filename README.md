**ZING PLOT PLUS PLUS**

A simple lightweight charting library for scientific data visualization on the web.

Developers: Brian, Gage, Jessie, Charlie, David, Nathan, Kai and Jooahn

> 🗺️ **Looking for something?** [`DOCS_LEGEND.md`](DOCS_LEGEND.md) lists every document in this repo and which one covers each topic.

# ✨ Available Features:

- Ability to plot the following chart types:
  - Scatter plots (SVG `<scatter-plot>`, or Canvas `<canvas-scatter-plot>` for large data, see *Example 3* below)
  - Line plots
- Interactive features for exploring data points (zoom, pan, reset, and hover tooltips, see *Interacting with a chart* below)
- Support for customizing chart appearance and styling
- Ability to import data from various sources (CSV, JSON, manual entries)
- Ability to export charts as images

# 🚀 Getting Started

## 📥 Installation

There are multiple ways to install the Zing Plot Plus Plus library for your project.

Choose the installation method that works best for your needs.

### 🌐 Using a CDN

You can include the library directly in your HTML using a CDN:

```html
    <script src="https://cdn.jsdelivr.net/npm/bros-zing-plot-plus-plus@latest/src/detailedPlots.js" type="module" defer></script>
```

> [!NOTE]
> `detailedPlots.js` (the package's `main` file) registers `<scatter-plot>`, `<line-plot>` and `<tool-tip-modal>`. It does **not** load `<canvas-scatter-plot>`. To use the Canvas chart, also load `src/canvasScatterPlot.js` the same way (see *Example 3* below). The same applies to every install method below.
>
> `@latest` always fetches the newest published version. The Zing-Plot-Web site pins an exact version instead (for example `@1.0.12`), so a library change only reaches the site once that number is bumped.

### 📦 Using npm

Install via npm with a single command:

```bash
npm install bros-zing-plot-plus-plus
```

Then import the library in your HTML:

```html
<script type="module" src="node_modules/bros-zing-plot-plus-plus/src/detailedPlots.js"></script>
```

### 📚 Using Bun

If you prefer Bun as your package manager:

```bash
bun add bros-zing-plot-plus-plus
```

The import process is then the same as npm.

### 🦀 Using Deno

If you prefer Deno as your runtime:

```bash
deno add bros-zing-plot-plus-plus
```

The import process is then the same as npm.

### 🌐 Direct Import from Source

Clone or download the repository and import directly in your HTML:

```html
<script type="module" src="path/to/zing-plot-plus-plus/src/detailedPlots.js"></script>
```

## 📚 Usage Examples

### 📊 Example 1: Basic Scatter Plot

#### 🖥️ Adding Directly using HTML 

Add the following components to your HTML:

```html
<scatter-plot id="my-scatter-plot" title="My Chart" x-axis-label="X" y-axis-label="Y"></scatter-plot>
```

#### ⚙️ Adding the element dynamically using JavaScript

You can also create the element dynamically in your JavaScript code:

```javascript
const scatterPlot = document.createElement('scatter-plot');
scatterPlot.id = 'my-scatter-plot';
scatterPlot.setAttribute('title', 'My Chart');
scatterPlot.setAttribute('x-axis-label', 'X');
scatterPlot.setAttribute('y-axis-label', 'Y');
document.body.appendChild(scatterPlot);
```

#### 📝 Adding data or attributes to the scatter plot

You can add data or alter the attributes of the scatter plot in the same way as adding data to the line plot.

> [!NOTE] 
> You must have the attributes defined by the `setChartProperties` method or the graph will not render.
>
> In practice this means: the `title`, `x-axis-label` and `y-axis-label` HTML attributes on their own **draw nothing**. A chart is only drawn once it has a width, height, ranges, anchors, ticks and a `points` array, which `setChartProperties(...)` sets all at once. Attribute changes made before that first draw are ignored, and `setChartProperties` uses the title and labels from its `chartData` argument, not the HTML attributes.
>
> Side effect to know about: `title` is also a standard HTML attribute, so the browser shows its text as a native hover tooltip over the whole chart.

```javascript
const scatterPlot = document.getElementById('my-scatter-plot');

// You can either set each attribute individually or pass an object with all the properties.

// Setting attributes individually
scatterPlot.setAttribute('title', 'My Updated Chart');
scatterPlot.setAttribute('x-axis-label', 'Updated X');
scatterPlot.setAttribute('y-axis-label', 'Updated Y');
...

// or
scatterPlot.Title = 'My Updated Chart';
scatterPlot.XAxisLabel = 'Updated X';
scatterPlot.YAxisLabel = 'Updated Y';
...

// Setting attributes all at once (RECOMMENDED)
const chartProperties = {
  title: 'My Updated Chart',
  'x-axis-label': 'Updated X',
  'y-axis-label': 'Updated Y',
  points: [
    {
        coordinate: [1, 2]
    },
    {
        coordinate: [2, 4]
    },
    {
        coordinate: [3, 6]
    }
  ]
};
const width = 500;
const height = 500;
const numbersAreCenteredAtOrigin = true;
const anchorX = 0;
const anchorY = 0;
const rangeX = 10;
const rangeY = 10;
const ticks = 10;
scatterPlot.setChartProperties(chartProperties, width, height, numbersAreCenteredAtOrigin, anchorX, anchorY, rangeX, rangeY, ticks);
```

The chart will automatically redraw to reflect the new data.

#### 📐 What the `setChartProperties` arguments mean

| Argument | Meaning |
|---|---|
| `chartData` | `{ title, 'x-axis-label', 'y-axis-label', points }`. Each point is `{ coordinate: [x, y] }`. A missing title or label is drawn as empty text. |
| `width`, `height` | Chart size in pixels. Margins, fonts and point size are all scaled from the smaller of the two. |
| `centerOrigin` | `true`: the anchor is the **center** of the chart, so the visible X values run from `anchorX - rangeX/2` to `anchorX + rangeX/2`. Anything else: the anchor is the **bottom-left corner**, so X runs from `anchorX` to `anchorX + rangeX`. Only the boolean `true` counts as centered; an object such as `{ x: 250, y: 250 }` (used in `demo/demo-script.js`) behaves like `false`. |
| `anchorX`, `anchorY` | The data value at the center or bottom-left corner (see `centerOrigin`). |
| `rangeX`, `rangeY` | How many data units each axis shows. `0` is treated as `1` so a single point still draws. A **negative** range is invalid: SVG charts draw nothing, and `<canvas-scatter-plot>` draws an empty frame. |
| `ticks` | **Roughly** how many tick numbers per axis. Ticks are rounded to "nice" steps (1, 2 or 5 × a power of 10), so you may get a few more or fewer than you asked for. |

With the example values above (`true, 0, 0, 10, 10`), the visible area is -5 to 5 on both axes, so the point `[3, 6]` falls outside it and is clipped. Use `false` (bottom-left anchor) to show 0 to 10 instead.

Points outside the visible range are not an error: they are clipped at the edge of the plot area. Values that aren't finite numbers are not checked by the library. The Zing-Plot-Web website validates its input before calling the library.

#### 🔁 Which changes redraw the chart

The setters are **write-only**: `scatterPlot.Title = 'x'` works, but reading `scatterPlot.Title` returns `undefined`.

| Change | Redraws? |
|---|---|
| `setChartProperties(...)` | Yes, and it also saves the view the ↺ reset button returns to |
| `Width`, `Height`, `CenterOrigin`, `AnchorX`, `AnchorY`, `RangeX`, `RangeY`, `Ticks` setters | Yes, once **per setter call** (setting four of them redraws four times). They do not change the view the ↺ button returns to |
| `Points`, `Title`, `XAxisLabel`, `YAxisLabel` setters | **No.** The new value is stored and appears on the next redraw. Call `renderGraph()` yourself if you need it now |
| `setAttribute('title' \| 'x-axis-label' \| 'y-axis-label', …)` after the first draw | SVG charts: only that text is updated. `<canvas-scatter-plot>`: the whole chart is redrawn (text is drawn into the canvas) |

> [!TIP]
> Some attributes such as the title or axis labels will not cause the chart to re-render, instead only that label is updated.
>
> This applies to the SVG charts (`<scatter-plot>`, `<line-plot>`). `<canvas-scatter-plot>` redraws the whole chart for these attributes, because its text is part of the canvas image. In both cases the change is ignored if the chart has not been drawn yet.

#### 🔄 Manually Rerender the Chart

If you want to manually trigger a re-render of the chart, you can call the `renderGraph()` method on the scatter plot element:

```javascript
scatterPlot.renderGraph();
```

### 📈 Example 2: Line Plot

You can create a line plot in the same way as a scatter plot, but with a different HTML element:

#### 🖥️ Using HTML

```html
<line-plot id="my-line-plot" title="My Chart" x-axis-label="X" y-axis-label="Y"></line-plot>
```

#### ⚙️ Using JavaScript

```javascript
const linePlot = document.createElement('line-plot');
linePlot.id = 'my-line-plot';
linePlot.setAttribute('title', 'My Chart');
linePlot.setAttribute('x-axis-label', 'X');
linePlot.setAttribute('y-axis-label', 'Y');
document.body.appendChild(linePlot);
```

#### 📝 Adding data or attributes to the line plot

> [!NOTE] 
> You must have the attributes defined by the `setChartProperties` method or the graph will not render.

Similarly you are able to add data or alter the attributes of the line plot in the same way as adding data to the scatter plot.

```javascript
const linePlot = document.getElementById('my-line-plot');

// You can either set each attribute individually or pass an object with all the properties.

// Setting attributes individually
linePlot.setAttribute('title', 'My Updated Chart');
linePlot.setAttribute('x-axis-label', 'Updated X');
linePlot.setAttribute('y-axis-label', 'Updated Y');
...

// or
linePlot.Title = 'My Updated Chart';
linePlot.XAxisLabel = 'Updated X';
linePlot.YAxisLabel = 'Updated Y';
...

// Setting attributes all at once (RECOMMENDED)
const chartProperties = {
  title: 'My Updated Chart',
  'x-axis-label': 'Updated X',
  'y-axis-label': 'Updated Y',
  points: [
    {
        coordinate: [1, 2]
    },
    {
        coordinate: [2, 4]
    },
    {
        coordinate: [3, 6]
    }
  ]
};
const width = 500;
const height = 500;
const numbersAreCenteredAtOrigin = true;
const anchorX = 0;
const anchorY = 0;
const rangeX = 10;
const rangeY = 10;
const ticks = 10;
linePlot.setChartProperties(chartProperties, width, height, numbersAreCenteredAtOrigin, anchorX, anchorY, rangeX, rangeY, ticks);
```

The line plot sorts the points by X before joining them, so the order of `points` doesn't matter.

### 🎨 Example 3: Canvas scatter plot (for large data)

`<canvas-scatter-plot>` looks the same as `<scatter-plot>` and takes the same `setChartProperties(...)` call and setters. It draws the whole chart on one `<canvas>` instead of one SVG element per point, so it stays fast with thousands of points. The Zing-Plot-Web site uses it for scatter charts.

It lives in its own file, which the package's main file does **not** load:

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/bros-zing-plot-plus-plus@latest/src/canvasScatterPlot.js"></script>

<canvas-scatter-plot id="my-canvas-plot"></canvas-scatter-plot>
```

Differences from `<scatter-plot>`:

- Text is part of the image, so it can't be selected. Screen readers get a one-line summary (`aria-label`) instead.
- Changing the `title` or axis-label attributes redraws the whole chart.
- It has a `toImageCanvas(width, height)` method that returns a `<canvas>` with the chart drawn at that size, for saving as PNG.
- It shows the hover tooltip (see below).

Details: [`plans/canvas-scatter-plot/README.md`](plans/canvas-scatter-plot/README.md) and [`SVG_TO_CANVAS_MIGRATION.md`](SVG_TO_CANVAS_MIGRATION.md).

## 🖱️ Interacting with a chart

### Zooming, panning and resetting the view

Every chart type has these built in, with nothing to set up:

| Action | What happens |
|---|---|
| Mouse wheel / trackpad scroll over the plot area | Zooms in or out around the mouse. Both axes zoom by the same factor. While the mouse is over the plot area the page itself does not scroll |
| Trackpad pinch (sent by the browser as Ctrl + wheel) | Same, but 3× more sensitive |
| Press and drag inside the plot area (left button) | Pans the chart |
| ↺ button (top-right corner of the plot area) | Goes back to the view from the last `setChartProperties(...)` call. It is invisible until you hover over the chart or focus it with Tab; Enter or Space also activate it |

Zooming stops at a range of 1e-9 (fully zoomed in) or 1e12 (fully zoomed out). Pressing outside the plot area (on the title or axis numbers) does nothing.

### Hover tooltips

Tooltips need one `<tool-tip-modal>` element on the page with the id `my-tooltip`. Charts look it up by that exact id:

```html
<tool-tip-modal id="my-tooltip"></tool-tip-modal>
```

> [!IMPORTANT]
> Currently **only `<canvas-scatter-plot>` shows hover tooltips.** `<scatter-plot>` and `<line-plot>` still contain `setupHoverListeners()`, but since the zoom reset button was added (commit `4f79abe`) nothing calls it, so hovering their points shows nothing.

The tooltip shows values with 2 decimals (`12.3456` → `12.35`), switching to scientific notation above 100,000 or below 0.001. Axis tick numbers use different cut-offs (1,000,000 and 0.0001) and up to 4 decimals, so the same value can look different on the axis and in the tooltip.

### Changing the chart color

Set the `--chart-color-theme` CSS variable on the chart or any parent. It colors the scatter points and the line (default `#3498db`):

```css
scatter-plot, line-plot, canvas-scatter-plot { --chart-color-theme: #c0392b; }
```

The SVG charts pick up a change straight away. `<canvas-scatter-plot>` reads the color when it draws, so call `renderGraph()` after changing it.

## 🌐 Demo through Zing-Plot-Web

As a way to allow you to experience some of the available features provided by Zing-Plot-Plus-Plus, we have encapsulated the charts generated by the library in a simple web application: [Zing-Plot-Web](https://bros-writing-code.github.io/Team-2-Chart-Fork/)

Zing-Plot-Web allows you to:

- Upload your own data in either CSV or JSON format
- Manually enter data values to plot on the chart.
- Create different types of charts (e.g., scatter plots or line plots)
- Customize the title and axis labels of the charts
- Interact with the charts in real-time
- Export charts as images or data
  - Currently only a `.png` image is exported; there is no data export.

Developer notes for the site (code map, axis-range rules, running it locally) are in [`zing-plot-web/README.md`](zing-plot-web/README.md).

### 🔍 Trying it out

https://github.com/user-attachments/assets/5a97b4ef-b651-4397-884b-ecc7235a8c7c

To try out Zing-Plot-Web:

1. Navigate to the [Zing-Plot-Web](https://bros-writing-code.github.io/Team-2-Chart-Fork/).
    - The chart preview starts out **empty**. Nothing is drawn until you click "Generate Chart", pick a chart type, or upload a file (step 2).
2. If you would like to upload your data, simply drag and drop a CSV or JSON file onto the upload area or click the "Upload" button and select your file.
    - The button is labelled "Choose File". Clicking anywhere in the dashed upload box works too. Drop one file at a time.

    - Files up to 5MB are supported.
        - The file must end in `.csv` or `.json`, and may hold at most **10,000 points**.
    - CSV files should have 2 columns: one for the x-axis values and one for the y-axis values.
        - The first row should contain the x-axis and y-axis labels.
        - The header row is optional: if every value in the first row is a number, it is read as data and the current axis labels are kept.
        - Values must be separated by commas. Semicolon- or tab-separated files are rejected. Values containing commas can be wrapped in `"double quotes"`.
        - Extra columns are allowed. Columns named `x` and `y` (any case) are plotted if present, otherwise the first two numeric columns. If the file has 3 or more numeric columns, **X column / Y column** drop-downs appear under the upload box so you can choose others.
    - JSON files should have an array of objects with 2 properties: `x` and `y`.
        - `X` represents the x-axis value and `Y` represents the y-axis value. The exact name of the properties can be substituted with your own.
        - If the properties aren't named `x` and `y`, the first two numeric properties are used and their names become the axis labels.
        - Other accepted shapes: an array of pairs (`[[1, 2], [2, 4]]`), an object of arrays (`{ "x": [1, 2], "y": [2, 4] }`), or the points under a `data` or `points` key. A JSON object may also set `title`, `xLabel` and `yLabel`. The full list is in [ADR 0001](docs/adr/0001-input-validation-and-column-selection.md).
    - Both ints and floats are supported.
        - So are negative numbers and scientific notation (`2.5e-4`). Hex/binary (`0x10`), thousands separators (`1,000`), blank cells, `NaN`/`Infinity`, and values beyond ±1e300 are rejected with an error message.

    Examples of valid files:
    - CSV: 
      ```
      X,Y
      1,2
      2,4
      3,6
      ```
    - JSON:
      ```
      [
        { "x": 1, "y": 2 },
        { "x": 2, "y": 4 },
        { "x": 3, "y": 6 }
      ]
      ```
    
3. Once your data is uploaded, you'll see the data automatically populate the fields on the left hand side of the screen. Uploading also **draws the chart straight away**; you only need step 7 if you edit the fields afterwards.
4. If you wish to manually enter data values, you can do so in the input fields provided labeled `X Values` and `Y Values`.
    - Separate values with commas, spaces or semicolons. Empty entries (`1,,2` or a trailing comma) are skipped with a yellow warning. Both fields must end up with the same number of values.
5. You can also change the title and axis labels of the charts.
    - Limits: title 100 characters, labels 60. An empty title becomes "Untitled Chart". Imported titles/labels that are too long are shortened, and you are told.
6. Pick the type of chart you want to create by using the tab on the top of the screen.
    - The **Linear** / **Scatter Plot** tabs are at the top of the left-hand panel. Switching redraws at once with the data from the last "Generate Chart" or upload. Edits you haven't generated yet are not included.
7. Once you are ready to create the chart, click the "Generate Chart" button.
8. The generated chart will appear on the right hand side of the screen.
    - On narrow screens (under 820 px wide) the chart is below the form instead.
    - **The axes always start at 0** and end a little past the largest value (by 10% of the gap between the smallest and largest value). Negative values are therefore off-chart: points below zero are hidden, and if every X (or every Y) value is negative the chart comes out empty. Data far from 0 (e.g. X from 1000 to 1010) is squeezed against the right edge. Zoom and pan (see *Interacting with a chart* above) let you look around. See [ADR 0001 › Consequences](docs/adr/0001-input-validation-and-column-selection.md#consequences).
    - Scatter charts show a hover tooltip with each point's X and Y. Line charts currently don't (see *Hover tooltips* above).
9. You can swap between the two charts by using the navigation buttons on the top right of the chart-preview pane.
    - **No longer true:** those duplicate buttons were hidden in the redesign ([ADR 0002](docs/adr/0002-Responsive-visual-redesign-for-website.md)). Use the tabs from step 6 instead.
10. You can also export the generated charts as images or data by using the `Save` button. The exported chart will be of `.png` format.
    - Only a PNG image is saved. It is always 1268 × 1420 pixels. The chart is scaled to fit and centered, and any leftover area is transparent. The file is named after the chart title, keeping only letters, numbers, spaces, `-` and `_`.
11. If you ever wish to regenerate the chart, simply make the necessary changes and click the "Generate Chart" button again.
    - Generating, switching chart type, uploading, or resizing the browser window rebuilds the chart, which also undoes any zoom or pan.
