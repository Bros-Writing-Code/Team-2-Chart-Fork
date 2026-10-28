/**
 * Browser benchmarks: renders the real chart elements in headless Chromium via Playwright.
 *
 * Usage (from this folder, after npm install and npx playwright install chromium):
 *   node run.mjs [--src <dir>] [--out <file.json>]
 *   --src  the library's src/ folder to measure (default: ../../src)
 *   --out  where to write the results as JSON, in the same format as ../run.mjs,
 *          so ../compare.mjs can compare two runs.
 *
 * Files are served to the browser with page.route, so no web server is needed.
 * See page.html for what exactly is timed.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

const here = dirname(fileURLToPath(import.meta.url));
const { values: args } = parseArgs({
  options: { src: { type: 'string', default: join(here, '../../src') }, out: { type: 'string' } },
});
const srcDir = resolve(args.src);

const ORIGIN = 'http://bench.localhost';
const SIZES = [1000, 10000]; // 10,000 is the most the website accepts
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };
// Cross-origin isolation makes performance.now() precise to microseconds instead of 0.1 ms.
const HEADERS = { 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Embedder-Policy': 'require-corp' };

const browser = await chromium.launch();
try {
  // Fixed size and pixel density so every run draws the same number of pixels.
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
  page.on('pageerror', (err) => console.error('page error:', err.message));
  await page.route(`${ORIGIN}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    const file = path.startsWith('/src/') ? join(srcDir, path.slice('/src/'.length)) : join(here, 'page.html');
    try {
      await route.fulfill({ body: await readFile(file), contentType: TYPES[extname(file)] ?? 'text/plain', headers: HEADERS });
    } catch {
      await route.fulfill({ status: 404 });
    }
  });
  await page.goto(`${ORIGIN}/`);
  await page.waitForFunction(() => window.ready);
  if (!(await page.evaluate(() => crossOriginIsolated))) console.warn('warning: not cross-origin isolated, timers are coarse');

  const results = await page.evaluate((sizes) => window.runBenchmarks(sizes), SIZES);
  for (const [name, ms] of Object.entries(results)) {
    console.log(`${ms.toFixed(3).padStart(10)} ms  ${name}`);
  }
  if (args.out) {
    await writeFile(args.out, JSON.stringify({
      about: `Headless Chromium ${browser.version()}: real chart elements, including SVG layout and canvas drawing, not painting to the screen.`,
      results,
    }, null, 2));
  }
} finally {
  await browser.close();
}
