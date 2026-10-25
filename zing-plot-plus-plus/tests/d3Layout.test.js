import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/dom-stub.js';
import { computeLayout } from '../src/plotBase.js';
import { computeD3Layout } from '../src/d3Layout.js';

// computeD3Layout() is the d3-scale version of computeLayout(), used by the ?demo=d3 charts.
// The real d3.scaleLinear comes from a CDN and can't be loaded in Node, so these tests pass
// in a stand-in that maps values the same straight-line way and records what ticks() was asked for.

const ARGS = [500, 400, false, 0, 0, 10, 10, 5]; // 500x400, 0..10 on both axes, ~5 ticks

// With 500x400: the plot area spans x 80..480 and y 32..352 (see plots.test.js).
const PLOT = { left: 80, right: 480, top: 32, bottom: 352 };

/** A stand-in for d3.scaleLinear: same mapping, and ticks() returns what it was asked for. */
function fakeScaleLinear() {
  let domain = [0, 1];
  let range = [0, 1];
  const scale = (value) => range[0] + ((value - domain[0]) / (domain[1] - domain[0])) * (range[1] - range[0]);
  scale.domain = (d) => { domain = d; return scale; };
  scale.range = (r) => { range = r; return scale; };
  scale.ticks = (count) => ({ domain, count });
  return scale;
}

const layout = (...args) => computeD3Layout(fakeScaleLinear, ...args);

describe('computeD3Layout', () => {
  test('keeps the same margins and sizes as computeLayout()', () => {
    const d3 = layout(...ARGS);
    const current = computeLayout(...ARGS);
    assert.deepEqual(d3.margin, current.margin);
    assert.deepEqual(d3.sizes, current.sizes);
  });

  test('maps the domain corners onto the plot-area corners', () => {
    const { scaleX, scaleY } = layout(...ARGS);
    assert.deepEqual([scaleX(0), scaleX(10)], [PLOT.left, PLOT.right]);
    assert.deepEqual([scaleY(0), scaleY(10)], [PLOT.bottom, PLOT.top]);
  });

  test('puts every value on the same pixel as computeLayout()', () => {
    const d3 = layout(...ARGS);
    const current = computeLayout(...ARGS);
    for (const value of [0, 1.5, 2.5, 7.25, 10]) {
      assert.equal(d3.scaleX(value), current.scaleX(value));
      assert.equal(d3.scaleY(value), current.scaleY(value));
    }
  });

  test('asks the D3 scale for ticks over the visible range', () => {
    const { xTicks, yTicks } = layout(500, 400, false, 2, -3, 10, 20, 5);
    assert.deepEqual(xTicks, { domain: [2, 12], count: 5 });
    assert.deepEqual(yTicks, { domain: [-3, 17], count: 5 });
  });

  test('centers the visible range on the anchor when center is true', () => {
    const { xTicks, yTicks } = layout(500, 400, true, 0, 0, 10, 10, 5);
    assert.deepEqual(xTicks.domain, [-5, 5]);
    assert.deepEqual(yTicks.domain, [-5, 5]);
  });

  test('treats a zero range as 1, like computeLayout()', () => {
    const { xTicks, yTicks } = layout(500, 400, false, 0, 0, 0, 0, 5);
    assert.deepEqual(xTicks.domain, [0, 1]);
    assert.deepEqual(yTicks.domain, [0, 1]);
  });
});
