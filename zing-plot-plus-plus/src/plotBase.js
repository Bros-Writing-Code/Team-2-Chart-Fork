/**
 * @typedef {object} Point
 * @property {Array<number>} coordinate - Array containing the X and Y coordinates of the point
 */

/**
 * @typedef {object} ChartData
 * @property {string} title - The title of the chart
 * @property {string} `x-axis-label` - The label for the X axis
 * @property {string} `y-axis-label` - The label for the Y axis
 * @property {Array<Point>} points - An array of points to display on the chart
 */

/**
 * Escapes text so it is displayed literally when inserted into SVG markup.
 * @param {*} value - The text to escape.
 * @returns {string} - The escaped text.
 */
function escapeXML(value) {
  const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };
  return String(value).replace(/[&<>"']/g, (char) => entities[char]);
}

/**
 * Picks "nice" tick values (multiples of 1, 2, 5 or 10) between min and max.
 * @param {number} min - Smallest value on the axis.
 * @param {number} max - Largest value on the axis.
 * @param {number} maxTicks - Roughly how many ticks to show.
 * @returns {Array<number>} - The tick values.
 */
export function getTicks(min, max, maxTicks) {
  const range = max - min;
  const roughStep = range / maxTicks;
  const stepPower = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / stepPower;

  //Clamp ticks to multiples of 1/2/5/10, whichever is closer
  let multiplier = 1;
  if (normalizedStep >= 1.5 && normalizedStep < 3) multiplier = 2;
  else if (normalizedStep >= 3 && normalizedStep < 7) multiplier = 5;
  else if (normalizedStep >= 7) multiplier = 10;

  const step = stepPower * multiplier;
  const startTick = Math.ceil(min / step) * step;
  //No epsilon bugs since 1e-6 comes after division
  const numTicks = Math.floor((max - startTick) / step + 1e-6) + 1;

  const ticks = [];
  for (let i = 0; i < numTicks; i++) {
    ticks.push(startTick + (i * step));
  }
  return ticks;
}

/**
 * Formats an axis tick number, switching to scientific notation for very large or small values.
 * @param {number} num - The tick value.
 * @returns {string} - The text to show.
 */
export function formatAxisNumber(num) {
  if (num === 0) return "0";
  const absNum = Math.abs(num);
  // switch to scientific notation if numbers are large/small
  if (absNum >= 1e6 || absNum <= 1e-4) {
    return num.toExponential(2); // e.g., 1.50e6
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(num);
}

/**
 * Works out where everything goes on the chart: margins, sizes, the data -> pixel
 * scales and the tick values. Shared by the SVG charts and <canvas-scatter-plot>.
 * Takes the same arguments as PlotBaseElement.generateGraph (minus chartData).
 * @returns {{margin: object, sizes: object, scaleX: function(number): number,
 *   scaleY: function(number): number, xTicks: Array<number>, yTicks: Array<number>}}
 */
export function computeLayout(x, y, center, centerx, centery, rangeX, rangeY, ticks) {
  const minDim = Math.min(x, y);

  // TODO: Consolidate size parameters during generation? Update applyPlotElements if so.

  const margin = {
    top: minDim * 0.08,
    right: minDim * 0.05,
    bottom: minDim * 0.12,
    left: minDim * 0.20
  };

  // sizes of various graph components as a % of SVG size, can change parameters
  const sizes = {
    // Actual plot dimensions
    plotWidth: x - margin.left - margin.right,
    plotHeight: y - margin.top - margin.bottom,
    // Plot component dimensions
    tickFont: minDim * 0.022,
    labelFont: minDim * 0.03,
    titleFont: minDim * 0.04,
    pointRadius: Math.max(minDim * 0.008, 1.5),
    axisStroke: Math.max(minDim * 0.003, 0.5),
    gridStroke: Math.max(minDim * 0.0015, 0.25),
    gridDash: Math.max(minDim * 0.008, 2)
  };

  // A zero range (e.g. a single point at the origin) would divide by zero, so treat it as 1
  if (rangeX === 0) rangeX = 1;
  if (rangeY === 0) rangeY = 1;

  // calculate domain of graph
  let domainMinX, domainMaxX, domainMinY, domainMaxY;
  if (center === true) {
    domainMinX = centerx - (rangeX / 2);
    domainMaxX = centerx + (rangeX / 2);
    domainMinY = centery - (rangeY / 2);
    domainMaxY = centery + (rangeY / 2);
  } else {
    domainMinX = centerx;
    domainMaxX = centerx + rangeX;
    domainMinY = centery;
    domainMaxY = centery + rangeY;
  }

  // Data point -> graph point functions, change these if we want to use a different scale (e.g logarithmic)
  const scaleX = (val) => margin.left + ((val - domainMinX) / rangeX) * sizes.plotWidth;
  const scaleY = (val) => margin.top + sizes.plotHeight - ((val - domainMinY) / rangeY) * sizes.plotHeight;

  const xTicks = getTicks(domainMinX, domainMaxX, ticks);
  const yTicks = getTicks(domainMinY, domainMaxY, ticks);

  return { margin, sizes, scaleX, scaleY, xTicks, yTicks };
}

/**
 * A custom element representing a plottable scatter plot.
 * @property {Array<Point>} points - The data points to plot.
 * @property {string} title - The title of the chart.
 * @property {boolean} centerOrigin - Whether to center the origin of the chart.
 * @property {string} xAxisLabel - The label for the x-axis.
 * @property {string} yAxisLabel - The label for the y-axis.
 * @property {number} anchorX - The x-coordinate of the anchor point (e.g., the center/left x-axis value).
 * @property {number} anchorY - The y-coordinate of the anchor point (e.g., the center/bottom y-axis value).
 * @property {number} width - The width of the chart.
 * @property {number} height - The height of the chart.
 * @property {number} rangeX - The range of the x-axis.
 * @property {number} rangeY - The range of the y-axis.
 * @property {number} ticks - The number of ticks on the axes.
 * 
 * @extends HTMLElement
 */
class PlotBaseElement extends HTMLElement {


  /**
   * Called when the element is first created.
   */
  constructor() {
    super();

    // Create a shadow dom
    this.shadowDOM = this.attachShadow({ mode: 'open' });
  }

  /* Setter if you prefer to set it in JS */

  /**
   * Sets the data points for the scatter plot.
   * @param {Array<Point>} points - The data points to plot.
   * @returns {void}
   */
  set Points(points) {
    this._points = points;
  }

  /**
   * Sets the title of the scatter plot.
   * @param {string} title - The title of the chart.
   * @returns {void}
   */
  set Title(title) {
    this._title = title;
  }

  /**
   * Sets whether the origin of the chart should be centered.
   * @param {boolean} centerOrigin - Whether to center the origin of the chart.
   * @returns {void}
   */
  set CenterOrigin(centerOrigin) {
    this._center_origin = centerOrigin;
    this.renderGraph();
  }

  /**
   * Sets the label for the x-axis.
   * @param {string} xAxisLabel - The label for the x-axis.
   * @returns {void}
   */
  set XAxisLabel(xAxisLabel) {
    this._xAxisLabel = xAxisLabel;
  }

  /**
   * Sets the label for the y-axis.
   * @param {string} yAxisLabel - The label for the y-axis.
   * @returns {void}
   */
  set YAxisLabel(yAxisLabel) {
    this._yAxisLabel = yAxisLabel;
  }

  /**
   * Sets the x-coordinate of the anchor point.
   * @param {number} anchorX - The x-coordinate of the anchor point.
   * @returns {void}
   */
  set AnchorX(anchorX) {
    this._anchorX = anchorX;
    this.renderGraph();
  }

  /**
   * Sets the y-coordinate of the anchor point.
   * @param {number} anchorY - The y-coordinate of the anchor point.
   * @returns {void}
   */
  set AnchorY(anchorY) {
    this._anchorY = anchorY;
    this.renderGraph();
  }

  /**
   * Sets the width of the chart.
   * @param {number} width - The width of the chart.
   * @returns {void}
   */
  set Width(width) {
    this._width = width;
    this.renderGraph();
  }

  /**
   * Sets the height of the chart.
   * @param {number} height - The height of the chart.
   * @returns {void}
   */
  set Height(height) {
    this._height = height;
    this.renderGraph();
  }

  /**
   * Sets the range of the x-axis.
   * @param {number} rangeX - The range of the x-axis.
   * @returns {void}
   */
  set RangeX(rangeX) {
    this._rangeX = rangeX;
    this.renderGraph();
  }

  /**
   * Sets the range of the y-axis.
   * @param {number} rangeY - The range of the y-axis.
   * @returns {void}
   */
  set RangeY(rangeY) {
    this._rangeY = rangeY;
    this.renderGraph();
  }

  /**
   * Sets the number of ticks on the axes.
   * @param {number} ticks - The number of ticks on the axes.
   * @returns {void}
   */
  set Ticks(ticks) {
    this._ticks = ticks;
    this.renderGraph();
  }

  /** A shortcut method to set all the chart properties at once.
   * @param {ChartData} chartData - The data for the chart.
   * @param {number} width - The width of the chart.
   * @param {number} height - The height of the chart.
   * @param {boolean} centerOrigin - Whether to center the origin of the chart.
   * @param {number} anchorX - The x-coordinate of the anchor point.
   * @param {number} anchorY - The y-coordinate of the anchor point.
   * @param {number} rangeX - The range of the x-axis.
   * @param {number} rangeY - The range of the y-axis.
   * @param {number} ticks - The number of ticks on the axes.
   * @returns {void}
   */
  setChartProperties(chartData, width, height, centerOrigin, anchorX, anchorY, rangeX, rangeY, ticks) {
    this._title = chartData.title;
    this._xAxisLabel = chartData["x-axis-label"];
    this._yAxisLabel = chartData["y-axis-label"];
    this._points = chartData.points;
    this._width = width;
    this._height = height;
    this._center_origin = centerOrigin;
    this._anchorX = anchorX;
    this._anchorY = anchorY;
    this._rangeX = rangeX;
    this._rangeY = rangeY;
    this._ticks = ticks;
    this.renderGraph();
  }

  connectedCallback() {
    // This method is called when the element is added to the DOM
  }

  disconnectedCallback() {
    // This method is called when the element is removed from the DOM
  }

  /**
   * Renders plot elements on top of the graph's base, overloaded by subclasses of PlotBaseElement
   * TODO: better scale abstraction, consolidate construction parameters?
   * @param {ChartData} chartData - data of the chart being constructed
   * @param {object} sizes - Information about UI sizing specified during chart construction
   * @param {object} margin - Additional sizing information
   * @param {object} scaleX - Function for scaling chart data along the X dimension to UI size.
   * @param {object} scaleY - Function for scaling chart data along the Y dimension to UI size.
   * @returns {string} - An SVG component representing any plot elements to be layered on the base
   */
  applyPlotElements(chartData, sizes, margin, scaleX, scaleY) {
    // Implementation in subclasses, see scatterPlot and linePlot.
    // Would use abstract if this was Java, not sure if JS has an equivalent
  }

  /**
   * Generates a graph base and outputs it in an SVG HTML object.
   * 
   * @param {ChartData} chartData - JSON object following the chart format
   * @param {number} x - Width of the component
   * @param {number} y - Height of the component
   * @param {boolean} center - If true, chart frame is fixed by a center point. If false, fixed by left-bottom corner.
   * @param {number} centerX - Anchor coordinate X (e.g., what the value of the center/left of the X axis is).
   * @param {number} centerY - Anchor coordinate Y (e.g., what the value of the center/bottom of the Y axis is).
   * @param {number} rangeX - Range of displayed X values.
   * @param {number} rangeY - Range of displayed Y values.
   * @param {number} ticks - Number of displayed tick values per axis, result may have slightly less or more ticks due to rounding
   * @returns {string} - An SVG string component containing the chart.
   */

  generateGraph(chartData, x, y, center, centerx, centery, rangeX, rangeY, ticks) {
    const { margin, sizes, scaleX, scaleY, xTicks, yTicks } =
      computeLayout(x, y, center, centerx, centery, rangeX, rangeY, ticks);

    // build svg, check style for possible customization, using class tags for simplicity
    let svg = `<svg width="${x}" height="${y}" viewBox="0 0 ${x} ${y}" xmlns="http://www.w3.org/2000/svg">
          <style>
              .grid-line { stroke: #e0e0e0; stroke-width: ${sizes.gridStroke}; stroke-dasharray: ${sizes.gridDash}; }
              .axis-line { stroke: #333; stroke-width: ${sizes.axisStroke}; }
              /* TODO: Plotted line style */
              .plot-line { stroke: #111; stroke-width: ${sizes.axisStroke}; }
              .axis-text { font-family: sans-serif; font-size: ${sizes.tickFont}px; fill: #555; text-anchor: middle; }
              .label-text { font-family: sans-serif; font-size: ${sizes.labelFont}px; font-weight: bold; fill: #333; text-anchor: middle; }
              .title-text { font-family: sans-serif; font-size: ${sizes.titleFont}px; font-weight: bold; fill: #111; text-anchor: middle; }
              .point { fill: var(--chart-color-theme, #3498db); stroke: var(--chart-color-theme, #3498db); stroke-width: ${Math.max(sizes.axisStroke / 2, 0.5)}; opacity: 0.8; }
              .line-plot-point { fill: transparent; stroke: none; stroke-width: ${Math.max(sizes.axisStroke / 2, 0.5)}; opacity: 0.0; }
          </style>
          
          <defs>
              <clipPath id="plot-clip">
                  <rect x="${margin.left}" y="${margin.top}" width="${sizes.plotWidth}" height="${sizes.plotHeight}" />
              </clipPath>
          </defs>

          <rect width="${x}" height="${y}" fill="#ffffff" />`;

    //add tick numbers, grid lines
    xTicks.forEach(tick => {
      const px = scaleX(tick);
      const textY = margin.top + sizes.plotHeight + (margin.bottom * 0.35);
      svg += `
              <line x1="${px}" y1="${margin.top}" x2="${px}" y2="${margin.top + sizes.plotHeight}" class="grid-line" />
              <text x="${px}" y="${textY}" class="axis-text">${formatAxisNumber(tick)}</text>
          `;
    });

    yTicks.forEach(tick => {
      const py = scaleY(tick);
      const textX = margin.left - (margin.left * 0.30);
      const textY = py + (sizes.tickFont * 0.3);
      svg += `
              <line x1="${margin.left}" y1="${py}" x2="${margin.left + sizes.plotWidth}" y2="${py}" class="grid-line" />
              <text x="${textX}" y="${textY}" class="axis-text" text-anchor="end">${formatAxisNumber(tick)}</text>
          `;
    });

    //axes, chart title, etc

    svg += `
          <line x1="${margin.left}" y1="${margin.top + sizes.plotHeight}" x2="${margin.left + sizes.plotWidth}" y2="${margin.top + sizes.plotHeight}" class="axis-line" />
          <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + sizes.plotHeight}" class="axis-line" />
      `;

    const titleY = margin.top * 0.6;
    const xLabelY = y - (margin.bottom * 0.15);
    const yLabelX = margin.left * 0.25;
    const yLabelY = margin.top + (sizes.plotHeight / 2);

    svg += `
          <text x="${x / 2}" y="${titleY}" class="title-text">${escapeXML(chartData.title ?? '')}</text>
          <text x="${margin.left + (sizes.plotWidth / 2)}" y="${xLabelY}" class="label-text">${escapeXML(chartData['x-axis-label'] ?? '')}</text>
          <text x="${yLabelX}" y="${yLabelY}" class="label-text" transform="rotate(-90, ${yLabelX}, ${yLabelY})">${escapeXML(chartData['y-axis-label'] ?? '')}</text>
      `;

    // Let subclasses implement their own plot elements.
    svg += this.applyPlotElements(chartData, sizes, margin, scaleX, scaleY);

    return svg + `</svg>`;
  }

  /**
   * Returns the attributes that are observed for changes.
   */
  static get observedAttributes() {
    // Define which attributes are observed for changes These DO NOT require a re-render
    return ['title', 'x-axis-label', 'y-axis-label'];
  }

  /**
   * Called when an observed attribute is changed.
   * Handles when a observed attribute has changed.  These changes do not require a re-render of the component.
   * @param {string} name - The name of the attribute that has changed.
   * @param {string} oldValue - The old value of the attribute.
   * @param {string} newValue - The new value of the attribute.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this.shadowDOM.innerHTML === '') {
      return;
    }
    switch (name) {
      case 'title':
        this._title = newValue;
        this.shadowDOM.querySelector('.title-text').textContent = newValue;
        break;
      case 'x-axis-label':
        this._xAxisLabel = newValue;
        this.shadowDOM.querySelectorAll('.label-text')[0].textContent = newValue;
        break;
      case 'y-axis-label':
        this._yAxisLabel = newValue;
        this.shadowDOM.querySelectorAll('.label-text')[1].textContent = newValue;
        break;
    }
  }

  /**
   * Renders the graph and places it in the shadow (virtual DOM).
   * @returns {void}
   */
  renderGraph() {
    try {
      this.shadowDOM.innerHTML = this.generateGraph({
        points: this._points,
        "x-axis-label": this._xAxisLabel,
        "y-axis-label": this._yAxisLabel,
        "title": this._title
      }, this._width, this._height, this._center_origin, this._anchorX, this._anchorY, this._rangeX, this._rangeY, this._ticks);
      this.setupHoverListeners();
    } catch (error) {
      console.error('Error rendering graph:', error);
    }
  }

  /**
   * Sets up the hover listeners for the graph when the mouse enters a data point.
   * @returns {void}
   */
  setupHoverListeners() {
    const svgContainer = this.shadowRoot.querySelector('svg');
    const tooltip = document.getElementById("my-tooltip");
    const minDim = Math.min(this._width, this._height);
    svgContainer.addEventListener('mouseover', (e) => {
      if (e.target.tagName.toLowerCase() === 'circle') {
        const circle = e.target;
        function follow() {
          const rect = circle.getBoundingClientRect();
          const xValue = circle.getAttribute('data-x');
          const yValue = circle.getAttribute('data-y');
          const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
          const scrollY = window.pageYOffset || document.documentElement.scrollTop;
          tooltip.setAttribute('x-coordinate', `${xValue}`);
          tooltip.setAttribute('y-coordinate', `${yValue}`);
          tooltip.setAttribute('x-position', `${rect.left + scrollX}`);
          tooltip.setAttribute('y-position', `${rect.top + scrollY}`);
          tooltip.setAttribute('visible', 'true');
          tooltip.setAttribute('font-size', `${(minDim * 0.02).toFixed(1)}px`);
          window.__followRaf = requestAnimationFrame(follow);
        }
        follow();
      }
    })

    svgContainer.addEventListener('mouseout', (e) => {
      if (e.target.tagName.toLowerCase() === 'circle') {
        window.__tooltipTimeout = setTimeout(() => {
          cancelAnimationFrame(window.__followRaf);
          tooltip.setAttribute('visible', 'false');
        }, 100);
      }
    });
  }
}

/**
 * A custom element for displaying a tooltip.
 * @class ToolTipModal
 * @extends HTMLElement
 */
class ToolTipModal extends HTMLElement {
  constructor() {
    super();
    this.shadowDOM = this.attachShadow({ mode: 'open' });
  }

  /**
   * The attributes that the custom element observes for changes.
   */
  static get observedAttributes() {
    return ['x-coordinate', 'y-coordinate', 'x-position', 'y-position', 'font-size', 'font-family', 'visible'];
  }

  formatValue(value) {
    // If the number is larger than 100,000 use scientific notation
    const num = parseFloat(value);
    if (num > 100000 || num < 0.001 && num !== 0) {
      return num.toExponential(2);
    }
    return num.toFixed(2);
  }

  /**
   * Called when an observed attribute changes.
   * @param {string} name - The name of the attribute that changed.
   * @param {string} oldValue - The old value of the attribute.
   * @param {string} newValue - The new value of the attribute.
   * @returns {void}
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || this.shadowDOM.innerHTML === '') {
      return;
    }
    let div;
    switch (name) {
      case 'font-size':
        this.style.setProperty('--font-size', `${newValue}`);
        break;
      case 'font-family':
        this.style.setProperty('--font-family', `${newValue}`);
        break;
      case 'x-coordinate':
        this.shadowDOM.querySelector('#tooltip-x').textContent = this.formatValue(newValue);
        break;
      case 'y-coordinate':
        this.shadowDOM.querySelector('#tooltip-y').textContent = this.formatValue(newValue);
        break;
      case 'x-position':
        div = this.shadowDOM.querySelector('.tooltip');
        div.style.left = `${newValue}px`;
        break;
      case 'y-position':
        div = this.shadowDOM.querySelector('.tooltip');
        div.style.top = `${newValue}px`;
        break;
      case 'visible':
        div = this.shadowDOM.querySelector('.tooltip');
        div.classList.toggle('tooltip-active', newValue === 'true');
        break;
    }
  }

  /**
   * Called when the custom element is added to the DOM.
   * Creates the initial skeleton of the tooltip.
   * @returns {void}
   */
  connectedCallback() {
    this.shadowDOM.innerHTML = `
      <style>

        :host {
          --font-size: 10px;
          --font-family: Arial, Helvetica, sans-serif;
        }

        .tooltip {
          position: absolute;
          background-color: #fff;
          color: #000;
          width: max-content;
          height: max-content;
          max-width: 200px;
          max-height: 100px;
          text-align: center;
          padding: 5px;
          border-radius: 5px;
          pointer-events: none;
          box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
          opacity: 0.0;
          transition: opacity 0.2s ease-in-out;
          z-index: 1000;
        }

        .tooltip-active {
          pointer-events: auto;
          opacity: 1.0;
        }

        .tooltip-value {
          font-weight: bold;
          font-size: var(--font-size, 10px);
          font-family: var(--font-family, Arial, Helvetica, sans-serif);
        }
      </style>
      <div class="tooltip">
        <p class="tooltip-value">X: <span id="tooltip-x" class="tooltip-value"></span></p>
        <p class="tooltip-value">Y: <span id="tooltip-y" class="tooltip-value"></span></p>
      </div>
    `;

    // Add event listeners for mouse enter and leave
    this.shadowDOM.querySelector('.tooltip').addEventListener('mouseenter', () => {
      clearTimeout(window.__tooltipTimeout);
    });
    this.shadowDOM.querySelector('.tooltip').addEventListener('mouseleave', () => {
      this.setAttribute('visible', 'false');
      cancelAnimationFrame(window.__followRaf);
    });
  }
}

customElements.define('tool-tip-modal', ToolTipModal);

export default PlotBaseElement;
