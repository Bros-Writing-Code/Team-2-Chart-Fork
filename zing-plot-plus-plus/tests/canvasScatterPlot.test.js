import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { instanceOf } from './helpers/dom-stub.js';
import { fakeContext } from './helpers/fake-canvas.js';
import '../src/detailedPlots.js';
import { pointDrawRadius } from '../src/canvasScatterPlot.js';
import { computeLayout, resetButtonLayout } from '../src/plotBase.js';

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
    // The reset button is a <button> over the canvas, not drawn text, so leave it out.
    const svg = drawSVG().replace(/<g class="reset-view-control"[\s\S]*?<\/g>/, '');
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

  test('puts the reset button where the SVG has it', () => {
    const { margin } = computeLayout(...ARGS);
    const button = resetButtonLayout(ARGS[0], ARGS[1], margin);
    const svgControl = drawSVG().match(/<g class="reset-view-control"[\s\S]*?<\/g>/)[0];
    assert.ok(svgControl.includes(`transform="translate(${button.x}, ${button.y})"`));
    assert.ok(svgControl.includes(`<rect width="${button.size}" height="${button.size}"`));
    // Its top-right corner is the plot area's (480, 32), see 'clips the points to the plot area'
    assert.equal(button.x + button.size, 480);
    assert.equal(button.y, 32);
  });

  test('describes the chart in words for screen readers', () => {
    const el = instanceOf('canvas-scatter-plot');
    Object.assign(el, { _title: 'Sales', _xAxisLabel: 'Month', _yAxisLabel: 'Units', _points: points });
    assert.equal(el.describe(), 'Sales. Scatter plot of Month vs Units, 3 points');
    assert.equal(instanceOf('canvas-scatter-plot').describe(), 'Scatter plot, 0 points');
  });
});

