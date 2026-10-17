import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { instanceOf } from './helpers/dom-stub.js';
import '../src/detailedPlots.js';
import '../src/canvasScatterPlot.js';

// A hand-written stand-in for the canvas 2D context: it records the clip
// rectangle and the circles instead of drawing them, so the test runs in Node.
function fakeContext() {
  const ctx = { circles: [], clipRect: null };
  ctx.save = ctx.restore = ctx.beginPath = ctx.clip = ctx.fill = () => {};
  ctx.rect = (x, y, w, h) => { ctx.clipRect = [x, y, w, h]; };
  ctx.arc = (x, y, r) => { ctx.circles.push([x, y, r]); };
  return ctx;
}

const points = [[0, 0], [2.5, 7.25], [10, 10]].map((coordinate) => ({ coordinate }));
const chartData = { title: 'T', 'x-axis-label': 'X', 'y-axis-label': 'Y', points };

/** Builds the chart's SVG the same way renderGraph() does (500x400, 0..10 on both axes). */
function render(tag) {
  const el = instanceOf(tag);
  el._points = points;
  const svg = el.generateGraph(chartData, 500, 400, false, 0, 0, 10, 10, 5);
  return { el, svg };
}

describe('canvas-scatter-plot', () => {
  test('keeps the SVG axes and labels but has no SVG points', () => {
    const { svg } = render('canvas-scatter-plot');
    assert.match(svg, /class="title-text">T</);
    assert.match(svg, /class="axis-line"/);
    assert.doesNotMatch(svg, /<circle/);
  });

  test('draws each point on the same pixel as <scatter-plot> does', () => {
    const { svg } = render('scatter-plot');
    const svgCircles = [...svg.matchAll(/<circle cx="([^"]*)" cy="([^"]*)" r="([^"]*)"/g)]
      .map(([, cx, cy, r]) => [+cx, +cy, +r]);

    const { el } = render('canvas-scatter-plot');
    const ctx = fakeContext();
    el.drawCanvasPoints(ctx);
    assert.deepEqual(ctx.circles, svgCircles);
  });

  test('clips the points to the plot area', () => {
    const { el } = render('canvas-scatter-plot');
    const ctx = fakeContext();
    el.drawCanvasPoints(ctx);
    // With 500x400 the plot area spans x 80..480 and y 32..352 (see plots.test.js)
    assert.deepEqual(ctx.clipRect, [80, 32, 400, 320]);
  });
});
