import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { instanceOf } from './helpers/dom-stub.js';
import { fakeContext } from './helpers/fake-canvas.js';
import '../src/detailedPlots.js';
import '../src/canvasScatterPlot.js';
import { getTicks, formatAxisNumber, computeLayout, resetButtonLayout } from '../src/plotBase.js';
import { drawPoints, findPointAt } from '../src/canvasPoints.js';

// Extra edge-case tests (empty, zero, negative, huge/tiny, boundaries, mismatched sizes).
// Bug IDs match qa/TEST_PLAN.md. Tests marked { todo: ... } describe behaviour we WANT
// but the code does not have yet; delete the todo flag once the bug is fixed.

const DEFAULTS = {
  width: 500, height: 400, center: false,
  anchorX: 0, anchorY: 0, rangeX: 10, rangeY: 10, ticks: 5,
};

// With 500x400 the plot area spans x 80..480 and y 32..352.
const PLOT = { left: 80, right: 480, top: 32, bottom: 352 };

const chart = (points, extra = {}) => ({ title: 'T', 'x-axis-label': 'X', 'y-axis-label': 'Y', points, ...extra });
const pts = (...pairs) => pairs.map((coordinate) => ({ coordinate }));

function render(tag, chartData, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  return instanceOf(tag).generateGraph(
    chartData, o.width, o.height, o.center, o.anchorX, o.anchorY, o.rangeX, o.rangeY, o.ticks,
  );
}

function circles(svg, cls) {
  const re = new RegExp(`<circle cx="([^"]*)" cy="([^"]*)"[^>]*data-x="([^"]*)" data-y="([^"]*)" class="${cls}"`, 'g');
  return [...svg.matchAll(re)].map(([, cx, cy, x, y]) => ({ cx: +cx, cy: +cy, x: +x, y: +y }));
}

