import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { instanceOf } from './helpers/dom-stub.js';
import '../src/detailedPlots.js';

// Tests marked { todo: 'BUG-xx ...' } describe the behaviour we WANT but the
// code does not have yet. They run and report, but do not fail CI. When a bug
// is fixed the test starts passing; delete the todo flag to lock the fix in.
// Bug IDs match qa/TEST_PLAN.md.

const DEFAULTS = {
  width: 500, height: 400, center: false,
  anchorX: 0, anchorY: 0, rangeX: 10, rangeY: 10, ticks: 5,
};

// With 500x400: minDim=400 -> margin left 80, right 20, top 32, bottom 48,
// so the plot area spans x 80..480 and y 32..352.
const PLOT = { left: 80, right: 480, top: 32, bottom: 352 };

function chart(points, extra = {}) {
  return { title: 'T', 'x-axis-label': 'X', 'y-axis-label': 'Y', points, ...extra };
}

/** Builds the SVG string the same way renderGraph() does. */
function render(tag, chartData, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  return instanceOf(tag).generateGraph(
    chartData, o.width, o.height, o.center, o.anchorX, o.anchorY, o.rangeX, o.rangeY, o.ticks,
  );
}

const pts = (...pairs) => pairs.map((coordinate) => ({ coordinate }));

/** Extracts {cx, cy, x, y} for every <circle> with the given class. */
function circles(svg, cls) {
  const re = new RegExp(`<circle cx="([^"]*)" cy="([^"]*)"[^>]*data-x="([^"]*)" data-y="([^"]*)" class="${cls}"`, 'g');
  return [...svg.matchAll(re)].map(([, cx, cy, x, y]) => ({ cx: +cx, cy: +cy, x: +x, y: +y }));
}

/** Raw markup inside the title, x-label and y-label <text> elements, in that order. */
function labelTexts(svg) {
  return [...svg.matchAll(/class="(?:title|label)-text"[^>]*>([\s\S]*?)<\/text>/g)].map((m) => m[1]);
}

/** Extracts [x, y] pixel pairs from the line chart's polyline. */
function polyline(svg) {
  const m = svg.match(/<polyline[^>]*points="([^"]*)"/);
  assert.ok(m, 'expected a <polyline>');
  return m[1].trim().split(/\s+/).filter(Boolean).map((p) => p.split(',').map(Number));
}

describe('scatter-plot', () => {
  test('draws one point per data point, keeping the raw values for the tooltip', () => {
    const svg = render('scatter-plot', chart(pts([1, 2], [3, 4], [5, 6])));
    assert.deepEqual(circles(svg, 'point').map(({ x, y }) => [x, y]), [[1, 2], [3, 4], [5, 6]]);
  });

  test('maps the domain corners onto the plot-area corners', () => {
    const [lo, hi] = circles(render('scatter-plot', chart(pts([0, 0], [10, 10]))), 'point');
    assert.deepEqual([lo.cx, lo.cy], [PLOT.left, PLOT.bottom]);
    assert.deepEqual([hi.cx, hi.cy], [PLOT.right, PLOT.top]);
  });

  test('centerOrigin puts the anchor point in the middle of the plot', () => {
    const [p] = circles(render('scatter-plot', chart(pts([0, 0])), { center: true }), 'point');
    assert.deepEqual([p.cx, p.cy], [(PLOT.left + PLOT.right) / 2, (PLOT.top + PLOT.bottom) / 2]);
  });

  test('renders with zero points', () => {
    const svg = render('scatter-plot', chart([]));
    assert.match(svg, /^<svg[\s\S]*<\/svg>$/);
    assert.equal(circles(svg, 'point').length, 0);
  });

  test('clips points to the plot area', () => {
    assert.match(render('scatter-plot', chart(pts([1, 1]))), /<g clip-path="url\(#plot-clip\)">\s*<circle/);
  });
});

describe('line-plot', () => {
  test('polyline has one vertex per point, plus invisible hover targets', () => {
    const svg = render('line-plot', chart(pts([1, 1], [2, 4], [3, 9])));
    assert.equal(polyline(svg).length, 3);
    assert.equal(circles(svg, 'line-plot-point').length, 3);
  });

  test('renders with zero points', () => {
    assert.deepEqual(polyline(render('line-plot', chart([]))), []);
  });

  test('connects points in X order even when the input is unsorted', () => {
    const xs = polyline(render('line-plot', chart(pts([3, 1], [1, 2], [2, 3])))).map(([x]) => x);
    assert.deepEqual(xs, [...xs].sort((a, b) => a - b));
  });

  test('does not reorder the caller\'s points array', () => {
    const points = pts([3, 1], [1, 2], [2, 3]);
    const before = JSON.stringify(points);
    render('line-plot', chart(points));
    assert.equal(JSON.stringify(points), before);
  });
});

