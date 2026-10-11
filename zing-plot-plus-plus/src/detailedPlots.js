import PlotBaseElement from "./plotBase.js";

/**
 * Produces a scatter plot from the provided points
 */
class ScatterPlotElement extends PlotBaseElement {
    applyPlotElements(chartData, sizes, margin, scaleX, scaleY) { 
      //plotting points
      let svg = `<g clip-path="url(#plot-clip)">`;
      chartData.points.forEach(p => {
          const [px, py] = p.coordinate;
          svg += `<circle cx="${scaleX(px)}" cy="${scaleY(py)}" r="${sizes.pointRadius}" data-x="${px}" data-y="${py}" class="point" />`;
      });
      return svg + `</g>`;
    }
}

/**
 * Produces a line chart from the provided points
 */
class LinePlotElement extends PlotBaseElement {
    applyPlotElements(chartData, sizes, margin, scaleX, scaleY) { 
      //plotting lines - https://www.w3.org/TR/SVG/shapes.html#PolylineElement
      let points = ``;
      chartData.points.forEach(p => {
        const [px, py] = p.coordinate;
        points += `${scaleX(px)},${scaleY(py)} `
      });
      return `<g clip-path="url(#plot-clip)"> <polyline fill="none" stroke="blue" stroke-width="2" points="${points}"/> </g>`;
    }
}

customElements.define('scatter-plot', ScatterPlotElement);
customElements.define('line-plot', LinePlotElement);