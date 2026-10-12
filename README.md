**ZING PLOT PLUS PLUS**

A simple lightweight charting library for scientific data visualization on the web.

Developers: Brian, Gage, Jessie, Charlie, David, Nathan, Kai and Jooahn

# ✨ Available Features:

- Ability to plot the following chart types:
  - Scatter plots
  - Line plots
- Interactive features for exploring data points
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
<script src="https://cdn.jsdelivr.net/npm/zing-plot-plus-plus@latest/dist/zing-plot-plus-plus.min.js"></script>
```

### 📦 Using npm

Install via npm with a single command:

```bash
npm install zing-plot-plus-plus
```

Then import the library in your HTML:

```html
<script type="module" src="node_modules/zing-plot-plus-plus/src/detailedPlots.js"></script>
```

### 📚 Using Bun

If you prefer Bun as your package manager:

```bash
bun add zing-plot-plus-plus
```

The import process is then the same as npm.

### 🦀 Using Deno

If you prefer Deno as your runtime:

```bash
deno add zing-plot-plus-plus
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

> [!TIP]
> Some attributes such as the title or axis labels will not cause the chart to re-render, instead only that label is updated.

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
## 🌐 Demo through Zing-Plot-Web

As a way to allow you to experience some of the available features provided by Zing-Plot-Plus-Plus, we have encapsulated the charts generated by the library in a simple web application: [Zing-Plot-Web](https://cse-210-f26-02.github.io/Chart-Project/)

Zing-Plot-Web allows you to:

- Upload your own data in either CSV or JSON format
- Manually enter data values to plot on the chart.
- Create different types of charts (e.g., scatter plots or line plots)
- Customize the title and axis labels of the charts
- Interact with the charts in real-time
- Export charts as images or data

### 🔍 Trying it out

https://github.com/user-attachments/assets/5a97b4ef-b651-4397-884b-ecc7235a8c7c

To try out Zing-Plot-Web:

1. Navigate to the [Zing-Plot-Web](https://cse-210-f26-02.github.io/Chart-Project/).
2. If you would like to upload your data, simply drag and drop a CSV or JSON file onto the upload area or click the "Upload" button and select your file.

    - Files up to 5MB are supported.
    - CSV files should have 2 columns: one for the x-axis values and one for the y-axis values.
        - The first row should contain the x-axis and y-axis labels.
    - JSON files should have an array of objects with 2 properties: `x` and `y`.
        - `X` represents the x-axis value and `Y` represents the y-axis value. The exact name of the properties can be substituted with your own.
    - Both ints and floats are supported.

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
    
3. Once your data is uploaded, you'll see the data automatically populate the fields on the left hand side of the screen. When you are ready to plot, jump to step 5.
4. If you wish to manually enter data values, you can do so in the input fields provided labeled `X` and `Y`.
5. You can also change the title and axis labels of the charts.
6. Pick the type of chart you want to create by using the tab on the top of the screen.
7. Once you are ready to create the chart, click the "Generate Chart" button.
8. The generated chart will appear on the right hand side of the screen.
9. You can swap between the two charts by using the navigation buttons on the top right of the chart-preview pane.
10. You can also export the generated charts as images or data by using the `Save` button. The exported chart will be of `.png` format.
11. If you ever wish to regenerate the chart, simply make the necessary changes and click the "Generate Chart" button again.
