// Unit tests for the manual-entry and validation helpers in script.js.
// File-import cases live in fixtures.test.mjs. Bug IDs match qa/TEST_PLAN.md.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadSiteScript, plain } from './helpers/load-script.mjs';

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

  test('a trailing comma does not add a phantom 0', {
    todo: 'BUG-10: "1, 2, 3," becomes [1, 2, 3, 0]',
  }, () => {
    assert.deepEqual(numbers('1, 2, 3,'), [1, 2, 3]);
  });

  test('a leading comma is ignored', {
    todo: 'BUG-13: ",1,2" is rejected with "Please enter X and Y values."',
  }, () => {
    assert.deepEqual(numbers(',1,2'), [1, 2]);
  });

  test('hex and binary literals are rejected', {
    todo: 'BUG-07: "0x1F" is silently read as 31',
  }, () => {
    assert.throws(() => site.numbers('0x1F'), /valid numbers/);
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

  test('rejects negative values in X or Y with a clear notice (not supported)', () => {
    const notice = /Negative values are not supported/;
    assert.throws(() => site.validate({ ...base, x: [-1, 2], y: [1, 2] }), notice);
    assert.throws(() => site.validate({ ...base, x: [1, 2], y: [1, '-0.5'] }), notice);
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

describe('escapeXML()', () => {
  // Exists in script.js but is never called; see BUG-02.
  test('escapes the five XML special characters', () => {
    assert.equal(site.escapeXML(`<a href="x">Tom & Jerry's</a>`),
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&apos;s&lt;/a&gt;');
  });
});
