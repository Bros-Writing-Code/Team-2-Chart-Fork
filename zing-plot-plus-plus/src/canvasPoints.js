/**
 * Draws each scatter point as a filled circle on a 2D canvas context.
 * Canvas counterpart of ScatterPlotElement.applyPlotElements (see plans/canvas-scatter-plot).
 * Used by <canvas-scatter-plot>.
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

/**
 * Finds the point drawn closest to a pixel position, for hover tooltips on the canvas.
 * Checks every point, which is quick enough for the website's 10,000-point limit.
 *
 * @param {Array<{coordinate: Array<number>}>} points - The data points that were drawn.
 * @param {function(number): number} scaleX - Maps a data X value to a pixel X position.
 * @param {function(number): number} scaleY - Maps a data Y value to a pixel Y position.
 * @param {number} x - Pixel X position to look at (e.g. the mouse).
 * @param {number} y - Pixel Y position to look at.
 * @param {number} maxDistance - How far from a point's center still counts as on it, in pixels.
 * @returns {{coordinate: Array<number>}|null} - The closest point within maxDistance, or null.
 */
export function findPointAt(points, scaleX, scaleY, x, y, maxDistance) {
  let closest = null;
  let closestDistance = maxDistance * maxDistance;
  for (const point of points) {
    const dx = scaleX(point.coordinate[0]) - x;
    const dy = scaleY(point.coordinate[1]) - y;
    const distance = dx * dx + dy * dy;
    if (distance <= closestDistance) {
      closest = point;
      closestDistance = distance;
    }
  }
  return closest;
}
