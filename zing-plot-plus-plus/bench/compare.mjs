/**
 * Compares results from bench/run.mjs or bench/browser/run.mjs and prints a Markdown report.
 *
 * Usage: node bench/compare.mjs --base a.json[,b.json] --head c.json[,d.json] [--threshold 0.25] [--title <heading>]
 *
 * With several files per side, the fastest result for each benchmark is used: noise on a
 * shared CI machine only ever makes things slower, so the minimum is the fairest number.
 * Exits with 1 if any benchmark is more than --threshold slower (0.25 = 25%) and also
 * slower by at least MIN_DELTA_MS, so tiny timings can't fail the build on jitter alone.
 */
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const MIN_DELTA_MS = 0.05;

const { values: args } = parseArgs({
  options: {
    base: { type: 'string' },
    head: { type: 'string' },
    threshold: { type: 'string', default: '0.25' },
    title: { type: 'string', default: 'Performance benchmarks' },
  },
});
if (!args.base || !args.head) {
  console.error('Usage: node bench/compare.mjs --base a.json[,b.json] --head c.json[,d.json] [--threshold 0.25] [--title <heading>]');
  process.exit(2);
}
const threshold = Number(args.threshold);

let about = '';

/** Reads a comma-separated list of result files and keeps the fastest time per benchmark. */
function best(files) {
  const out = {};
  for (const file of files.split(',')) {
    const run = JSON.parse(readFileSync(file, 'utf8'));
    const { results } = run;
    about ||= run.about ?? '';
    for (const [name, ms] of Object.entries(results)) out[name] = Math.min(out[name] ?? Infinity, ms);
  }
  return out;
}

const base = best(args.base);
const head = best(args.head);
const fmt = (ms) => (ms === undefined ? '—' : `${ms.toFixed(3)} ms`);

const rows = [];
let regressions = 0;
for (const name of new Set([...Object.keys(head), ...Object.keys(base)])) {
  const [b, h] = [base[name], head[name]];
  let change = b === undefined ? 'new' : h === undefined ? 'removed' : '';
  if (!change) {
    const ratio = h / b - 1;
    change = `${ratio >= 0 ? '+' : ''}${(ratio * 100).toFixed(1)}%`;
    if (ratio > threshold && h - b >= MIN_DELTA_MS) {
      change += ' ❌';
      regressions++;
    } else if (ratio < -threshold) {
      change += ' 🚀';
    }
  }
  rows.push(`| ${name} | ${fmt(b)} | ${fmt(h)} | ${change} |`);
}

console.log(`## ${args.title}\n`);
console.log('| Benchmark | Base | This branch | Change |');
console.log('| --- | ---: | ---: | ---: |');
console.log(rows.join('\n'));
console.log();
console.log(regressions
  ? `**${regressions} benchmark(s) got more than ${threshold * 100}% slower.** If this is expected, explain why in the PR.`
  : `No benchmark got more than ${threshold * 100}% slower.`);
console.log(`\n<sub>${about} Fastest of the runs on each side.</sub>`);

process.exit(regressions ? 1 : 0);
