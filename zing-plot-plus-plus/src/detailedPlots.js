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
      const sorted = [...chartData.points].sort((a, b) => a.coordinate[0] - b.coordinate[0]);
      //plotting lines - https://www.w3.org/TR/SVG/shapes.html#PolylineElement
      let points = ``;
      sorted.forEach(p => {
        const [px, py] = p.coordinate;
        points += `${scaleX(px)},${scaleY(py)} `
      });
      return `<g clip-path="url(#plot-clip)"> <polyline fill="none" stroke="var(--chart-color-theme, #3498db)" stroke-width="2" points="${points}"/>${
        // Add transparent circles at each data point for interactivity
        sorted.map(p => {
          const [px, py] = p.coordinate;
          return `<circle cx="${scaleX(px)}" cy="${scaleY(py)}" r="${sizes.pointRadius}" fill="transparent" stroke="none" data-x="${px}" data-y="${py}" class="line-plot-point" />`;
        }).join('')
      }</g>`;
    }
}

customElements.define('scatter-plot', ScatterPlotElement);
customElements.define('line-plot', LinePlotElement);

export { ScatterPlotElement, LinePlotElement };