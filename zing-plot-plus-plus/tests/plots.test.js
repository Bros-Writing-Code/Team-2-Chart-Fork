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

function inBrowser(fn, { tooltip = null } = {}) {
  const names = ['window', 'document', 'cancelAnimationFrame', 'requestAnimationFrame'];
  const saved = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const browser = { tooltip, window: { scrollX: 0, scrollY: 0 } };
  Object.assign(globalThis, {
    window: browser.window,
    document: { getElementById: (id) => (id === 'my-tooltip' ? browser.tooltip : null) },
    cancelAnimationFrame() {},
    requestAnimationFrame() { return 0; },
  });
  try {
    return fn(browser);
  } finally {
    for (const [name, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

const fakeTooltip = () => ({ attrs: {}, setAttribute(name, value) { this.attrs[name] = value; } });

const fakeEvent = (fields = {}) => ({
  stopped: false,
  prevented: false,
  stopPropagation() { this.stopped = true; },
  preventDefault() { this.prevented = true; },
  ...fields,
});

const nearly = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not close to ${expected}`);

describe('chart viewport: mouse wheel, dragging and the reset button', () => {
  // A 500x400 chart: the plot area spans x 80..480, y 32..352, so its middle is (280, 192).

  /** A chart whose event listeners are captured, so tests can fire events directly. */
  function interactiveChart({ rangeX = 10, rangeY = 10 } = {}) {
    const plot = instanceOf('scatter-plot');
    Object.assign(plot, {
      _width: 500, _height: 400, _center_origin: false,
      _anchorX: 0, _anchorY: 0, _rangeX: rangeX, _rangeY: rangeY, _ticks: 5, _points: [],
    });
    plot.redraws = 0;
    plot.renderGraph = () => { plot.redraws += 1; };
    plot.style = {};
    plot.shadowDOM = {
      querySelector: () => ({ getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 400 }) }),
    };
    plot.setPointerCapture = (id) => { plot.captured = id; };
    const listeners = {};
    const registered = [];
    plot.addEventListener = (type, handler, options) => {
      listeners[type] = handler;
      registered.push({ type, options });
    };
    plot.setupViewportListeners();
    return { plot, listeners, registered };
  }

  const wheel = (clientX, clientY, deltaY, ctrlKey = false) => fakeEvent({ clientX, clientY, deltaY, ctrlKey });

  test('registers its listeners only once, and the wheel listener may block page scrolling', () => {
    const { plot, registered } = interactiveChart();
    assert.deepEqual(
      registered.map((r) => r.type).sort(),
      ['lostpointercapture', 'pointercancel', 'pointerdown', 'pointermove', 'pointerup', 'wheel'],
    );
    assert.equal(registered.find((r) => r.type === 'wheel').options.passive, false);
    plot.setupViewportListeners();
    assert.equal(registered.length, 6);
    assert.deepEqual([plot.style.cursor, plot.style.touchAction, plot.style.userSelect], ['grab', 'none', 'none']);
  });

  test('scrolling up zooms in around the mouse, keeping the view centered there', () => {
    const { plot, listeners } = interactiveChart();
    const event = wheel(280, 192, -100);
    listeners.wheel(event);
    const factor = Math.exp(-100 * 0.001);
    nearly(plot._rangeX, 10 * factor);
    nearly(plot._rangeY, 10 * factor);
    const view = plot.getViewport();
    nearly((view.minX + view.maxX) / 2, 5);
    nearly((view.minY + view.maxY) / 2, 5);
    assert.ok(event.prevented, 'the page should not scroll while zooming');
  });

  test('scrolling down zooms out', () => {
    const { plot, listeners } = interactiveChart();
    listeners.wheel(wheel(280, 192, 100));
    nearly(plot._rangeX, 10 * Math.exp(0.1));
    nearly(plot._rangeY, 10 * Math.exp(0.1));
  });

  test('Ctrl+wheel (a trackpad pinch) zooms three times faster', () => {
    const { plot, listeners } = interactiveChart();
    listeners.wheel(wheel(280, 192, -100, true));
    nearly(plot._rangeX, 10 * Math.exp(-0.3));
  });

  test('the point under the mouse stays put: zooming at a corner keeps that corner fixed', () => {
    const bottomLeft = interactiveChart();
    bottomLeft.listeners.wheel(wheel(80, 352, -100));
    nearly(bottomLeft.plot.getViewport().minX, 0);
    nearly(bottomLeft.plot.getViewport().minY, 0);

    const topRight = interactiveChart();
    topRight.listeners.wheel(wheel(480, 32, -100));
    nearly(topRight.plot.getViewport().maxX, 10);
    nearly(topRight.plot.getViewport().maxY, 10);
  });

  test('both axes zoom by the same factor, so their ratio is kept', () => {
    const { plot, listeners } = interactiveChart({ rangeX: 20, rangeY: 10 });
    listeners.wheel(wheel(280, 192, -300));
    nearly(plot._rangeX / plot._rangeY, 2);
  });

  test('ignores the wheel outside the plot area', () => {
    const { plot, listeners } = interactiveChart();
    const event = wheel(10, 10, -100);
    listeners.wheel(event);
    assert.equal(plot.redraws, 0);
    assert.equal(event.prevented, false, 'the page should keep scrolling');
  });

  test('stops zooming out at 1e12 and zooming in at 1e-9', () => {
    for (const [range, deltaY] of [[1e12, 100], [1e-9, -100]]) {
      const { plot, listeners } = interactiveChart({ rangeX: range, rangeY: range });
      listeners.wheel(wheel(280, 192, deltaY));
      assert.equal(plot._rangeX, range);
      assert.equal(plot._rangeY, range);
      assert.equal(plot.redraws, 0);
    }
  });

  test('dragging pans the viewport and keeps its size', () => inBrowser(() => {
    const { plot, listeners } = interactiveChart();
    const down = fakeEvent({ button: 0, clientX: 280, clientY: 192, pointerId: 7 });
    listeners.pointerdown(down);
    assert.equal(plot.style.cursor, 'grabbing');
    assert.equal(plot.captured, 7);
    assert.ok(down.prevented);

    // Dragging right by 40px is 0.1 of the plot width, so the view shifts 1 unit left.
    listeners.pointermove(fakeEvent({ clientX: 320, clientY: 192 }));
    let view = plot.getViewport();
    nearly(view.minX, -1); nearly(view.maxX, 9); nearly(view.minY, 0); nearly(view.maxY, 10);

    // Staying where it is does not move it further...
    listeners.pointermove(fakeEvent({ clientX: 320, clientY: 192 }));
    nearly(plot.getViewport().minX, -1);

    // ...and moving on continues from the last position, not from the start.
    listeners.pointermove(fakeEvent({ clientX: 360, clientY: 192 }));
    view = plot.getViewport();
    nearly(view.minX, -2); nearly(view.maxX, 8);
  }));

  test('dragging up shifts the view down', () => inBrowser(() => {
    const { plot, listeners } = interactiveChart();
    listeners.pointerdown(fakeEvent({ button: 0, clientX: 280, clientY: 192 }));
    listeners.pointermove(fakeEvent({ clientX: 280, clientY: 152 })); // 40px up = 0.125 of the height
    const view = plot.getViewport();
    nearly(view.minX, 0);
    nearly(view.minY, -1.25);
    nearly(view.maxY, 8.75);
  }));

  test('only the left mouse button starts a drag', () => inBrowser(() => {
    const { plot, listeners } = interactiveChart();
    listeners.pointerdown(fakeEvent({ button: 2, clientX: 280, clientY: 192 }));
    assert.equal(plot._drag, undefined);
    assert.equal(plot.style.cursor, 'grab');
  }));

  test('pressing outside the plot area does not start a drag', () => inBrowser(() => {
    const { plot, listeners } = interactiveChart();
    listeners.pointerdown(fakeEvent({ button: 0, clientX: 10, clientY: 10 }));
    assert.equal(plot._drag, undefined);
  }));

  test('moving the mouse without pressing does nothing', () => {
    const { plot, listeners } = interactiveChart();
    listeners.pointermove(fakeEvent({ clientX: 320, clientY: 192 }));
    assert.equal(plot.redraws, 0);
  });

  test('releasing, cancelling or losing the pointer ends the drag', () => {
    for (const ending of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      inBrowser(() => {
        const { plot, listeners } = interactiveChart();
        listeners.pointerdown(fakeEvent({ button: 0, clientX: 280, clientY: 192 }));
        listeners[ending](fakeEvent());
        assert.equal(plot._drag, null, ending);
        assert.equal(plot.style.cursor, 'grab', ending);
        const redrawsBefore = plot.redraws;
        listeners.pointermove(fakeEvent({ clientX: 360, clientY: 192 }));
        assert.equal(plot.redraws, redrawsBefore, `${ending}: moving afterwards must not pan`);
      });
    }
  });

  test('pressing on the chart hides the tooltip', () => {
    const tooltip = fakeTooltip();
    inBrowser(() => {
      const { listeners } = interactiveChart();
      listeners.pointerdown(fakeEvent({ button: 0, clientX: 280, clientY: 192 }));
    }, { tooltip });
    assert.equal(tooltip.attrs.visible, 'false');
  });

  describe('reset button', () => {
    const fakeControl = () => {
      const handlers = {};
      return { handlers, addEventListener(type, handler) { handlers[type] = handler; } };
    };

    test('a click resets the view, and pressing it does not start a chart drag', () => {
      const { plot } = interactiveChart();
      let resets = 0;
      plot.resetViewport = () => { resets += 1; };
      const control = fakeControl();
      plot.attachResetControl(control);

      const press = fakeEvent();
      control.handlers.pointerdown(press);
      assert.ok(press.stopped);
      assert.equal(resets, 0);

      const click = fakeEvent();
      control.handlers.click(click);
      assert.ok(click.stopped);
      assert.equal(resets, 1);
    });

    test('Enter and Space reset the view; other keys do not', () => {
      const { plot } = interactiveChart();
      let resets = 0;
      plot.resetViewport = () => { resets += 1; };
      const control = fakeControl();
      plot.attachResetControl(control);

      for (const key of ['Enter', ' ']) {
        const event = fakeEvent({ key });
        control.handlers.keydown(event);
        assert.ok(event.prevented && event.stopped, `"${key}" should be handled`);
      }
      assert.equal(resets, 2);

      for (const key of ['Tab', 'a', 'Escape']) {
        const event = fakeEvent({ key });
        control.handlers.keydown(event);
        assert.equal(event.prevented, false, `"${key}" should be left alone`);
      }
      assert.equal(resets, 2);
    });
  });
});

describe('PlotBaseElement.renderGraph and its setters', () => {
  function chartElement(overrides = {}) {
    const plot = instanceOf('scatter-plot');
    Object.assign(plot, {
      _width: 500, _height: 400, _center_origin: false, _anchorX: 0, _anchorY: 0,
      _rangeX: 10, _rangeY: 10, _ticks: 5, _points: pts([1, 2]), _title: 'T',
      ...overrides,
    });
    plot.shadowDOM = { innerHTML: '', querySelector: () => null };
    return plot;
  }

  test('draws an SVG once every property is set', () => inBrowser(() => {
    const plot = chartElement();
    plot.renderGraph();
    assert.match(plot.shadowDOM.innerHTML, /^<svg/);
  }));

  test('a zero range still draws, without NaN', () => inBrowser(() => {
    const plot = chartElement({ _rangeX: 0, _rangeY: 0 });
    plot.renderGraph();
    assert.match(plot.shadowDOM.innerHTML, /^<svg/);
    assert.doesNotMatch(plot.shadowDOM.innerHTML, /NaN/);
  }));

  const notReady = [
    ['no width', { _width: undefined }],
    ['a zero width', { _width: 0 }],
    ['a negative height', { _height: -5 }],
    ['no ticks', { _ticks: 0 }],
    ['NaN ticks', { _ticks: NaN }],
    ['a negative x range', { _rangeX: -1 }],
    ['a NaN y range', { _rangeY: NaN }],
    ['no x anchor', { _anchorX: undefined }],
    ['an infinite y anchor', { _anchorY: Infinity }],
    ['no points', { _points: undefined }],
    ['points that are not an array', { _points: 'nope' }],
  ];
  for (const [name, overrides] of notReady) {
    test(`does not draw with ${name}`, () => {
      const plot = chartElement(overrides);
      plot.renderGraph();
      assert.equal(plot.shadowDOM.innerHTML, '');
    });
  }

  test('hides the tooltip before redrawing', () => {
    const tooltip = fakeTooltip();
    inBrowser(() => chartElement().renderGraph(), { tooltip });
    assert.equal(tooltip.attrs.visible, 'false');
  });

  test('wires up the reset button after each redraw', () => inBrowser(() => {
    const plot = chartElement();
    const button = { name: 'reset button' };
    plot.shadowDOM.querySelector = (selector) => (selector === '.reset-view-control' ? button : null);
    let attachedTo = null;
    plot.attachResetControl = (control) => { attachedTo = control; };
    plot.renderGraph();
    assert.equal(attachedTo, button);
  }));

  test('logs the error instead of throwing when drawing fails', () => {
    const plot = chartElement();
    plot.generateGraph = () => { throw new Error('boom'); };
    const logged = [];
    const original = console.error;
    console.error = (...args) => logged.push(args);
    try {
      inBrowser(() => plot.renderGraph());
    } finally {
      console.error = original;
    }
    assert.equal(logged.length, 1);
    assert.equal(logged[0][0], 'Error rendering graph:');
    assert.equal(plot.shadowDOM.innerHTML, '');
  });

  test('setters for the view and size store the value and redraw once', () => {
    const redrawing = {
      CenterOrigin: '_center_origin', AnchorX: '_anchorX', AnchorY: '_anchorY', Width: '_width',
      Height: '_height', RangeX: '_rangeX', RangeY: '_rangeY', Ticks: '_ticks',
    };
    for (const [setter, field] of Object.entries(redrawing)) {
      const plot = instanceOf('scatter-plot');
      let redraws = 0;
      plot.renderGraph = () => { redraws += 1; };
      plot[setter] = 7;
      assert.equal(plot[field], 7, setter);
      assert.equal(redraws, 1, `${setter} should redraw once`);
    }
  });

  test('setters for the data and labels store the value without redrawing', () => {
    const quiet = { Points: '_points', Title: '_title', XAxisLabel: '_xAxisLabel', YAxisLabel: '_yAxisLabel' };
    for (const [setter, field] of Object.entries(quiet)) {
      const plot = instanceOf('scatter-plot');
      let redraws = 0;
      plot.renderGraph = () => { redraws += 1; };
      plot[setter] = 'value';
      assert.equal(plot[field], 'value', setter);
      assert.equal(redraws, 0, `${setter} should not redraw`);
    }
  });
});

describe('tool-tip-modal attributes', () => {
  function tooltipElement(innerHTML = 'ready') {
    const el = instanceOf('tool-tip-modal');
    const nodes = {
      '#tooltip-x': { textContent: '' },
      '#tooltip-y': { textContent: '' },
      '.tooltip': {
        style: {},
        classList: { active: null, toggle(name, on) { this.active = on; } },
      },
    };
    el.shadowDOM = { innerHTML, querySelector: (selector) => nodes[selector] };
    const cssVariables = {};
    el.style = { setProperty: (name, value) => { cssVariables[name] = value; } };
    return { el, nodes, cssVariables };
  }

  test('watches the seven tooltip attributes', () => {
    assert.deepEqual(
      instanceOf('tool-tip-modal').constructor.observedAttributes,
      ['x-coordinate', 'y-coordinate', 'x-position', 'y-position', 'font-size', 'font-family', 'visible'],
    );
  });

  test('shows the coordinates formatted, including negative values', () => {
    const { el, nodes } = tooltipElement();
    el.attributeChangedCallback('x-coordinate', null, '1234.5678');
    el.attributeChangedCallback('y-coordinate', null, '-5');
    assert.equal(nodes['#tooltip-x'].textContent, '1234.57');
    assert.equal(nodes['#tooltip-y'].textContent, '-5.00');
  });

  test('moves the tooltip with pixel positions', () => {
    const { el, nodes } = tooltipElement();
    el.attributeChangedCallback('x-position', null, '120.5');
    el.attributeChangedCallback('y-position', null, '80');
    assert.equal(nodes['.tooltip'].style.left, '120.5px');
    assert.equal(nodes['.tooltip'].style.top, '80px');
  });

  test('is visible only when told "true"', () => {
    const { el, nodes } = tooltipElement();
    el.attributeChangedCallback('visible', 'false', 'true');
    assert.equal(nodes['.tooltip'].classList.active, true);
    el.attributeChangedCallback('visible', 'true', 'false');
    assert.equal(nodes['.tooltip'].classList.active, false);
    el.attributeChangedCallback('visible', 'false', 'yes');
    assert.equal(nodes['.tooltip'].classList.active, false);
  });

  test('sets the font size and family as CSS variables', () => {
    const { el, cssVariables } = tooltipElement();
    el.attributeChangedCallback('font-size', null, '8.0px');
    el.attributeChangedCallback('font-family', null, 'Georgia');
    assert.deepEqual(cssVariables, { '--font-size': '8.0px', '--font-family': 'Georgia' });
  });

  test('ignores unchanged values, and changes made before it has been added to the page', () => {
    const unchanged = tooltipElement();
    unchanged.el.attributeChangedCallback('x-coordinate', '5', '5');
    assert.equal(unchanged.nodes['#tooltip-x'].textContent, '');

    const early = tooltipElement('');
    early.el.attributeChangedCallback('x-coordinate', null, '5');
    assert.equal(early.nodes['#tooltip-x'].textContent, '');
  });

  test('connecting builds the X and Y fields, and leaving it hides the tooltip', () => inBrowser(() => {
    const el = instanceOf('tool-tip-modal');
    const handlers = {};
    el.shadowDOM = {
      innerHTML: '',
      querySelector: () => ({ addEventListener(type, handler) { handlers[type] = handler; } }),
    };
    const attributes = {};
    el.setAttribute = (name, value) => { attributes[name] = value; };

    el.connectedCallback();
    assert.match(el.shadowDOM.innerHTML, /id="tooltip-x"/);
    assert.match(el.shadowDOM.innerHTML, /id="tooltip-y"/);

    handlers.mouseenter();
    assert.equal(attributes.visible, undefined, 'entering the tooltip must not hide it');
    handlers.mouseleave();
    assert.equal(attributes.visible, 'false');
  }));
});
