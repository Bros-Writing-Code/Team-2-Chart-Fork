// D3 versions of the website's charts, used only when the page is opened with ?demo=d3.
// They build on the library's charts without changing them.
// See docs/adr/0004-d3-scale-proposal.md and docs/adr/0005-d3-axis-proposal.md.
import { scaleLinear } from "https://cdn.jsdelivr.net/npm/d3-scale@4.0.2/+esm";
import { axisBottom, axisLeft } from "https://cdn.jsdelivr.net/npm/d3-axis@3.0.0/+esm";
import { select } from "https://cdn.jsdelivr.net/npm/d3-selection@3.0.0/+esm";
import { toD3Layout } from "./d3Layout.js";

// Load the library's helpers from the same address as index.html, so the demo follows its version.
const library = document.querySelector('script[src$="detailedPlots.js"]').src;
const { computeLayout, formatAxisNumber } = await import(library.replace("detailedPlots.js", "plotBase.js"));
await Promise.all([customElements.whenDefined("line-plot"), customElements.whenDefined("canvas-scatter-plot")]);

/**
 * Works out a chart's layout with D3 scales and ticks, from its current size and visible range.
 * @param {HTMLElement} chart - A chart from the library, e.g. <line-plot>.
 * @returns {object} - The layout from toD3Layout().
 */
function d3LayoutFor(chart) {
  const layout = computeLayout(chart._width, chart._height, chart._center_origin, chart._anchorX,
    chart._anchorY, chart._rangeX, chart._rangeY, chart._ticks);
  return toD3Layout(scaleLinear, layout, chart._center_origin, chart._anchorX, chart._anchorY,
    chart._rangeX, chart._rangeY, chart._ticks);
}

/**
 * <canvas-scatter-plot> with its scales, ticks and grid lines worked out by d3-scale.
 */
class D3CanvasScatterPlotElement extends customElements.get("canvas-scatter-plot") {
  /**
   * Draws the chart as usual, but with the D3 layout. The tooltips read the same
   * layout afterwards, so they line up with the points.
   * @param {CanvasRenderingContext2D} ctx - The context to draw on.
   * @param {ChartData} chartData - Title, axis labels and points.
   * @param {object} layout - The library's layout, replaced by the D3 one.
   * @param {number} width - Width of the chart in CSS pixels.
   * @param {number} height - Height of the chart in CSS pixels.
   * @param {string} color - Fill color for the points.
   * @returns {void}
   */
  drawChart(ctx, chartData, layout, width, height, color) {
    this._layout = d3LayoutFor(this);
    super.drawChart(ctx, chartData, this._layout, width, height, color);
  }
}

/**
 * <line-plot> with d3-scale for its scales and ticks, and d3-axis for its tick numbers and grid lines.
 */
class D3LinePlotElement extends customElements.get("line-plot") {
  /**
   * Draws the line with D3 scales instead of the library's.
   * @param {ChartData} chartData - Title, axis labels and points.
   * @param {object} sizes - Sizes from the layout.
   * @param {object} margin - Margins from the layout.
   * @returns {string} - The line's SVG, built by the normal line plot.
   */
  applyPlotElements(chartData, sizes, margin) {
    const { scaleX, scaleY } = d3LayoutFor(this);
    return super.applyPlotElements(chartData, sizes, margin, scaleX, scaleY);
  }

  /**
   * Draws the chart as usual, then replaces the hand-drawn tick numbers and grid lines with d3-axis.
   * The D3 axes reuse the chart's own CSS classes, so they look the same.
   * @returns {void}
   */
  renderGraph() {
    super.renderGraph();
    const svg = this.shadowDOM.querySelector("svg");
    // Nothing new was drawn: renderGraph() skips drawing until every chart property is set.
    if (!svg || svg.querySelector(".d3-axis")) {
      return;
    }
    const { margin, sizes, scaleX, scaleY, xTicks, yTicks } = d3LayoutFor(this);
    svg.querySelectorAll(".grid-line, .axis-text").forEach((el) => el.remove());

    const restyle = (g) => {
      g.attr("class", "d3-axis");
      // The chart already draws its own axis lines
      g.select(".domain").remove();
      g.selectAll(".tick line").attr("class", "grid-line");
      g.selectAll(".tick text").attr("class", "axis-text");
    };

    // Inserted before the axis lines so the grid sits underneath them, as before
    select(svg).insert("g", ".axis-line")
      .attr("transform", `translate(0, ${margin.top + sizes.plotHeight})`)
      .call(axisBottom(scaleX).tickValues(xTicks).tickFormat(formatAxisNumber)
        .tickSizeInner(-sizes.plotHeight).tickSizeOuter(0)
        // Puts the numbers where the hand-drawn ones were (0.71em is d3-axis's own text offset)
        .tickPadding(margin.bottom * 0.35 - sizes.tickFont * 0.71))
      .call(restyle);
    select(svg).insert("g", ".axis-line")
      .attr("transform", `translate(${margin.left}, 0)`)
      .call(axisLeft(scaleY).tickValues(yTicks).tickFormat(formatAxisNumber)
        .tickSizeInner(-sizes.plotWidth).tickSizeOuter(0).tickPadding(margin.left * 0.30))
      .call(restyle);
  }
}

customElements.define("d3-canvas-scatter-plot", D3CanvasScatterPlotElement);
customElements.define("d3-line-plot", D3LinePlotElement);
