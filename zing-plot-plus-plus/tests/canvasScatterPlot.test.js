import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { instanceOf } from './helpers/dom-stub.js';
import { fakeContext } from './helpers/fake-canvas.js';
import '../src/detailedPlots.js';
import { pointDrawRadius } from '../src/canvasScatterPlot.js';
import { computeLayout } from '../src/plotBase.js';

// <canvas-scatter-plot> draws the whole chart on a canvas. These tests draw it on a
// fake canvas (helpers/fake-canvas.js) and check it against the SVG that <scatter-plot>
// builds for the same data, so both versions put everything in the same place.

const points = [[0, 0], [2.5, 7.25], [10, 10]].map((coordinate) => ({ coordinate }));
const chartData = { title: 'T', 'x-axis-label': 'X', 'y-axis-label': 'Y', points };
const ARGS = [500, 400, false, 0, 0, 10, 10, 5]; // 500x400, 0..10 on both axes, ~5 ticks

/** Draws chartData with <canvas-scatter-plot> on a fake canvas. */
function drawCanvas(data = chartData, color = '#3498db') {
  const ctx = fakeContext();
  instanceOf('canvas-scatter-plot').drawChart(ctx, data, computeLayout(...ARGS), ARGS[0], ARGS[1], color);
  return ctx;
}

/** Builds the same chart's SVG with <scatter-plot>. */
const drawSVG = (data = chartData) => instanceOf('scatter-plot').generateGraph(data, ...ARGS);

const attrs = (tag) => Object.fromEntries([...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));

describe('canvas-scatter-plot', () => {
  test('draws each point on the same pixel as <scatter-plot>', () => {
    const svgCircles = [...drawSVG().matchAll(/<circle [^>]*>/g)].map(([tag]) => attrs(tag));
    const ctx = drawCanvas();
    assert.equal(ctx.circles.length, svgCircles.length);
    ctx.circles.forEach(([x, y], i) => {
      assert.equal(x, +svgCircles[i].cx);
      assert.equal(y, +svgCircles[i].cy);
    });
  });

  test('draws the grid lines and axes where the SVG has them', () => {
    const svgLines = [...drawSVG().matchAll(/<line [^>]*>/g)].map(([tag]) => {
      const a = attrs(tag);
      return [+a.x1, +a.y1, +a.x2, +a.y2, a.class === 'axis-line' ? '#333' : '#e0e0e0'];
    });
    assert.deepEqual(drawCanvas().lines, svgLines);
  });

  test('draws the tick numbers, title and labels where the SVG has them', () => {
    const svg = drawSVG();
    const svgTexts = [...svg.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)].map(([, tag, text]) => {
      const a = attrs(tag);
      // The y-axis label is rotated about its own x/y, so its position is that point.
      return { text, x: +a.x, y: +a.y };
    });
    const canvasTexts = drawCanvas().texts.map(({ text, x, y }) => ({ text, x, y }));
    assert.deepEqual(canvasTexts, svgTexts);
  });

  test('uses the same fonts and text alignment as the SVG styles', () => {
    const { sizes } = computeLayout(...ARGS);
    const texts = drawCanvas().texts;
    const byText = Object.fromEntries(texts.map((t) => [t.text, t]));
    assert.equal(byText.T.font, `bold ${sizes.titleFont}px sans-serif`);
    assert.equal(byText.X.font, `bold ${sizes.labelFont}px sans-serif`);
    assert.equal(byText['10'].font, `${sizes.tickFont}px sans-serif`);
    // y-axis tick numbers are right-aligned like text-anchor="end"
    assert.equal(texts.filter((t) => t.align === 'right').length, computeLayout(...ARGS).yTicks.length);
  });

  test('shows title and labels exactly as given, without HTML escaping', () => {
    const texts = drawCanvas({ ...chartData, title: 'R&D <2026>', 'x-axis-label': "Tom's" }).texts.map((t) => t.text);
    assert.ok(texts.includes('R&D <2026>'));
    assert.ok(texts.includes("Tom's"));
  });

  test('uses the theme color at 0.8 opacity for the points, like the SVG', () => {
    const ctx = drawCanvas(chartData, 'rebeccapurple');
    const pointFills = ctx.fills.slice(-points.length);
    assert.deepEqual(pointFills, Array(points.length).fill('rebeccapurple'));
    assert.deepEqual(ctx.alphas.slice(-points.length), Array(points.length).fill(0.8));
  });

  test('draws points slightly larger, to cover the SVG circle outline', () => {
    const sizes = computeLayout(...ARGS).sizes;
    const svgR = +attrs(drawSVG().match(/<circle [^>]*>/)[0]).r;
    assert.equal(svgR, sizes.pointRadius);
    assert.ok(drawCanvas().circles.every(([, , r]) => r === pointDrawRadius(sizes) && r > svgR));
  });

  test('clips the points to the plot area', () => {
    // With 500x400 the plot area spans x 80..480 and y 32..352 (see plots.test.js)
    assert.deepEqual(drawCanvas().clipRect, [80, 32, 400, 320]);
  });

  test('fills a white background and still draws the frame with no points', () => {
    const ctx = drawCanvas({ ...chartData, points: [] });
    assert.deepEqual(ctx.fillRects, [[0, 0, 500, 400, '#ffffff']]);
    assert.equal(ctx.circles.length, 0);
    assert.ok(ctx.lines.length > 0);
  });

  test('describes the chart in words for screen readers', () => {
    const el = instanceOf('canvas-scatter-plot');
    Object.assign(el, { _title: 'Sales', _xAxisLabel: 'Month', _yAxisLabel: 'Units', _points: points });
    assert.equal(el.describe(), 'Sales. Scatter plot of Month vs Units, 3 points');
    assert.equal(instanceOf('canvas-scatter-plot').describe(), 'Scatter plot, 0 points');
  });
});
