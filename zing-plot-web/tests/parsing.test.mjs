// Unit tests for the manual-entry and validation helpers in script.js.
// File-import cases live in fixtures.test.mjs. Bug IDs match qa/TEST_PLAN.md.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadSiteScript, plain, importText } from './helpers/load-script.mjs';

const site = loadSiteScript();
const numbers = (text) => plain(site.numbers(text));

describe('numbers() - manual X/Y entry', () => {
  test('accepts commas, spaces, semicolons and newlines as separators', () => {
    assert.deepEqual(numbers('1, 2, 3'), [1, 2, 3]);
    assert.deepEqual(numbers('1 2\n3;4'), [1, 2, 3, 4]);
    assert.deepEqual(numbers('  1.5 , -2 , 3e2 '), [1.5, -2, 300]);
  });

  test('rejects empty input', () => {
    assert.throws(() => site.numbers(''), /Please enter X and Y values/);
    assert.throws(() => site.numbers('   '), /Please enter X and Y values/);
  });

  test('rejects words, Infinity and NaN', () => {
    assert.throws(() => site.numbers('1, two'), /valid numbers/);
    assert.throws(() => site.numbers('1, Infinity'), /valid numbers/);
    assert.throws(() => site.numbers('NaN'), /valid numbers/);
  });

  test('a trailing comma does not add a phantom 0 (BUG-10)', () => {
    assert.deepEqual(numbers('1, 2, 3,'), [1, 2, 3]);
  });

  test('a leading comma is ignored (BUG-13)', () => {
    assert.deepEqual(numbers(',1,2'), [1, 2]);
  });

  test('hex, binary and octal literals are rejected (BUG-07)', () => {
    for (const bad of ['0x1F', '0b11', '0o17']) {
      assert.throws(() => site.numbers(bad), /valid numbers/, bad);
    }
  });
});

describe('validate()', () => {
  const base = { title: 't', xLabel: 'x', yLabel: 'y' };

  test('converts numeric strings to numbers', () => {
    assert.deepEqual(plain(site.validate({ ...base, x: ['1', ' 2 '], y: [3, '4.5'] })).x, [1, 2]);
  });

  test('requires X and Y of equal, non-zero length', () => {
    assert.throws(() => site.validate({ ...base, x: [1, 2], y: [1] }), /same number of values/);
    assert.throws(() => site.validate({ ...base, x: [], y: [] }), /same number of values/);
    assert.throws(() => site.validate({ ...base, x: 'nope', y: [] }), /same number of values/);
  });

  test('rejects null, booleans and blanks instead of coercing them to 0/1', () => {
    for (const bad of [null, undefined, true, false, '', '  ']) {
      assert.throws(() => site.validate({ ...base, x: [1], y: [bad] }), /must be numbers/, String(bad));
    }
  });

  test('accepts negative values', () => {
    assert.deepEqual(plain(site.validate({ ...base, x: [-1, 2], y: [1, '-0.5'] })).y, [1, -0.5]);
  });

  test('rejects nested arrays and objects instead of unwrapping them', () => {
    for (const bad of [[5], { v: 5 }]) {
      assert.throws(() => site.validate({ ...base, x: [1], y: [bad] }), /must be numbers/);
    }
  });

  test('rejects values beyond ±1e300 (BUG-12)', () => {
    assert.throws(() => site.validate({ ...base, x: [1], y: [-1.7e308] }), /too large/);
  });

  test('allows zero', () => {
    assert.deepEqual(plain(site.validate({ ...base, x: [0, 1], y: ['0', 2] })).y, [0, 2]);
  });

  test('allows 10,000 points and rejects 10,001', () => {
    const range = (n) => Array.from({ length: n }, (_, i) => i);
    assert.equal(site.validate({ ...base, x: range(10000), y: range(10000) }).x.length, 10000);
    assert.throws(() => site.validate({ ...base, x: range(10001), y: range(10001) }), /10,000/);
  });

  test('does not modify the object passed in', () => {
    const input = { ...base, x: ['1'], y: ['2'] };
    site.validate(input);
    assert.deepEqual(input.x, ['1']);
  });
});

describe('column selection', () => {
  test('picks columns named x and y in any order', () => {
    const data = importText(site, 'a.csv', 'z,Y,X\n1,2,3\n4,5,6');
    assert.deepEqual([data.x, data.y], [[3, 6], [2, 5]]);
  });

  test('otherwise uses the first two numeric columns, skipping text columns', () => {
    const csv = 'name,time,temp,humidity\nA,1,20,50\nB,2,21,55';
    const columns = site.numericColumns(site.parseCSV(csv));
    assert.deepEqual(plain(columns.map((c) => c.name)), ['time', 'temp', 'humidity']);
    const data = importText(site, 'a.csv', csv);
    assert.deepEqual([data.xLabel, data.yLabel, data.x], ['time', 'temp', [1, 2]]);
  });

  test('reads JSON arrays of objects and objects of arrays by key', () => {
    const rows = importText(site, 'a.json', '[{"t":1,"a":5,"b":9},{"t":2,"a":6,"b":8}]');
    assert.deepEqual([rows.xLabel, rows.y], ['t', [5, 6]]);
    const cols = importText(site, 'a.json', '{"time":[1,2],"temp":[3,4]}');
    assert.deepEqual([cols.yLabel, cols.y], ['temp', [3, 4]]);
  });
});

describe('JSON import cleanup', () => {
  test('a malformed point is reported by position (BUG-06)', () => {
    assert.throws(() => importText(site, 'a.json', '[[1,2],[3]]'), /Point 2 is invalid/);
    assert.throws(() => importText(site, 'a.json', '{"points":[[1,2],null]}'), /Point 2 is invalid/);
  });

  test('unknown keys are not copied into the dataset', () => {
    const data = importText(site, 'a.json', '{"x":[1],"y":[2],"evil":"<b>","nested":{"a":1}}');
    assert.deepEqual(Object.keys(data).sort(), ['shortened', 'title', 'x', 'xLabel', 'y', 'yLabel']);
  });

  test('titles and labels become text and are cut to the form limits (BUG-08, BUG-09)', () => {
    const data = importText(site, 'a.json', JSON.stringify({
      title: 12345, xLabel: 'x'.repeat(200), yLabel: { bad: true }, x: [1], y: [2],
    }));
    assert.equal(data.title, '12345');
    assert.equal(data.xLabel.length, 60);
    assert.equal(data.yLabel, 'Sales (Units)'); // not text: keep the current label
    assert.equal(data.shortened, true);
  });
});

describe('escapeXML()', () => {
  // Exists in script.js but is never called; see BUG-02.
  test('escapes the five XML special characters', () => {
    assert.equal(site.escapeXML(`<a href="x">Tom & Jerry's</a>`),
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;');
  });
});

describe('setType()', () => {
  test('does not render a chart by itself', () => {
    const isolated = loadSiteScript();
    isolated.renderChart = () => {
      throw new Error('render should not run');
    };
    assert.doesNotThrow(() => isolated.setType('scatter'));
    assert.doesNotThrow(() => isolated.setType('line'));
  });
});
