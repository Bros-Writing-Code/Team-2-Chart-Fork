import PlotBaseElement from "./plotBase.js";
import { drawPoints } from "./canvasPoints.js";

/**
 * A scatter plot that draws its points on a <canvas> instead of as SVG circles.
 * The axes, grid, title and labels are still SVG, built by PlotBaseElement.
 * Standalone for now (see plans/canvas-scatter-plot): <scatter-plot> is unchanged.
 * Not yet supported: hover tooltip, points in PNG export, theme color, HiDPI sharpness.
 */
class CanvasScatterPlotElement extends PlotBaseElement {
  /**
   * Adds no SVG points. Instead remembers the layout that generateGraph() worked out,
   * so the points can be drawn on the canvas afterwards.
   * @returns {string} - An empty string, there are no SVG plot elements.
   */
  applyPlotElements(chartData, sizes, margin, scaleX, scaleY) {
    this._layout = { sizes, margin, scaleX, scaleY };
    return '';
  }

  /**
   * Renders the SVG frame, then lays a canvas of the same size on top and draws the points.
   * @returns {void}
   */
  renderGraph() {
    super.renderGraph();
    if (!this.shadowDOM.querySelector('svg')) {
      return;
    }

    // The canvas sits exactly on top of the SVG and lets the mouse through to it.
    const style = document.createElement('style');
    style.textContent = `
      :host { display: inline-block; position: relative; }
      canvas { position: absolute; left: 0; top: 0; pointer-events: none; }`;
    const canvas = document.createElement('canvas');
    canvas.width = this._width;
    canvas.height = this._height;
    this.shadowDOM.append(style, canvas);

    this.drawCanvasPoints(canvas.getContext('2d'));
  }

  /**
   * Draws the points onto the given context, clipped to the plot area like the SVG version.
   * @param {CanvasRenderingContext2D} ctx - The context to draw on.
   * @returns {void}
   */
  drawCanvasPoints(ctx) {
    const { sizes, margin, scaleX, scaleY } = this._layout;
    ctx.save();
    ctx.beginPath();
    ctx.rect(margin.left, margin.top, sizes.plotWidth, sizes.plotHeight);
    ctx.clip();
    ctx.fillStyle = '#3498db';
    drawPoints(ctx, this._points ?? [], scaleX, scaleY, sizes.pointRadius);
    ctx.restore();
  }
}

customElements.define('canvas-scatter-plot', CanvasScatterPlotElement);

export default CanvasScatterPlotElement;
