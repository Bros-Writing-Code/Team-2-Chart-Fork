import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instanceOf } from './helpers/dom-stub.js';
import { fakeContext } from './helpers/fake-canvas.js';
import { computeLayout } from '../src/plotBase.js';
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

const ARGS = [500, 400, false, 0, 0, 10, 10, 5];

test(`canvas-scatter-plot draws ${N.toLocaleString()} points correctly`, (t) => {
  // <scatter-plot>: everything, including every point, is SVG markup
  const svgEl = instanceOf('scatter-plot');
  const svgBuild = timed(() => svgEl.generateGraph(chartData, ...ARGS));
  const svg = svgBuild.result;
  const svgCircles = [...svg.matchAll(/<circle cx="([^"]*)" cy="([^"]*)"/g)]
    .map(([, cx, cy]) => [+cx, +cy]);

  // <canvas-scatter-plot>: the whole chart, frame and points, drawn on one canvas
  const canvasEl = instanceOf('canvas-scatter-plot');
  const canvasDraw = timed(() => {
    const ctx = fakeContext();
    canvasEl.drawChart(ctx, chartData, computeLayout(...ARGS), 500, 400, '#3498db');
    return ctx;
  });
  const ctx = canvasDraw.result;

  // Correctness: every point drawn, on exactly the same pixel as the SVG version
  assert.equal(svgCircles.length, N);
  assert.equal(ctx.circles.length, N);
  assert.deepEqual(ctx.circles.map(([x, y]) => [x, y]), svgCircles);

  // Generous safety limit: catches an accidental slowdown (e.g. redrawing per point
  // in a nested loop), not normal machine-to-machine variation
  assert.ok(canvasDraw.ms < 1000, `drawing ${N} points took ${canvasDraw.ms.toFixed(1)} ms`);

  const kb = (s) => `${(s.length / 1024).toFixed(0)} KB`;
  t.diagnostic(`points: ${N.toLocaleString()} (median of ${RUNS} runs)`);
  t.diagnostic(`<scatter-plot>        SVG build ${svgBuild.ms.toFixed(1)} ms, markup ${kb(svg)}, ${svgCircles.length.toLocaleString()} <circle> elements`);
  t.diagnostic(`<canvas-scatter-plot> canvas draw calls ${canvasDraw.ms.toFixed(1)} ms (fake canvas, no real pixels), 0 markup, 1 <canvas>`);
  t.diagnostic(`all ${N.toLocaleString()} points on the same pixels as <scatter-plot>`);
});