function inBrowser(fn, { tooltip = null, window: windowProps = {}, createElement } = {}) {
  const names = ['window', 'document', 'cancelAnimationFrame', 'setTimeout', 'clearTimeout'];
  const saved = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]);
  const browser = { tooltip, timers: [], cleared: [], window: { scrollX: 0, scrollY: 0, ...windowProps } };
  Object.assign(globalThis, {
    window: browser.window,
    document: { getElementById: (id) => (id === 'my-tooltip' ? browser.tooltip : null), createElement },
    cancelAnimationFrame() {},
    setTimeout(callback, delay) { browser.timers.push({ callback, delay }); return browser.timers.length; },
    clearTimeout(id) { browser.cleared.push(id); },
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

const fakeTooltip = () => ({
  attrs: {},
  calls: 0,
  setAttribute(name, value) { this.calls += 1; this.attrs[name] = value; },
});

const nearly = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not close to ${expected}`);

describe('canvas-scatter-plot hover tooltip', () => {
  /** A canvas chart (the 500x400 chart used above) with its mouse listeners captured. Call inside inBrowser. */
  function hoverChart({ box = {}, pointList = points } = {}) {
    const el = instanceOf('canvas-scatter-plot');
    el._width = 500;
    el._height = 400;
    el._points = pointList;
    el._layout = computeLayout(...ARGS);
    const handlers = {};
    const canvas = {
      style: {},
      addEventListener(type, handler) { handlers[type] = handler; },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 500, height: 400, ...box }),
    };
    el.shadowDOM = { querySelector: (selector) => (selector === 'canvas' ? canvas : null) };
    el.setupHoverListeners();
    return { el, canvas, handlers, layout: el._layout, radius: pointDrawRadius(el._layout.sizes) };
  }

  // The second point, [2.5, 7.25], is drawn at pixel (180, 120)
  const POINT = [2.5, 7.25];

  test('hovering a point shows the tooltip with its values and position', () => {
    inBrowser((browser) => {
      const { handlers, canvas, layout, radius } = hoverChart();
      const x = layout.scaleX(POINT[0]);
      const y = layout.scaleY(POINT[1]);
      handlers.mousemove({ clientX: x, clientY: y });
      const { attrs } = browser.tooltip;
      assert.equal(attrs['x-coordinate'], '2.5');
      assert.equal(attrs['y-coordinate'], '7.25');
      assert.equal(attrs.visible, 'true');
      assert.equal(attrs['font-size'], '8.0px'); // 2% of the smaller side, 400px
      nearly(Number(attrs['x-position']), x - radius);
      nearly(Number(attrs['y-position']), y - radius);
      assert.equal(canvas.style.cursor, 'pointer');
    }, { tooltip: fakeTooltip() });
  });

  test('adds the page scroll to the tooltip position', () => {
    inBrowser((browser) => {
      const { handlers, layout, radius } = hoverChart();
      const x = layout.scaleX(POINT[0]);
      const y = layout.scaleY(POINT[1]);
      handlers.mousemove({ clientX: x, clientY: y });
      nearly(Number(browser.tooltip.attrs['x-position']), x - radius + 100);
      nearly(Number(browser.tooltip.attrs['y-position']), y - radius + 200);
    }, { tooltip: fakeTooltip(), window: { scrollX: 100, scrollY: 200 } });
  });

  test('still finds the point when the page shows the chart at half size', () => {
    inBrowser((browser) => {
      const box = { left: 40, top: 60, width: 250, height: 200 };
      const { handlers, layout, radius } = hoverChart({ box });
      const x = layout.scaleX(POINT[0]);
      const y = layout.scaleY(POINT[1]);
      handlers.mousemove({ clientX: box.left + x / 2, clientY: box.top + y / 2 });
      const { attrs } = browser.tooltip;
      assert.equal(attrs.visible, 'true');
      nearly(Number(attrs['x-position']), box.left + (x - radius) / 2);
      nearly(Number(attrs['y-position']), box.top + (y - radius) / 2);
    }, { tooltip: fakeTooltip() });
  });

  test('a point counts as hovered within its radius plus 2 pixels, and not beyond', () => {
    inBrowser((browser) => {
      const { handlers, layout, radius } = hoverChart();
      const x = layout.scaleX(POINT[0]);
      const y = layout.scaleY(POINT[1]);
      handlers.mousemove({ clientX: x + radius + 2.5, clientY: y });
      assert.equal(browser.tooltip.attrs.visible, undefined, 'too far away');
      handlers.mousemove({ clientX: x + radius + 1.5, clientY: y });
      assert.equal(browser.tooltip.attrs.visible, 'true', 'close enough');
    }, { tooltip: fakeTooltip() });
  });

  test('empty space shows nothing and starts no timers', () => {
    inBrowser((browser) => {
      const { handlers, canvas } = hoverChart();
      handlers.mousemove({ clientX: 300, clientY: 300 });
      assert.equal(browser.tooltip.calls, 0);
      assert.equal(browser.timers.length, 0);
      assert.equal(canvas.style.cursor, undefined);
    }, { tooltip: fakeTooltip() });
  });

  test('a point just outside the plot area cannot be hovered, because it is clipped', () => {
    inBrowser((browser) => {
      const { handlers, layout } = hoverChart({ pointList: [{ coordinate: [10.1, 5] }] });
      // x = 10.1 is drawn at pixel 484, which is past the plot's right edge (480)
      handlers.mousemove({ clientX: layout.scaleX(10.1), clientY: layout.scaleY(5) });
      assert.equal(browser.tooltip.calls, 0);
    }, { tooltip: fakeTooltip() });
  });

  test('moving off the point hides the tooltip after 100 ms, not at once', () => {
    inBrowser((browser) => {
      const { handlers, canvas, layout } = hoverChart();
      handlers.mousemove({ clientX: layout.scaleX(POINT[0]), clientY: layout.scaleY(POINT[1]) });
      handlers.mousemove({ clientX: 300, clientY: 300 });
      assert.equal(browser.tooltip.attrs.visible, 'true', 'still showing during the delay');
      assert.equal(browser.timers.length, 1);
      assert.equal(browser.timers[0].delay, 100);
      assert.equal(canvas.style.cursor, '', 'the pointer cursor goes at once');
      browser.timers[0].callback();
      assert.equal(browser.tooltip.attrs.visible, 'false');
    }, { tooltip: fakeTooltip() });
  });

  test('leaving the chart hides the tooltip the same way', () => {
    inBrowser((browser) => {
      const { handlers, layout } = hoverChart();
      handlers.mousemove({ clientX: layout.scaleX(POINT[0]), clientY: layout.scaleY(POINT[1]) });
      handlers.mouseleave();
      assert.equal(browser.timers[0].delay, 100);
      browser.timers[0].callback();
      assert.equal(browser.tooltip.attrs.visible, 'false');
    }, { tooltip: fakeTooltip() });
  });

  test('moving back onto the point before the delay ends cancels the hide', () => {
    inBrowser((browser) => {
      const { handlers, layout } = hoverChart();
      const onPoint = { clientX: layout.scaleX(POINT[0]), clientY: layout.scaleY(POINT[1]) };
      handlers.mousemove(onPoint);
      handlers.mousemove({ clientX: 300, clientY: 300 });
      const pendingHide = browser.window.__tooltipTimeout;
      handlers.mousemove(onPoint);
      assert.ok(browser.cleared.includes(pendingHide), 'the pending hide should be cancelled');
    }, { tooltip: fakeTooltip() });
  });

  test('moving within the same point does not update the tooltip again', () => {
    inBrowser((browser) => {
      const { handlers, layout } = hoverChart();
      const x = layout.scaleX(POINT[0]);
      const y = layout.scaleY(POINT[1]);
      handlers.mousemove({ clientX: x, clientY: y });
      const callsAfterFirst = browser.tooltip.calls;
      handlers.mousemove({ clientX: x + 1, clientY: y });
      assert.equal(browser.tooltip.calls, callsAfterFirst);
    }, { tooltip: fakeTooltip() });
  });

  test('does nothing when the page has no tooltip, or the chart has no canvas yet', () => {
    inBrowser(() => {
      const { handlers } = hoverChart();
      assert.deepEqual(handlers, {}, 'no tooltip element: no listeners');
    }, { tooltip: null });

    inBrowser(() => {
      const el = instanceOf('canvas-scatter-plot');
      el.shadowDOM = { querySelector: () => null };
      el.setupHoverListeners(); // must not throw
    }, { tooltip: fakeTooltip() });
  });
});

describe('canvas-scatter-plot toImageCanvas', () => {
  /** Calls toImageCanvas(width, height) on the 500x400 chart, handing check() what happened. */
  function saveAs(width, height, check) {
    const el = instanceOf('canvas-scatter-plot');
    Object.assign(el, {
      _width: 500, _height: 400, _points: points, _title: 'T', _xAxisLabel: 'X', _yAxisLabel: 'Y',
      _layout: computeLayout(...ARGS),
    });
    el.themeColor = () => '#3498db';
    const ctx = fakeContext();
    const calls = [];
    const translate = ctx.translate;
    ctx.translate = (x, y) => { calls.push(['translate', x, y]); translate(x, y); };
    ctx.scale = (x, y) => { calls.push(['scale', x, y]); };
    const canvas = { getContext: () => ctx };
    inBrowser(() => check({ image: el.toImageCanvas(width, height), canvas, ctx, calls }), { createElement: () => canvas });
  }

  test('an image twice the chart size scales the chart up to fill it', () => {
    saveAs(1000, 800, ({ image, canvas, ctx, calls }) => {
      assert.equal(image, canvas);
      assert.deepEqual([image.width, image.height], [1000, 800]);
      assert.deepEqual(calls.slice(0, 2), [['translate', 0, 0], ['scale', 2, 2]]);
      assert.equal(ctx.circles.length, points.length);
      assert.deepEqual(ctx.fillRects[0], [0, 0, 500, 400, '#ffffff'], 'white background at chart size');
    });
  });

  test('a wider image keeps the chart proportions and centers it sideways', () => {
    saveAs(1000, 400, ({ calls }) => {
      assert.deepEqual(calls.slice(0, 2), [['translate', 250, 0], ['scale', 1, 1]]);
    });
  });

  test('a taller image centers the chart vertically', () => {
    saveAs(500, 800, ({ calls }) => {
      assert.deepEqual(calls.slice(0, 2), [['translate', 0, 200], ['scale', 1, 1]]);
    });
  });

  test('the reset button is not drawn into the image', () => {
    saveAs(500, 400, ({ ctx }) => {
      assert.equal(ctx.texts.some((t) => t.text === '↺'), false);
    });
  });
});

describe('canvas-scatter-plot renderGraph', () => {
  /** Runs renderGraph() on a 500x400 chart (or the given size) with a fake page. */
  function renderChart({ devicePixelRatio, width = 500, height = 400, createElement } = {}) {
    const created = {};
    const ctx = fakeContext();
    const scales = [];
    ctx.scale = (x, y) => { scales.push([x, y]); };
    const make = createElement ?? ((tag) => {
      const element = { tag, style: {}, attrs: {}, textContent: '', setAttribute(name, value) { this.attrs[name] = value; } };
      if (tag === 'canvas') element.getContext = () => ctx;
      created[tag] = element;
      return element;
    });
    const el = instanceOf('canvas-scatter-plot');
    Object.assign(el, {
      _width: width, _height: height, _center_origin: false, _anchorX: 0, _anchorY: 0,
      _rangeX: 10, _rangeY: 10, _ticks: 5, _points: points,
      _title: 'Sales', _xAxisLabel: 'Month', _yAxisLabel: 'Units',
    });
    const result = { el, created, ctx, scales, children: null, resetControl: null, hoverWiredUp: false };
    el.shadowDOM = { replaceChildren: (...nodes) => { result.children = nodes; } };
    el.attachResetControl = (button) => { result.resetControl = button; };
    el.setupHoverListeners = () => { result.hoverWiredUp = true; };
    el.themeColor = () => '#123456';
    inBrowser(() => el.renderGraph(), { createElement: make, window: { devicePixelRatio } });
    return result;
  }

  test('builds a style, a canvas and a reset button, and wires them up', () => {
    const { el, created, children, resetControl, hoverWiredUp } = renderChart();
    assert.deepEqual(children.map((node) => node.tag), ['style', 'canvas', 'button']);
    assert.equal(created.canvas.attrs.role, 'img');
    assert.equal(created.canvas.attrs['aria-label'], el.describe());
    assert.equal(created.button.type, 'button');
    assert.equal(created.button.className, 'reset-view-control');
    assert.equal(created.button.title, 'Reset chart view');
    assert.equal(created.button.attrs['aria-label'], 'Reset chart view');
    assert.equal(created.button.textContent, '↺');
    assert.equal(resetControl, created.button);
    assert.ok(hoverWiredUp);
  });

  test('draws the chart in the theme color', () => {
    const { ctx } = renderChart();
    assert.equal(ctx.circles.length, points.length);
    assert.deepEqual(ctx.fills.slice(-points.length), Array(points.length).fill('#123456'));
  });

  test('on a normal screen the canvas is as many pixels as the chart is wide and tall', () => {
    const { created, scales } = renderChart();
    assert.deepEqual([created.canvas.width, created.canvas.height], [500, 400]);
    assert.deepEqual([created.canvas.style.width, created.canvas.style.height], ['500px', '400px']);
    assert.deepEqual(scales, [[1, 1]]);
  });

  test('on a 2x screen the canvas has twice the pixels but the same on-page size', () => {
    const { created, scales } = renderChart({ devicePixelRatio: 2 });
    assert.deepEqual([created.canvas.width, created.canvas.height], [1000, 800]);
    assert.deepEqual([created.canvas.style.width, created.canvas.style.height], ['500px', '400px']);
    assert.deepEqual(scales, [[2, 2]]);
  });

  test('rounds the pixel size on screens with fractional scaling', () => {
    const { created } = renderChart({ devicePixelRatio: 1.5, width: 501, height: 401 });
    assert.deepEqual([created.canvas.width, created.canvas.height], [752, 602]); // 751.5 and 601.5
  });

  test('puts the reset button in the corner computed by resetButtonLayout', () => {
    const { created } = renderChart();
    const button = resetButtonLayout(500, 400, computeLayout(...ARGS).margin);
    assert.ok(created.style.textContent.includes(`left: ${button.x}px`));
    assert.ok(created.style.textContent.includes(`top: ${button.y}px`));
  });

  test('logs the error instead of throwing when the page cannot create elements', () => {
    const logged = [];
    const original = console.error;
    console.error = (...args) => logged.push(args);
    try {
      renderChart({ createElement: () => { throw new Error('no DOM'); } });
    } finally {
      console.error = original;
    }
    assert.equal(logged.length, 1);
    assert.equal(logged[0][0], 'Error rendering graph:');
  });
});

describe('canvas-scatter-plot connecting and theme color', () => {
  test('connecting turns on zoom and pan, and redraws only a chart that was set up earlier', () => {
    const el = instanceOf('canvas-scatter-plot');
    let listeners = 0;
    let redraws = 0;
    el.setupViewportListeners = () => { listeners += 1; };
    el.renderGraph = () => { redraws += 1; };
    el.connectedCallback();
    assert.deepEqual([listeners, redraws], [1, 0]);
    el._layout = {};
    el.connectedCallback();
    assert.deepEqual([listeners, redraws], [2, 1]);
  });

  test('themeColor reads the --chart-color-theme CSS variable, or falls back to blue', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'getComputedStyle');
    try {
      globalThis.getComputedStyle = () => ({ getPropertyValue: (name) => (name === '--chart-color-theme' ? '  rebeccapurple ' : '') });
      assert.equal(instanceOf('canvas-scatter-plot').themeColor(), 'rebeccapurple');
      globalThis.getComputedStyle = () => ({ getPropertyValue: () => '' });
      assert.equal(instanceOf('canvas-scatter-plot').themeColor(), '#3498db');
    } finally {
      if (original) Object.defineProperty(globalThis, 'getComputedStyle', original);
      else delete globalThis.getComputedStyle;
    }
  });
});