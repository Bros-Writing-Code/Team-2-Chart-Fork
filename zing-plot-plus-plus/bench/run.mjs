/**
 * Performance benchmarks for the chart code, run in Node with no dependencies.
 *
 * Usage: node bench/run.mjs [--src <dir>] [--out <file.json>]
 *   --src  the library's src/ folder to measure (default: ./src). CI points this at the
 *          base branch's copy so both versions are measured by the same harness.
 *   --out  where to write the results as JSON (default: print only).
 *
 * Like tests/canvasScatterPlot.10k.test.js, this measures how long our code takes to
 * build the SVG markup or issue the canvas draw calls (against a fake canvas), not how
 * long a browser takes to paint. bench/compare.mjs turns two runs into a report.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { instanceOf } from '../tests/helpers/dom-stub.js';
import { fakeContext } from '../tests/helpers/fake-canvas.js';

const { values: args } = parseArgs({
  options: { src: { type: 'string', default: 'src' }, out: { type: 'string' } },
});
const src = (file) => pathToFileURL(resolve(args.src, file)).href;

/** Imports a src/ module, or returns null if this version of the library doesn't have it. */
async function load(file) {
  try {
    return await import(src(file));
  } catch (err) {
    if (err.code === 'ERR_MODULE_NOT_FOUND') return null;
    throw err;
  }
}

const plotBase = await load('plotBase.js');
await load('detailedPlots.js');
const canvasScatter = await load('canvasScatterPlot.js');
const canvasPoints = await load('canvasPoints.js');

// Same random points on every run (seeded), spread over the 0..10 range.
function makeChartData(n) {
  let seed = 42;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const points = Array.from({ length: n }, () => ({ coordinate: [random() * 10, random() * 10] }));
  return { title: 'T', 'x-axis-label': 'X', 'y-axis-label': 'Y', points };
}

const ARGS = [500, 400, false, 0, 0, 10, 10, 5];
const SIZES = [1000, 10000]; // 10,000 is the most the website accepts

/** name -> () => (() => void): setup that returns the function to time. */
const benchmarks = {};
for (const n of SIZES) {
  const data = makeChartData(n);
  benchmarks[`scatter-plot SVG build, ${n} points`] = () => {
    const el = instanceOf('scatter-plot');
    return () => el.generateGraph(data, ...ARGS);
  };
  benchmarks[`line-plot SVG build, ${n} points`] = () => {
    const el = instanceOf('line-plot');
    return () => el.generateGraph(data, ...ARGS);
  };
  if (canvasScatter) {
    benchmarks[`canvas-scatter-plot draw, ${n} points`] = () => {
      const el = instanceOf('canvas-scatter-plot');
      const layout = plotBase.computeLayout(...ARGS);
      return () => el.drawChart(fakeContext(), data, layout, 500, 400, '#3498db');
    };
  }
  if (canvasPoints) {
    // One mouse move = one findPointAt call; measure 100 of them at seeded positions.
    benchmarks[`canvas hover lookup x100, ${n} points`] = () => {
      const { scaleX, scaleY } = plotBase.computeLayout(...ARGS);
      let seed = 7;
      const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
      const mouse = Array.from({ length: 100 }, () => [random() * 500, random() * 400]);
      return () => {
        for (const [x, y] of mouse) canvasPoints.findPointAt(data.points, scaleX, scaleY, x, y, 4);
      };
    };
  }
}

const SAMPLES = 15;
const MIN_SAMPLE_MS = 20;

/**
 * Times fn and returns the median ms per call. Each sample repeats fn enough times to
 * take at least MIN_SAMPLE_MS, so very fast functions aren't lost in timer noise.
 */
function measure(fn) {
  let iterations = 1;
  for (;;) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    if (performance.now() - start >= MIN_SAMPLE_MS) break;
    iterations *= 2;
  }
  const times = [];
  for (let s = 0; s < SAMPLES; s++) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    times.push((performance.now() - start) / iterations);
  }
  times.sort((a, b) => a - b);
  return times[Math.floor(SAMPLES / 2)];
}

const results = {};
for (const [name, setup] of Object.entries(benchmarks)) {
  try {
    results[name] = measure(setup());
    console.log(`${results[name].toFixed(3).padStart(10)} ms  ${name}`);
  } catch (err) {
    // An older version of the library may have a different API; skip rather than fail.
    console.log(`   skipped     ${name} (${err.message})`);
  }
}

if (args.out) {
  writeFileSync(args.out, JSON.stringify({
    about: `Node ${process.version}, fake canvas: measures building SVG markup and issuing canvas draw calls, not browser painting.`,
    results,
  }, null, 2));
}
