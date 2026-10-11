import scatter from "../src/scatter.js";

/**
 * A custom element representing a plottable scatter plot.
 * @property {Array} points - The data points to plot.
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
class ScatterPlot extends HTMLElement {

  #_points = [];
  #_title = "";
  #_center_origin = false;
  #_xAxisLabel = "";
  #_yAxisLabel = "";
  #_anchorX = 0;
  #_anchorY = 0;
  #_width = 0;
  #_height = 0;
  #_rangeX = 0;
  #_rangeY = 0;
  #_ticks = 0;

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
   * @param {Array} points - The data points to plot.
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
   * @param {Object} chartData - The data for the chart.
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
        this.shadowDOM.querySelector('title-text').textContent = newValue;
        break;
      case 'x-axis-label':
        this._xAxisLabel = newValue;
        this.shadowDOM.querySelector('x-axis-label-text').textContent = newValue;
        break;
      case 'y-axis-label':
        this._yAxisLabel = newValue;
        this.shadowDOM.querySelector('y-axis-label-text').textContent = newValue;
        break;
    }
  }

  /**
   * Renders the graph and places it in the shadow (virtual DOM).
   * @returns {void}
   */
  renderGraph() {
    try {
    this.shadowDOM.innerHTML = scatter({
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
    const circles = this.shadowDOM.querySelectorAll('circle');
    const tooltip = document.getElementById("my-tooltip");
    circles.forEach((circle) => {
      circle.addEventListener('mouseenter', () => {
        console.log('Mouse is over a point');
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
      });
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
    return ['x-coordinate', 'y-coordinate', 'x-position', 'y-position', 'visible'];
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
      case 'x-coordinate':
        this.shadowDOM.querySelector('#tooltip-x').textContent = newValue;
        break;
      case 'y-coordinate':
        this.shadowDOM.querySelector('#tooltip-y').textContent = newValue;
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
        .tooltip {
          position: absolute;
          background-color: #fff;
          color: #000;
          min-width: 100px;
          max-width: 200px;
          min-height: 50px;
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
        }
      </style>
      <div class="tooltip">
        <p>X: <span id="tooltip-x" class="tooltip-value"></span></p>
        <p>Y: <span id="tooltip-y" class="tooltip-value"></span></p>
      </div>
    `;
    this.shadowDOM.querySelector('.tooltip').addEventListener('mouseleave', () => {
       this.setAttribute('visible', 'false');
    });
  }
}

customElements.define('scatter-plot', ScatterPlot);
customElements.define('tool-tip-modal', ToolTipModal);