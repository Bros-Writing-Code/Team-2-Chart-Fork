// Unit tests for the ?demo=d3 link check in script.js.
// See docs/adr/0004-d3-scale-proposal.md.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { loadSiteScript } from './helpers/load-script.mjs';

const site = loadSiteScript();

describe('isD3Demo() - ?demo=d3 link', () => {
  test('is on when the link asks for the d3 demo', () => {
    assert.equal(site.isD3Demo('?demo=d3'), true);
    assert.equal(site.isD3Demo('?lang=en&demo=d3'), true);
  });

  test('is off for a normal link or a different demo', () => {
    assert.equal(site.isD3Demo(''), false);
    assert.equal(site.isD3Demo('?demo=d3x'), false);
    assert.equal(site.isD3Demo('?demo=other'), false);
  });
});
