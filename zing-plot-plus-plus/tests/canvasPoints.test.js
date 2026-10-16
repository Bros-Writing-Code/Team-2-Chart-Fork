import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { drawPoints } from '../src/canvasPoints.js';

// A hand-written stand-in for the canvas 2D context: it records the circles
// drawPoints asks for instead of drawing them, so the test runs in Node.
function fakeContext() {
  const circles = [];
  return {
    circles,
    beginPath() {},
    arc(x, y, r) { circles.push([x, y, r]); },
    fill() {},
  };
}

const pts = (...pairs) => pairs.map((coordinate) => ({ coordinate }));
const double = (v) => v * 2;

describe('drawPoints (canvas scatter)', () => {
  test('draws one circle per point, at its scaled position', () => {
    const ctx = fakeContext();
    drawPoints(ctx, pts([1, 2], [3, 4]), double, double, 5);
    assert.deepEqual(ctx.circles, [[2, 4, 5], [6, 8, 5]]);
  });

  test('draws nothing for zero points', () => {
    const ctx = fakeContext();
    drawPoints(ctx, [], double, double, 5);
    assert.deepEqual(ctx.circles, []);
  });
});
