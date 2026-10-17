import PlotBaseElement, { computeLayout, formatAxisNumber } from "./plotBase.js";
import { drawPoints } from "./canvasPoints.js";

const DEFAULT_COLOR = '#3498db';

/**
 * A scatter plot drawn entirely on one <canvas>: background, grid, axes, tick numbers,
 * title, axis labels and points. No SVG is used.
 * It uses the same layout as <scatter-plot> (computeLayout in plotBase.js), so everything
 * lands on the same pixels. <scatter-plot> itself is unchanged (see plans/canvas-scatter-plot).
 */
class CanvasScatterPlotElement extends PlotBaseElement {
  /**
   * Draws the whole chart on a fresh canvas and puts it in the shadow DOM.
   * Replaces PlotBaseElement.renderGraph, which builds SVG.
   * @returns {void}
   */
  renderGraph() {
    try {
      const width = this._width;
      const height = this._height;
      this._layout = computeLayout(width, height, this._center_origin, this._anchorX, this._anchorY,
        this._rangeX, this._rangeY, this._ticks);

      const style = document.createElement('style');
      style.textContent = `
        :host { display: inline-block; vertical-align: top; }
        canvas { display: block; }`;
      const canvas = document.createElement('canvas');
      // Draw at the screen's pixel density so text and points stay sharp on HiDPI screens.
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      // A canvas is just pixels to a screen reader, so describe the chart in words.
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', this.describe());
      this.shadowDOM.replaceChildren(style, canvas);

      const ctx = canvas.getContext('2d');
      ctx.scale(ratio, ratio);
      this.drawChart(ctx, this.chartData(), this._layout, width, height, this.themeColor());
      this.setupHoverListeners();
    } catch (error) {
      console.error('Error rendering graph:', error);
    }
  }

  /**
   * Draws the chart again once it is on the page. Charts are often set up before they are
   * added, and the theme color (a CSS variable) can only be read after that.
   * @returns {void}
   */
  connectedCallback() {
    if (this._layout) {
      this.renderGraph();
    }
  }

  /**
   * Title and axis labels are drawn into the canvas, so changing one means drawing again.
   * @param {string} name - The name of the attribute that has changed.
   * @param {string} oldValue - The old value of the attribute.
   * @param {string} newValue - The new value of the attribute.
   * @returns {void}
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this._layout) {
      return;
    }
    const fields = { 'title': '_title', 'x-axis-label': '_xAxisLabel', 'y-axis-label': '_yAxisLabel' };
    this[fields[name]] = newValue;
    this.renderGraph();
  }

  /**
   * Hover tooltips are added in the next step. PlotBaseElement's version looks for SVG
   * circles, which this chart doesn't have.
   * @returns {void}
   */
  setupHoverListeners() {}

  /** @returns {ChartData} - The chart's current title, labels and points. */
  chartData() {
    return {
      points: this._points ?? [],
      "x-axis-label": this._xAxisLabel,
      "y-axis-label": this._yAxisLabel,
      "title": this._title
    };
  }

  /** @returns {string} - The point color: the --chart-color-theme CSS variable, or the default blue. */
  themeColor() {
    return getComputedStyle(this).getPropertyValue('--chart-color-theme').trim() || DEFAULT_COLOR;
  }

  /** @returns {string} - A short text description of the chart, for screen readers. */
  describe() {
    const count = (this._points ?? []).length;
    const axes = [this._xAxisLabel, this._yAxisLabel].filter(Boolean).join(' vs ');
    return [this._title, `Scatter plot${axes ? ` of ${axes}` : ''}, ${count} points`]
      .filter(Boolean).join('. ');
  }

  /**
   * Draws the full chart. Colors, sizes and positions match the SVG built by
   * PlotBaseElement.generateGraph, so both versions look the same.
   * @param {CanvasRenderingContext2D} ctx - The context to draw on.
   * @param {ChartData} chartData - Title, axis labels and points.
   * @param {object} layout - The result of computeLayout().
   * @param {number} width - Width of the chart in CSS pixels.
   * @param {number} height - Height of the chart in CSS pixels.
   * @param {string} color - Fill color for the points.
   * @returns {void}
   */
  drawChart(ctx, chartData, layout, width, height, color) {
    const { margin, sizes, scaleX, scaleY, xTicks, yTicks } = layout;
    const plotRight = margin.left + sizes.plotWidth;
    const plotBottom = margin.top + sizes.plotHeight;
    const line = (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };
    const text = (value, x, y, font, fill, align) => {
      ctx.font = font;
      ctx.fillStyle = fill;
      ctx.textAlign = align;
      ctx.fillText(value, x, y);
    };

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Grid lines and tick numbers
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = sizes.gridStroke;
    ctx.setLineDash([sizes.gridDash, sizes.gridDash]);
    const tickFont = `${sizes.tickFont}px sans-serif`;
    xTicks.forEach(tick => {
      const px = scaleX(tick);
      line(px, margin.top, px, plotBottom);
      text(formatAxisNumber(tick), px, plotBottom + (margin.bottom * 0.35), tickFont, '#555', 'center');
    });
    yTicks.forEach(tick => {
      const py = scaleY(tick);
      line(margin.left, py, plotRight, py);
      text(formatAxisNumber(tick), margin.left - (margin.left * 0.30), py + (sizes.tickFont * 0.3), tickFont, '#555', 'right');
    });

    // Axes
    ctx.setLineDash([]);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = sizes.axisStroke;
    line(margin.left, plotBottom, plotRight, plotBottom);
    line(margin.left, margin.top, margin.left, plotBottom);

    // Title and axis labels. Canvas draws text as-is, so no escaping is needed.
    text(chartData.title ?? '', width / 2, margin.top * 0.6, `bold ${sizes.titleFont}px sans-serif`, '#111', 'center');
    const labelFont = `bold ${sizes.labelFont}px sans-serif`;
    text(chartData['x-axis-label'] ?? '', margin.left + (sizes.plotWidth / 2), height - (margin.bottom * 0.15), labelFont, '#333', 'center');
    ctx.save();
    ctx.translate(margin.left * 0.25, margin.top + (sizes.plotHeight / 2));
    ctx.rotate(-Math.PI / 2);
    text(chartData['y-axis-label'] ?? '', 0, 0, labelFont, '#333', 'center');
    ctx.restore();

    // Points, clipped to the plot area. The SVG point is a circle with a thin outline in the
    // same color, faded to 0.8 as a whole, which looks the same as one slightly larger circle.
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin.left, margin.top, sizes.plotWidth, sizes.plotHeight);
    ctx.clip();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.8;
    drawPoints(ctx, chartData.points, scaleX, scaleY, pointDrawRadius(sizes));
    ctx.restore();
  }
}

/**
 * The radius a canvas point is drawn at: the SVG circle's radius plus half its outline width.
 * @param {object} sizes - The sizes from computeLayout().
 * @returns {number} - The radius in pixels.
 */
export function pointDrawRadius(sizes) {
  return sizes.pointRadius + Math.max(sizes.axisStroke / 2, 0.5) / 2;
}

customElements.define('canvas-scatter-plot', CanvasScatterPlotElement);

export default CanvasScatterPlotElement;
