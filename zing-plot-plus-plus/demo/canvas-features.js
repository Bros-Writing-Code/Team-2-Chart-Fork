/**
 * Feature list for the canvas demo page (canvas-vs-svg.html).
 * The page shows one card per entry, so it grows as <canvas-scatter-plot> gains features.
 *
 * To add or update a feature, edit its entry here:
 *   name        - what the feature is, in plain words
 *   status      - 'done', 'in-progress' or 'planned'
 *   where       - the step (plans/canvas-scatter-plot) or issue it belongs to
 *   description - one or two sentences on what it does or will do
 *   setup       - optional. Adds "try it" controls to the card. Called once with
 *                 (area, { svgChart, canvasChart }) after both charts have rendered:
 *                 area is an empty <div> inside the card, the charts are the two elements.
 */
export const FEATURES = [
  {
    name: 'Points drawn on a canvas',
    status: 'done',
    where: 'Steps 1–2',
    description: 'All points go on one <canvas> instead of one SVG <circle> each. Axes, grid and labels stay SVG.',
  },
  {
    name: 'Same positions as the SVG chart',
    status: 'done',
    where: 'Step 2',
    description: 'Every canvas point uses the same scales as <scatter-plot>, so it lands on the same pixel.',
    setup(area, { svgChart, canvasChart }) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Check positions';
      const result = document.createElement('span');
      result.className = 'feature-result';
      button.addEventListener('click', () => {
        // Compare each SVG circle with where the canvas chart's scales put the same point.
        const circles = svgChart.shadowRoot.querySelectorAll('circle');
        const { scaleX, scaleY } = canvasChart._layout;
        let matching = 0;
        canvasChart._points.forEach((point, i) => {
          const circle = circles[i];
          if (circle
            && Number(circle.getAttribute('cx')) === scaleX(point.coordinate[0])
            && Number(circle.getAttribute('cy')) === scaleY(point.coordinate[1])) {
            matching++;
          }
        });
        const total = canvasChart._points.length;
        result.textContent = `${matching.toLocaleString()} of ${total.toLocaleString()} points match`;
      });
      area.append(button, result);
    },
  },
  {
    name: 'Theme color and opacity',
    status: 'planned',
    where: 'Step 3',
    description: 'Use the --chart-color-theme CSS variable and 0.8 opacity, like the SVG points. Today the points are solid #3498db.',
  },
  {
    name: 'Hover tooltip',
    status: 'planned',
    where: 'Step 4',
    description: 'Find the point under the mouse and show the existing <tool-tip-modal>.',
  },
  {
    name: 'PNG export',
    status: 'planned',
    where: 'Step 5',
    description: "Include the canvas points when the website saves a chart as an image. Today's export copies only the SVG.",
  },
  {
    name: 'Sharp on HiDPI screens',
    status: 'planned',
    where: 'Step 6',
    description: 'Scale the canvas for Retina and other high-resolution displays so points are crisp.',
  },
  {
    name: 'Zooming and scrolling',
    status: 'planned',
    where: 'Issue #3',
    description: 'If zoom changes the chart range and calls renderGraph(), the canvas chart redraws with it automatically. The "Redraw 20×" button above approximates the cost.',
  },
];
