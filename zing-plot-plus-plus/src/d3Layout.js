import { computeLayout } from "./plotBase.js";

/**
 * Works out the chart layout like computeLayout(), but with D3 scales and ticks.
 * Margins and sizes are the same; only scaleX, scaleY, xTicks and yTicks come from D3.
 * Used by the D3 chart versions in d3Plots.js (see docs/adr/0003-d3-scale-proposal.md).
 * @param {function} scaleLinear - d3.scaleLinear. Passed in so this file needs no internet import and can be tested in Node.
 * @param {number} x - Width of the component
 * @param {number} y - Height of the component
 * @param {boolean} center - If true, chart frame is fixed by a center point. If false, fixed by left-bottom corner.
 * @param {number} centerx - Anchor coordinate X
 * @param {number} centery - Anchor coordinate Y
 * @param {number} rangeX - Range of displayed X values.
 * @param {number} rangeY - Range of displayed Y values.
 * @param {number} ticks - Roughly how many ticks to show per axis.
 * @returns {object} - The same shape as computeLayout(); scaleX and scaleY are D3 scales.
 */
export function computeD3Layout(scaleLinear, x, y, center, centerx, centery, rangeX, rangeY, ticks) {
  const layout = computeLayout(x, y, center, centerx, centery, rangeX, rangeY, ticks);
  const { margin, sizes } = layout;

  // A zero range (e.g. a single point at the origin) would divide by zero, so treat it as 1
  if (rangeX === 0) rangeX = 1;
  if (rangeY === 0) rangeY = 1;

  // The visible data range: centered on the anchor, or starting at it
  const minX = center === true ? centerx - (rangeX / 2) : centerx;
  const minY = center === true ? centery - (rangeY / 2) : centery;

  const scaleX = scaleLinear()
    .domain([minX, minX + rangeX])
    .range([margin.left, margin.left + sizes.plotWidth]);
  // Screen y grows downward, so the smallest value goes at the bottom of the plot
  const scaleY = scaleLinear()
    .domain([minY, minY + rangeY])
    .range([margin.top + sizes.plotHeight, margin.top]);

  return { ...layout, scaleX, scaleY, xTicks: scaleX.ticks(ticks), yTicks: scaleY.ticks(ticks) };
}