describe('chart base (axes, labels, ticks)', () => {
  test('shows the title and both axis labels', () => {
    const svg = render('scatter-plot', chart([], { title: 'Sales', 'x-axis-label': 'Month', 'y-axis-label': 'Units' }));
    assert.match(svg, /class="title-text">Sales</);
    assert.match(svg, /class="label-text">Month</);
    assert.match(svg, /class="label-text"[^>]*>Units</);
  });

  test('picks round tick steps (0-10 with 5 ticks -> step 2)', () => {
    const labels = [...render('scatter-plot', chart([])).matchAll(/class="axis-text"[^>]*>([^<]*)</g)].map((m) => m[1]);
    // X axis then Y axis
    assert.deepEqual(labels, ['0', '2', '4', '6', '8', '10', '0', '2', '4', '6', '8', '10']);
  });

  test('switches tick labels to scientific notation for large values', () => {
    const svg = render('scatter-plot', chart([]), { rangeX: 1e7, rangeY: 1e7 });
    assert.match(svg, />2\.00e\+6</);
  });

  test('escapes markup in the title and labels', () => {
    // Any valid escaping passes: no raw "<" reaches the markup, and the text decodes back unchanged.
    const input = ['<img src=x onerror=alert(1)>', 'a < b & c'];
    const svg = render('scatter-plot', chart([], { title: input[0], 'x-axis-label': input[1] }));
    const shown = labelTexts(svg).slice(0, 2);
    assert.deepEqual(shown.map((t) => t.includes('<')), [false, false], `raw markup in: ${shown.join(' | ')}`);
    const decode = (t) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
    assert.deepEqual(shown.map(decode), input);
  });

  test('omitted labels render as empty, not the text "undefined"', () => {
    assert.deepEqual(labelTexts(render('scatter-plot', { points: [] })), ['', '', '']);
  });

  test('a zero-width range (e.g. a single point at x=0) produces no NaN coordinates', () => {
    const [p] = circles(render('scatter-plot', chart(pts([0, 0])), { rangeX: 0, rangeY: 0 }), 'point');
    assert.deepEqual([Number.isFinite(p.cx), Number.isFinite(p.cy)], [true, true], `point drawn at (${p.cx}, ${p.cy})`);
  });

  test('the <style> block uses only /* */ comments', () => {
    // "//" is not a CSS comment; it silently swallows the rule after it (BUG-16).
    const [, css] = render('scatter-plot', chart([])).match(/<style>([\s\S]*?)<\/style>/);
    assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /\/\//);
  });
});

describe('tool-tip-modal formatValue', () => {
  const format = (v) => instanceOf('tool-tip-modal').formatValue(v);

  test('rounds ordinary values to 2 decimals', () => {
    assert.equal(format('1234.5678'), '1234.57');
    assert.equal(format('0'), '0.00');
  });

  test('uses scientific notation for very large and very small positives', () => {
    assert.equal(format('250000'), '2.50e+5');
    assert.equal(format('0.0001'), '1.00e-4');
  });
});


describe('chart viewport (zooming and panning)', () => {
  /**
   * Creates a chart with initialized viewport properties.
   * Stubs rendering so viewport calculations can be tested independently.
   */
  function viewport(opts = {}) {
    const o = { ...DEFAULTS, ...opts };
    const plot = instanceOf('scatter-plot');

    plot._width = o.width;
    plot._height = o.height;
    plot._center_origin = o.center;
    plot._anchorX = o.anchorX;
    plot._anchorY = o.anchorY;
    plot._rangeX = o.rangeX;
    plot._rangeY = o.rangeY;
    plot._ticks = o.ticks;
    plot._points = [];

    plot.renderGraph = () => {};

    return plot;
  }

  test('gets viewport bounds with a bottom-left anchor', () => {
    const plot = viewport({
      anchorX: 5,
      anchorY: 10,
      rangeX: 20,
      rangeY: 30,
    });

    assert.deepEqual(plot.getViewport(), {
      minX: 5,
      maxX: 25,
      minY: 10,
      maxY: 40,
    });
  });

  test('gets viewport bounds with a centered origin', () => {
    const plot = viewport({
      center: true,
      anchorX: 5,
      anchorY: 10,
      rangeX: 20,
      rangeY: 30,
    });

    assert.deepEqual(plot.getViewport(), {
      minX: -5,
      maxX: 15,
      minY: -5,
      maxY: 25,
    });
  });

  test('sets viewport bounds with a bottom-left anchor', () => {
    const plot = viewport();

    plot.setViewport(2, 12, 4, 24);

    assert.equal(plot._anchorX, 2);
    assert.equal(plot._anchorY, 4);
    assert.equal(plot._rangeX, 10);
    assert.equal(plot._rangeY, 20);

    assert.deepEqual(plot.getViewport(), {
      minX: 2,
      maxX: 12,
      minY: 4,
      maxY: 24,
    });
  });

  test('sets viewport bounds with a centered origin', () => {
    const plot = viewport({ center: true });

    plot.setViewport(2, 12, 4, 24);

    assert.equal(plot._anchorX, 7);
    assert.equal(plot._anchorY, 14);
    assert.equal(plot._rangeX, 10);
    assert.equal(plot._rangeY, 20);

    assert.deepEqual(plot.getViewport(), {
      minX: 2,
      maxX: 12,
      minY: 4,
      maxY: 24,
    });
  });

  test('preserves viewport ranges when panning', () => {
    const plot = viewport();

    const before = plot.getViewport();

    const dx = 3;
    const dy = -2;

    plot.setViewport(
      before.minX + dx,
      before.maxX + dx,
      before.minY + dy,
      before.maxY + dy,
    );

    assert.equal(plot._rangeX, 10);
    assert.equal(plot._rangeY, 10);

    assert.deepEqual(plot.getViewport(), {
      minX: 3,
      maxX: 13,
      minY: -2,
      maxY: 8,
    });
  });

  test('preserves the relative axis ranges when zooming', () => {
    const plot = viewport({
      rangeX: 20,
      rangeY: 10,
    });

    const oldRangeX = plot._rangeX;
    const oldRangeY = plot._rangeY;

    const zoomFactor = 0.5;
    const bounds = plot.getViewport();

    plot.setViewport(
      bounds.minX,
      bounds.minX + oldRangeX * zoomFactor,
      bounds.minY,
      bounds.minY + oldRangeY * zoomFactor,
    );

    assert.equal(plot._rangeX / oldRangeX, zoomFactor);
    assert.equal(plot._rangeY / oldRangeY, zoomFactor);
    assert.equal(plot._rangeX / plot._rangeY, 2);
  });
});

