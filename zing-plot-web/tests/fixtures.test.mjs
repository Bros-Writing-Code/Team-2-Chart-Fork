// Runs every QA fixture in qa/fixtures through the site's real import path and
// checks it against qa/fixtures/manifest.json. To add a case: drop a file in
// qa/fixtures and add a manifest entry. Entries with a parseBug are reported as
// TODO (they describe wanted behaviour that the code does not have yet).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { loadSiteScript, importText } from './helpers/load-script.mjs';

const FIXTURES = new URL('../../qa/fixtures/', import.meta.url);
const { fixtures } = JSON.parse(readFileSync(new URL('manifest.json', FIXTURES), 'utf8'));
const site = loadSiteScript();

describe('QA fixtures', () => {
  test('every fixture file has a manifest entry (and vice versa)', () => {
    const files = readdirSync(FIXTURES).filter((f) => f !== 'manifest.json').sort();
    assert.deepEqual(fixtures.map((f) => f.file).sort(), files);
  });

  for (const fx of fixtures) {
    const options = fx.parseBug ? { todo: `${fx.parseBug}: ${fx.why}` } : {};

    test(`${fx.file}: ${fx.why}`, options, () => {
      const text = readFileSync(new URL(fx.file, FIXTURES), 'utf8');
      const run = () => importText(site, fx.file, text);

      if (fx.expect === 'error') {
        assert.throws(run, (error) => {
          if (fx.error) assert.match(error.message, new RegExp(escapeRegExp(fx.error), 'i'));
          if (fx.errorNot) assert.doesNotMatch(error.message, new RegExp(escapeRegExp(fx.errorNot)));
          return true;
        });
        return;
      }

      const data = run();
      if (fx.x) assert.deepEqual(data.x, fx.x);
      if (fx.y) assert.deepEqual(data.y, fx.y);
      if (fx.n) assert.equal(data.x.length, fx.n);
      for (const key of ['title', 'xLabel', 'yLabel']) {
        if (fx[key] !== undefined) assert.strictEqual(data[key], fx[key], key);
      }
      if (fx.maxTitleLength) assert.ok(data.title.length <= fx.maxTitleLength, `title is ${data.title.length} chars`);
      if (fx.maxLabelLength) {
        assert.ok(data.xLabel.length <= fx.maxLabelLength, `xLabel is ${data.xLabel.length} chars`);
        assert.ok(data.yLabel.length <= fx.maxLabelLength, `yLabel is ${data.yLabel.length} chars`);
      }
    });
  }
});

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
