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

  test('connects points in X order even when the input is unsorted', {
    todo: 'BUG-01: the design calls for sorting by X first, but LinePlotElement draws in input order',
  }, () => {
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

  test('escapes markup in the title and labels', {
    todo: 'BUG-02: title/labels are inserted into innerHTML unescaped (broken SVG, and script injection from an uploaded file)',
  }, () => {
    const svg = render('scatter-plot', chart([], { title: '<img src=x onerror=alert(1)>', 'x-axis-label': 'a < b & c' }));
    assert.doesNotMatch(svg, /<img/);
    assert.match(svg, /&lt;img/);
    assert.match(svg, /a &lt; b &amp; c/);
  });

  test('omitted labels render as empty, not the text "undefined"', {
    todo: 'BUG-03: a missing title or axis label is printed as "undefined"',
  }, () => {
    assert.doesNotMatch(render('scatter-plot', { points: [] }), /undefined/);
  });

  test('a zero-width range (e.g. a single point at x=0) produces no NaN coordinates', {
    todo: 'BUG-04: rangeX/rangeY of 0 divides by zero; the site passes 0 for a single point at the origin',
  }, () => {
    const svg = render('scatter-plot', chart(pts([0, 0])), { rangeX: 0, rangeY: 0 });
    assert.doesNotMatch(svg, /NaN|Infinity/);
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

  test('shows ordinary negative numbers normally', {
    todo: 'BUG-05: every negative number is < 0.001, so -5 is shown as "-5.00e+0"',
  }, () => {
    assert.equal(format('-5'), '-5.00');
    assert.equal(format('-1234.5'), '-1234.50');
  });

  // Passes today only by accident (see BUG-05); guards the fix against regressing it.
  test('uses scientific notation for very large negatives', () => {
    assert.equal(format('-250000'), '-2.50e+5');
  });
});
