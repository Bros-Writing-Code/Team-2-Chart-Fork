// The d3-scale part of the ?demo=d3 charts (see docs/adr/0004-d3-scale-proposal.md).
// It has no imports, so the website tests can load it in Node.

/**
 * Swaps a chart layout's hand-written scales and ticks for D3 ones.
 * Margins and sizes are kept, so everything else on the chart stays in the same place.
 * @param {function} scaleLinear - d3.scaleLinear. Passed in so this file can be tested without downloading D3.
 * @param {object} layout - The layout from the library's computeLayout().
 * @param {boolean} center - If true, the visible range is centered on the anchor. If false, it starts at the anchor.
 * @param {number} anchorX - The center or left X value.
 * @param {number} anchorY - The center or bottom Y value.
 * @param {number} rangeX - Range of displayed X values.
 * @param {number} rangeY - Range of displayed Y values.
 * @param {number} ticks - Roughly how many ticks to show per axis.
 * @returns {object} - The same layout, with scaleX, scaleY, xTicks and yTicks from D3.
 */
export function toD3Layout(scaleLinear, layout, center, anchorX, anchorY, rangeX, rangeY, ticks) {
  const { margin, sizes } = layout;

  // A zero range (e.g. a single point at the origin) would divide by zero, so treat it as 1
  if (rangeX === 0) rangeX = 1;
  if (rangeY === 0) rangeY = 1;

  // The visible data range: centered on the anchor, or starting at it
  const minX = center === true ? anchorX - (rangeX / 2) : anchorX;
  const minY = center === true ? anchorY - (rangeY / 2) : anchorY;

  const scaleX = scaleLinear()
    .domain([minX, minX + rangeX])
    .range([margin.left, margin.left + sizes.plotWidth]);
  // Screen y grows downward, so the smallest value goes at the bottom of the plot
  const scaleY = scaleLinear()
    .domain([minY, minY + rangeY])
    .range([margin.top + sizes.plotHeight, margin.top]);

  return { ...layout, scaleX, scaleY, xTicks: scaleX.ticks(ticks), yTicks: scaleY.ticks(ticks) };
}
