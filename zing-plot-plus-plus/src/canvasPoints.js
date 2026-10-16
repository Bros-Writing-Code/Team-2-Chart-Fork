/**
 * Draws each scatter point as a filled circle on a 2D canvas context.
 * Canvas counterpart of ScatterPlotElement.applyPlotElements (see plans/canvas-scatter-plot).
 * Not used by the chart yet.
 *
 * @param {CanvasRenderingContext2D} ctx - The context to draw on.
 * @param {Array<{coordinate: Array<number>}>} points - The data points to plot.
 * @param {function(number): number} scaleX - Maps a data X value to a pixel X position.
 * @param {function(number): number} scaleY - Maps a data Y value to a pixel Y position.
 * @param {number} radius - The radius of each point in pixels.
 * @returns {void}
 */
export function drawPoints(ctx, points, scaleX, scaleY, radius) {
  for (const { coordinate: [x, y] } of points) {
    ctx.beginPath();
    ctx.arc(scaleX(x), scaleY(y), radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
