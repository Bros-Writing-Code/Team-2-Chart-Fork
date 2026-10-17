import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instanceOf } from './helpers/dom-stub.js';
import '../src/detailedPlots.js';
import '../src/canvasScatterPlot.js';

// 10,000 points is the most the website accepts (zing-plot-web/script.js).
// This test checks that <canvas-scatter-plot> handles that many points correctly
// and prints stats comparing it with <scatter-plot>.
// Timings are measured in Node with a fake canvas, so they show how long our code
// takes to prepare the drawing, not how long a browser takes to paint it.
// They are reported, not asserted (except one generous limit), so CI is not flaky.

const N = 10000;
const RUNS = 5;

// Same random points on every run (seeded), spread over the 0..10 range.
let seed = 42;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const points = Array.from({ length: N }, () => ({ coordinate: [random() * 10, random() * 10] }));
const chartData = { title: 'T', 'x-axis-label': 'X', 'y-axis-label': 'Y', points };

/** A stand-in for the canvas 2D context that only counts and records circles. */
function fakeContext() {
  const ctx = { circles: [] };
  ctx.save = ctx.restore = ctx.beginPath = ctx.rect = ctx.clip = ctx.fill = () => {};
  ctx.arc = (x, y, r) => { ctx.circles.push([x, y, r]); };
  return ctx;
}

/** Runs fn RUNS times and returns the median time in ms and the last result. */
function timed(fn) {
  const times = [];
  let result;
  for (let i = 0; i < RUNS; i++) {
    const start = performance.now();
    result = fn();
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return { ms: times[Math.floor(RUNS / 2)], result };
}

const render = (el) => el.generateGraph(chartData, 500, 400, false, 0, 0, 10, 10, 5);

test(`canvas-scatter-plot draws ${N.toLocaleString()} points correctly`, (t) => {
  // <scatter-plot>: everything, including every point, is SVG markup
  const svgEl = instanceOf('scatter-plot');
  const svgBuild = timed(() => render(svgEl));
  const svg = svgBuild.result;
  const svgCircles = [...svg.matchAll(/<circle cx="([^"]*)" cy="([^"]*)" r="([^"]*)"/g)]
    .map(([, cx, cy, r]) => [+cx, +cy, +r]);

  // <canvas-scatter-plot>: SVG frame only, points drawn on a canvas
  const canvasEl = instanceOf('canvas-scatter-plot');
  canvasEl._points = points;
  const frameBuild = timed(() => render(canvasEl));
  const frame = frameBuild.result;
  const canvasDraw = timed(() => {
    const ctx = fakeContext();
    canvasEl.drawCanvasPoints(ctx);
    return ctx;
  });
  const ctx = canvasDraw.result;

  // Correctness: every point drawn, on exactly the same pixel as the SVG version
  assert.equal(svgCircles.length, N);
  assert.equal(ctx.circles.length, N);
  assert.deepEqual(ctx.circles, svgCircles);
  assert.doesNotMatch(frame, /<circle/);

  // Size: the canvas chart's markup no longer grows with the number of points
  assert.ok(frame.length * 10 < svg.length, 'canvas chart markup should be far smaller');

  // Generous safety limit: catches an accidental slowdown (e.g. redrawing per point
  // in a nested loop), not normal machine-to-machine variation
  assert.ok(canvasDraw.ms < 1000, `drawing ${N} points took ${canvasDraw.ms.toFixed(1)} ms`);

  const kb = (s) => `${(s.length / 1024).toFixed(0)} KB`;
  t.diagnostic(`points: ${N.toLocaleString()} (median of ${RUNS} runs)`);
  t.diagnostic(`<scatter-plot>        SVG build ${svgBuild.ms.toFixed(1)} ms, markup ${kb(svg)}, ${svgCircles.length.toLocaleString()} <circle> elements`);
  t.diagnostic(`<canvas-scatter-plot> SVG frame ${frameBuild.ms.toFixed(1)} ms, markup ${kb(frame)}, 0 <circle> elements, 1 <canvas>`);
  t.diagnostic(`<canvas-scatter-plot> canvas draw calls ${canvasDraw.ms.toFixed(1)} ms (fake canvas, no real pixels)`);
  t.diagnostic(`markup is ${(svg.length / frame.length).toFixed(0)}x smaller; all ${N.toLocaleString()} points on the same pixels as <scatter-plot>`);
});
