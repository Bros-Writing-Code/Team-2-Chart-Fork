import { scaleLinear } from "https://cdn.jsdelivr.net/npm/d3-scale@4.0.2/+esm";
import { axisBottom, axisLeft } from "https://cdn.jsdelivr.net/npm/d3-axis@3.0.0/+esm";
import { select } from "https://cdn.jsdelivr.net/npm/d3-selection@3.0.0/+esm";
import { formatAxisNumber } from "./plotBase.js";
import { LinePlotElement } from "./detailedPlots.js";
import CanvasScatterPlotElement from "./canvasScatterPlot.js";
import { computeD3Layout } from "./d3Layout.js";

// D3 versions of the website's charts, used only in its ?demo=d3 mode.
// See docs/adr/0004-d3-scale-proposal.md and docs/adr/0005-d3-axis-proposal.md.

/**
 * <canvas-scatter-plot> with its scales and ticks worked out by d3-scale.
 * Everything else, including the drawing, is unchanged.
 */
class D3CanvasScatterPlotElement extends CanvasScatterPlotElement {
  /**
   * Same as PlotBaseElement.getLayout, but with D3 scales.
   * @returns {object} - The layout from computeD3Layout().
   */
  getLayout(...args) {
    return computeD3Layout(scaleLinear, ...args);
  }
}

/**
 * <line-plot> with d3-scale for its scales and ticks, and d3-axis for its tick numbers and grid lines.
 */
class D3LinePlotElement extends LinePlotElement {
  /**
   * Same as PlotBaseElement.getLayout, but with D3 scales.
   * @returns {object} - The layout from computeD3Layout().
   */
  getLayout(...args) {
    return computeD3Layout(scaleLinear, ...args);
  }

  /**
   * Draws the chart as usual, then replaces the hand-drawn tick numbers and grid lines with d3-axis.
   * The D3 axes reuse the chart's own CSS classes, so they look the same.
   * @returns {void}
   */
  renderGraph() {
    super.renderGraph();
    const svg = this.shadowDOM.querySelector('svg');
    // Nothing new was drawn: renderGraph() skips drawing until every chart property is set.
    if (!svg || svg.querySelector('.d3-axis')) {
      return;
    }
    const { margin, sizes, scaleX, scaleY, xTicks, yTicks } = this.getLayout(this._width, this._height,
      this._center_origin, this._anchorX, this._anchorY, this._rangeX, this._rangeY, this._ticks);
    svg.querySelectorAll('.grid-line, .axis-text').forEach((el) => el.remove());

    const restyle = (g) => {
      g.attr('class', 'd3-axis');
      // The chart already draws its own axis lines
      g.select('.domain').remove();
      g.selectAll('.tick line').attr('class', 'grid-line');
      g.selectAll('.tick text').attr('class', 'axis-text');
    };

    // Inserted before the axis lines so the grid sits underneath them, as before
    select(svg).insert('g', '.axis-line')
      .attr('transform', `translate(0, ${margin.top + sizes.plotHeight})`)
      .call(axisBottom(scaleX).tickValues(xTicks).tickFormat(formatAxisNumber)
        .tickSizeInner(-sizes.plotHeight).tickSizeOuter(0)
        // Puts the numbers where the hand-drawn ones were (0.71em is d3-axis's own text offset)
        .tickPadding(margin.bottom * 0.35 - sizes.tickFont * 0.71))
      .call(restyle);
    select(svg).insert('g', '.axis-line')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(axisLeft(scaleY).tickValues(yTicks).tickFormat(formatAxisNumber)
        .tickSizeInner(-sizes.plotWidth).tickSizeOuter(0).tickPadding(margin.left * 0.30))
      .call(restyle);
  }
}

customElements.define('d3-canvas-scatter-plot', D3CanvasScatterPlotElement);
customElements.define('d3-line-plot', D3LinePlotElement);