const labelTexts = (svg) =>
  [...svg.matchAll(/class="(?:title|label)-text"[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]);

const axisLabels = (svg) => [...svg.matchAll(/class="axis-text"[^>]*>([^<]*)</g)].map((m) => m[1]);

const decode = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');

const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not close to ${expected}`);

describe('chart base: labels and zero ranges', () => {
  test('escapes markup in the y-axis label too', () => {
    const input = '<script>alert(1)</script> & "quoted"';
    const [, , shown] = labelTexts(render('scatter-plot', chart([], { 'y-axis-label': input })));
    assert.equal(shown.includes('<'), false, `raw markup in: ${shown}`);
    assert.equal(decode(shown), input);
  });

  test('a centered chart shows negative tick labels (-10 to 10)', () => {
    const svg = render('scatter-plot', chart([]), { center: true, rangeX: 20, rangeY: 20 });
    assert.deepEqual(axisLabels(svg), ['-10', '-5', '0', '5', '10', '-10', '-5', '0', '5', '10']);
  });

  test('zero range: no NaN or Infinity anywhere in the SVG, for both chart types', () => {
    for (const tag of ['scatter-plot', 'line-plot']) {
      const svg = render(tag, chart(pts([0, 0])), { rangeX: 0, rangeY: 0 });
      assert.doesNotMatch(svg, /NaN|Infinity/, `${tag} contains NaN or Infinity`);
    }
  });

  test('zero range: a point at the origin lands on the bottom-left corner of the plot', () => {
    const [p] = circles(render('scatter-plot', chart(pts([0, 0])), { rangeX: 0, rangeY: 0 }), 'point');
    assert.deepEqual([p.cx, p.cy], [PLOT.left, PLOT.bottom]);
  });

  test('zero range with centerOrigin puts the point in the middle of the plot', () => {
    const [p] = circles(render('scatter-plot', chart(pts([0, 0])), { center: true, rangeX: 0, rangeY: 0 }), 'point');
    assert.deepEqual([p.cx, p.cy], [(PLOT.left + PLOT.right) / 2, (PLOT.top + PLOT.bottom) / 2]);
  });

  test('a zero range on one axis only still gives finite coordinates', () => {
    const [p] = circles(render('scatter-plot', chart(pts([0, 5])), { rangeX: 0 }), 'point');
    assert.equal(p.cx, PLOT.left);
    near(p.cy, (PLOT.top + PLOT.bottom) / 2);
  });
});

describe('line-plot (more)', () => {
  test('clips the line and its points to the plot area', () => {
    assert.match(render('line-plot', chart(pts([1, 1]))), /<g clip-path="url\(#plot-clip\)">\s*<polyline/);
  });
});

describe('getTicks', () => {
  test('0-10 with 5 ticks steps by 2', () => {
    assert.deepEqual(getTicks(0, 10, 5), [0, 2, 4, 6, 8, 10]);
  });

  test('a range that spans zero includes 0', () => {
    assert.deepEqual(getTicks(-10, 10, 5), [-10, -5, 0, 5, 10]);
  });

  test('0-100 with 10 ticks steps by 10', () => {
    assert.deepEqual(getTicks(0, 100, 10), [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
  });

  test('works on very large ranges (0 to 1e7)', () => {
    assert.deepEqual(getTicks(0, 1e7, 5), [0, 2e6, 4e6, 6e6, 8e6, 1e7]);
  });

  test('works on fractional ranges (0 to 1)', () => {
    const ticks = getTicks(0, 1, 5);
    assert.equal(ticks.length, 6);
    ticks.forEach((t, i) => near(t, i * 0.2));
  });

  test('ticks stay inside the range and increase, even when the range starts mid-step', () => {
    for (const [min, max, n] of [[0.3, 7.9, 5], [-3.3, 12.1, 6], [100, 100.5, 5], [-1234, -1000, 4]]) {
      const ticks = getTicks(min, max, n);
      assert.ok(ticks.length > 0, `no ticks for ${min}..${max}`);
      ticks.forEach((t, i) => {
        assert.ok(t >= min - 1e-9 && t <= max + 1e-9, `tick ${t} outside ${min}..${max}`);
        if (i > 0) assert.ok(t > ticks[i - 1], 'ticks must increase');
      });
    }
  });
});

describe('formatAxisNumber', () => {
  test('0 and -0 both show as "0"', () => {
    assert.equal(formatAxisNumber(0), '0');
    assert.equal(formatAxisNumber(-0), '0');
  });

  test('ordinary numbers get thousands separators and up to 4 decimals', () => {
    assert.equal(formatAxisNumber(1234.5), '1,234.5');
    assert.equal(formatAxisNumber(0.5), '0.5');
    assert.equal(formatAxisNumber(-5), '-5');
    assert.equal(formatAxisNumber(0.12345678), '0.1235');
    assert.equal(formatAxisNumber(999999), '999,999');
  });

  test('switches to scientific notation at 1e6 and at 1e-4, for negatives too', () => {
    assert.equal(formatAxisNumber(1e6), '1.00e+6');
    assert.equal(formatAxisNumber(-1500000), '-1.50e+6');
    assert.equal(formatAxisNumber(0.0001), '1.00e-4');
    assert.equal(formatAxisNumber(0.00011), '0.0001');
  });
});

describe('computeLayout and resetButtonLayout', () => {
  test('a 500x400 chart has the documented margins and plot area', () => {
    const { margin, sizes } = computeLayout(500, 400, false, 0, 0, 10, 10, 5);
    near(margin.left, 80); near(margin.right, 20); near(margin.top, 32); near(margin.bottom, 48);
    near(sizes.plotWidth, 400); near(sizes.plotHeight, 320);
  });

  test('scales map the domain corners onto the plot-area corners', () => {
    const { scaleX, scaleY } = computeLayout(500, 400, false, 0, 0, 10, 10, 5);
    near(scaleX(0), PLOT.left); near(scaleX(10), PLOT.right);
    near(scaleY(0), PLOT.bottom); near(scaleY(10), PLOT.top);
  });

  test('a negative anchor shifts the domain', () => {
    const { scaleX, scaleY } = computeLayout(500, 400, false, -10, -10, 20, 20, 5);
    near(scaleX(-10), PLOT.left); near(scaleX(10), PLOT.right);
    near(scaleY(-10), PLOT.bottom); near(scaleY(10), PLOT.top);
  });

  test('a zero range is treated as 1, so scales and ticks stay finite', () => {
    const layout = computeLayout(500, 400, false, 0, 0, 0, 0, 5);
    near(layout.scaleX(1), PLOT.right);
    near(layout.scaleY(1), PLOT.top);
    [...layout.xTicks, ...layout.yTicks].forEach((t) => assert.ok(Number.isFinite(t)));
    assert.ok(layout.xTicks.length > 0);
  });

  test('a small chart still gets a positive plot area', () => {
    const { sizes } = computeLayout(200, 100, false, 0, 0, 10, 10, 5);
    near(sizes.plotWidth, 175);
    near(sizes.plotHeight, 80);
  });

  test('the reset button never gets smaller than 24px', () => {
    const { margin } = computeLayout(200, 100, false, 0, 0, 10, 10, 5);
    const button = resetButtonLayout(200, 100, margin);
    assert.equal(button.size, 24);
    near(button.x + button.size, 200 - margin.right);
    near(button.y, margin.top);
  });
});

describe('tool-tip-modal formatValue (more)', () => {
  const format = (v) => instanceOf('tool-tip-modal').formatValue(v);

  test('formats negative values like positive ones (-5 -> -5.00)', () => {
    assert.equal(format('-5'), '-5.00');
    assert.equal(format('-1234.5678'), '-1234.57');
  });

  test('uses scientific notation for very large and very small negatives', () => {
    assert.equal(format('-250000'), '-2.50e+5');
    assert.equal(format('-0.0001'), '-1.00e-4');
  });

  test('switches to scientific notation just above 100000 and just below 0.001', () => {
    assert.equal(format('100000'), '100000.00');
    assert.equal(format('100001'), '1.00e+5');
    assert.equal(format('0.001'), '0.00');
    assert.equal(format('0.0009'), '9.00e-4');
  });
});

describe('chart viewport (more)', () => {
  function viewport(opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    const plot = instanceOf('scatter-plot');
    Object.assign(plot, {
      _width: o.width, _height: o.height, _center_origin: o.center,
      _anchorX: o.anchorX, _anchorY: o.anchorY, _rangeX: o.rangeX, _rangeY: o.rangeY,
      _ticks: o.ticks, _points: [],
    });
    plot.renderGraph = () => {};
    plot.style = {};
    return plot;
  }

  test('setViewport redraws the chart once', () => {
    const plot = viewport();
    let redraws = 0;
    plot.renderGraph = () => { redraws += 1; };
    plot.setViewport(0, 5, 0, 5);
    assert.equal(redraws, 1);
  });

  test('viewport bounds round-trip with a centered origin and negative bounds', () => {
    const plot = viewport({ center: true });
    plot.setViewport(-20, -10, -5, 5);
    assert.equal(plot._anchorX, -15);
    assert.equal(plot._anchorY, 0);
    assert.deepEqual(plot.getViewport(), { minX: -20, maxX: -10, minY: -5, maxY: 5 });
  });

  test('resetViewport restores the view set by setChartProperties', () => {
    const plot = viewport();
    plot.setChartProperties(chart([]), 500, 400, false, 0, 0, 10, 10, 5);
    plot.setViewport(2, 12, 4, 24);
    plot._drag = { x: 0.5, y: 0.5 };
    plot.resetViewport();
    assert.deepEqual(plot.getViewport(), { minX: 0, maxX: 10, minY: 0, maxY: 10 });
    assert.equal(plot._drag, null);
    assert.equal(plot.style.cursor, 'grab');
  });

  test('resetViewport also restores a centered origin', () => {
    const plot = viewport();
    plot.setChartProperties(chart([]), 500, 400, true, 5, 10, 20, 30, 5);
    plot.setViewport(100, 110, 100, 110);
    plot.resetViewport();
    assert.deepEqual(plot.getViewport(), { minX: -5, maxX: 15, minY: -5, maxY: 25 });
  });

  test('resetViewport does nothing before the chart has been set up', () => {
    const plot = viewport();
    const before = plot.getViewport();
    plot.resetViewport();
    assert.deepEqual(plot.getViewport(), before);
  });

  describe('getMousePosition', () => {
    const withSurface = (plot, rect) => {
      plot.shadowDOM = { querySelector: () => ({ getBoundingClientRect: () => rect }) };
      return plot;
    };
    const at = (clientX, clientY) => ({ clientX, clientY });

    test('maps the plot-area corners and center to 0..1', () => {
      const plot = withSurface(viewport(), { left: 0, top: 0, width: 500, height: 400 });
      const bottomLeft = plot.getMousePosition(at(80, 352));
      const topRight = plot.getMousePosition(at(480, 32));
      const center = plot.getMousePosition(at(280, 192));
      near(bottomLeft.x, 0); near(bottomLeft.y, 0);
      near(topRight.x, 1); near(topRight.y, 1);
      near(center.x, 0.5); near(center.y, 0.5);
    });

    test('accounts for the chart being scaled and offset on screen', () => {
      // Half-size on screen, starting at (100, 50), like the website's transform: scale
      const plot = withSurface(viewport(), { left: 100, top: 50, width: 250, height: 200 });
      const center = plot.getMousePosition(at(100 + 280 / 2, 50 + 192 / 2));
      near(center.x, 0.5); near(center.y, 0.5);
    });

    test('positions outside the plot area fall outside 0..1', () => {
      const plot = withSurface(viewport(), { left: 0, top: 0, width: 500, height: 400 });
      const outside = plot.getMousePosition(at(10, 10));
      assert.ok(outside.x < 0 && outside.y > 1);
    });

    test('returns null when there is no chart on the page yet', () => {
      const plot = viewport();
      plot.shadowDOM = { querySelector: () => null };
      assert.equal(plot.getMousePosition(at(100, 100)), null);
    });

    test('returns null when the chart has no size on screen', () => {
      const plot = withSurface(viewport(), { left: 0, top: 0, width: 0, height: 0 });
      assert.equal(plot.getMousePosition(at(100, 100)), null);
    });
  });
});

describe('canvasPoints (more)', () => {
  const double = (v) => v * 2;

  test('drawPoints fills once per point', () => {
    const ctx = fakeContext();
    drawPoints(ctx, pts([1, 2], [3, 4], [5, 6]), double, double, 3);
    assert.equal(ctx.fills.length, 3);
  });

  test('findPointAt counts a point exactly maxDistance away, but not further', () => {
    const points = pts([1, 1]); // drawn at pixel (2, 2)
    assert.equal(findPointAt(points, double, double, 6, 2, 4), points[0]);
    assert.equal(findPointAt(points, double, double, 6.01, 2, 4), null);
  });

  test('findPointAt with maxDistance 0 only matches an exact hit', () => {
    const points = pts([1, 1]);
    assert.equal(findPointAt(points, double, double, 2, 2, 0), points[0]);
    assert.equal(findPointAt(points, double, double, 2.1, 2, 0), null);
  });

  test('findPointAt works with negative coordinates', () => {
    const points = pts([-1, -1]); // drawn at pixel (-2, -2)
    assert.equal(findPointAt(points, double, double, -2, -2, 1), points[0]);
  });
});

describe('canvas-scatter-plot (more)', () => {
  const ARGS = [500, 400, false, 0, 0, 10, 10, 5];
  const data = chart(pts([-5, -5], [0, 0], [4.5, -2], [5, 5]));

  function drawCanvas(chartData, args = ARGS) {
    const ctx = fakeContext();
    instanceOf('canvas-scatter-plot').drawChart(ctx, chartData, computeLayout(...args), args[0], args[1], '#3498db');
    return ctx;
  }
  const svgPixels = (chartData, args) =>
    [...instanceOf('scatter-plot').generateGraph(chartData, ...args).matchAll(/<circle cx="([^"]*)" cy="([^"]*)"/g)]
      .map(([, cx, cy]) => [+cx, +cy]);
  const canvasPixels = (chartData, args) => drawCanvas(chartData, args).circles.map(([x, y]) => [x, y]);

  test('puts points on the same pixels as <scatter-plot> with a centered origin', () => {
    const args = [500, 400, true, 0, 0, 20, 20, 5];
    assert.deepEqual(canvasPixels(data, args), svgPixels(data, args));
  });

  test('puts points on the same pixels as <scatter-plot> with a negative anchor', () => {
    const args = [500, 400, false, -10, -10, 20, 20, 5];
    assert.deepEqual(canvasPixels(data, args), svgPixels(data, args));
  });

  test('puts points on the same pixels as <scatter-plot> on a small, non-square chart', () => {
    const args = [200, 100, false, 0, 0, 10, 10, 5];
    assert.deepEqual(canvasPixels(data, args), svgPixels(data, args));
  });

  test('zero range: points and text stay at finite positions', () => {
    const args = [500, 400, false, 0, 0, 0, 0, 5];
    const ctx = drawCanvas(chart(pts([0, 0])), args);
    assert.deepEqual(ctx.circles.map(([x, y]) => [x, y]), [[PLOT.left, PLOT.bottom]]);
    assert.ok(ctx.lines.flat().every((v) => typeof v === 'string' || Number.isFinite(v)));
    assert.ok(ctx.texts.every((t) => Number.isFinite(t.x) && Number.isFinite(t.y)));
  });

  test('missing title and labels are drawn as empty text, never "undefined"', () => {
    const shown = drawCanvas({ points: [] }).texts.map((t) => t.text);
    assert.equal(shown.includes('undefined'), false);
    assert.equal(shown.filter((t) => t === '').length, 3);
  });

  test('points outside the visible range are still drawn, and the clip rectangle hides them', () => {
    const ctx = drawCanvas(chart(pts([100, 100])));
    assert.equal(ctx.circles.length, 1);
    assert.ok(ctx.circles[0][0] > PLOT.right);
    assert.deepEqual(ctx.clipRect, [PLOT.left, PLOT.top, 400, 320]);
  });

  describe('describe() (screen reader text)', () => {
    const describeWith = (fields) => Object.assign(instanceOf('canvas-scatter-plot'), fields).describe();

    test('a chart with only a title', () => {
      assert.equal(describeWith({ _title: 'Sales', _points: [] }), 'Sales. Scatter plot, 0 points');
    });

    test('a chart with only an x-axis label', () => {
      assert.equal(describeWith({ _xAxisLabel: 'Month', _points: pts([1, 1], [2, 2]) }), 'Scatter plot of Month, 2 points');
    });

    test('says "1 point" for a single point', () => {
      assert.equal(describeWith({ _points: pts([1, 1]) }), 'Scatter plot, 1 point');
    });
  });

  describe('attributeChangedCallback', () => {
    test('changing the title or a label redraws the chart', () => {
      const el = instanceOf('canvas-scatter-plot');
      let redraws = 0;
      el.renderGraph = () => { redraws += 1; };
      el._layout = {};
      el.attributeChangedCallback('title', 'Old', 'New');
      el.attributeChangedCallback('x-axis-label', 'a', 'b');
      el.attributeChangedCallback('y-axis-label', 'c', 'd');
      assert.deepEqual([el._title, el._xAxisLabel, el._yAxisLabel], ['New', 'b', 'd']);
      assert.equal(redraws, 3);
    });

    test('setting the same value again does not redraw', () => {
      const el = instanceOf('canvas-scatter-plot');
      let redraws = 0;
      el.renderGraph = () => { redraws += 1; };
      el._layout = {};
      el.attributeChangedCallback('title', 'Same', 'Same');
      assert.equal(redraws, 0);
    });

    test('attribute changes before the first draw are ignored', () => {
      const el = instanceOf('canvas-scatter-plot');
      let redraws = 0;
      el.renderGraph = () => { redraws += 1; };
      el.attributeChangedCallback('title', 'Old', 'New');
      assert.equal(redraws, 0);
      assert.equal(el._title, undefined);
    });
  });
});
