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
    name: 'Whole chart on one canvas',
    status: 'done',
    where: 'Steps 1–3',
    description: 'Background, grid, axes, tick numbers, title, labels and points are all drawn on one <canvas>. No SVG.',
  },
  {
    name: 'Same positions as the SVG chart',
    status: 'done',
    where: 'Steps 2–3',
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
    status: 'done',
    where: 'Step 3',
    description: 'Points use the --chart-color-theme CSS variable (default #3498db) at 0.8 opacity, like the SVG points.',
    setup(area, { canvasChart }) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Toggle theme color';
      button.addEventListener('click', () => {
        const on = canvasChart.style.getPropertyValue('--chart-color-theme');
        canvasChart.style.setProperty('--chart-color-theme', on ? '' : '#c0392b');
        canvasChart.renderGraph();
      });
      area.append(button);
    },
  },
  {
    name: 'Hover tooltip',
    status: 'done',
    where: 'Step 3',
    description: 'findPointAt() finds the point under the mouse and shows the existing <tool-tip-modal>. Hover a point on the canvas chart to try it.',
  },
  {
    name: 'PNG export',
    status: 'done',
    where: 'Step 3',
    description: 'toImageCanvas(width, height) draws the whole chart, points included, at any size. The website uses it for Save PNG.',
    setup(area, { canvasChart }) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Save PNG (2×)';
      button.addEventListener('click', () => {
        const link = document.createElement('a');
        link.href = canvasChart.toImageCanvas(canvasChart._width * 2, canvasChart._height * 2).toDataURL('image/png');
        link.download = 'canvas-scatter.png';
        link.click();
      });
      area.append(button);
    },
  },
  {
    name: 'Sharp on HiDPI screens',
    status: 'done',
    where: 'Step 3',
    description: 'The canvas is drawn at the screen\'s pixel density, so text and points are crisp on Retina displays.',
  },
  {
    name: 'Screen-reader label',
    status: 'done',
    where: 'Step 3',
    description: 'The canvas has role="img" and an aria-label summarizing the title, axes and number of points.',
  },
  {
    name: 'Zooming and scrolling',
    status: 'planned',
    where: 'Issue #3',
    description: 'If zoom changes the chart range and calls renderGraph(), the canvas chart redraws with it automatically. The "Redraw 20×" button above approximates the cost.',
  },
];
