import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { drawPoints, findPointAt } from '../src/canvasPoints.js';

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

describe('findPointAt (canvas hover)', () => {
  const points = pts([1, 1], [5, 5], [5.5, 5]);

  test('finds the point under the given pixel', () => {
    // [1, 1] is drawn at pixel (2, 2)
    assert.deepEqual(findPointAt(points, double, double, 3, 2, 4).coordinate, [1, 1]);
  });

  test('picks the closest point when several are near', () => {
    // pixels: [5, 5] -> (10, 10), [5.5, 5] -> (11, 10)
    assert.deepEqual(findPointAt(points, double, double, 10.2, 10, 4).coordinate, [5, 5]);
    assert.deepEqual(findPointAt(points, double, double, 10.8, 10, 4).coordinate, [5.5, 5]);
  });

  test('picks the later point on an exact tie, since it is drawn on top', () => {
    const same = pts([5, 5], [5, 5]);
    assert.equal(findPointAt(same, double, double, 10, 10, 4), same[1]);
  });

  test('returns null when nothing is within range', () => {
    assert.equal(findPointAt(points, double, double, 30, 30, 4), null);
    assert.equal(findPointAt([], double, double, 0, 0, 4), null);
  });
});
