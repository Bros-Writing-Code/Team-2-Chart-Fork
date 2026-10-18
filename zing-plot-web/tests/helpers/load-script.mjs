/**
 * Loads the site's real script.js into a sandbox so its parsing/validation
 * functions can be unit tested without a browser and without rewriting it.
 *
 * script.js wires up DOM listeners at load time (bindEvents(), window resize).
 * We hand it a "black hole" window/document: every property read, call or
 * assignment succeeds and does nothing. Top-level function declarations in a
 * classic script become properties of the sandbox, so tests can call
 * sandbox.parseCSV(...) etc. directly.
 *
 * If script.js is later split into modules, replace this with plain imports.
 */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const SCRIPT = new URL('../../script.js', import.meta.url);

const blackHole = new Proxy(function () {}, {
  get: (_target, key) => (key === Symbol.toPrimitive ? () => 0 : blackHole),
  apply: () => blackHole,
  set: () => true,
});

export function loadSiteScript() {
  const sandbox = vm.createContext({ window: blackHole, document: blackHole, console });
  vm.runInContext(readFileSync(SCRIPT, 'utf8'), sandbox, { filename: 'script.js' });
  return sandbox;
}

/** Values from the sandbox use a different realm's Array/Object; normalise them. */
export const plain = (value) => JSON.parse(JSON.stringify(value));

/** Mirrors the dataset the site starts with (script.js `let dataset`). */
export const DEFAULT_DATASET = {
  title: 'Sales Over Time',
  xLabel: 'Month',
  yLabel: 'Sales (Units)',
  x: [1, 2, 3, 4, 5, 6],
  y: [1, 3, 4, 6, 5, 8],
};

/**
 * Runs file contents through the same steps as importFile() in script.js:
 * size limit, pick a parser by extension, pick the default columns, then
 * buildDataset(). Kept in sync by hand because importFile() also touches the DOM.
 * @returns {object} the validated dataset; throws with the user-facing message.
 */
export function importText(site, name, text) {
  if (Buffer.byteLength(text) > 5 * 1024 * 1024) {
    throw new Error('Please choose a file smaller than 5 MB.');
  }
  let table;
  if (/\.json$/i.test(name)) {
    try {
      table = site.parseJSON(text);
    } catch (error) {
      // importFile() swaps JSON syntax errors for a friendlier message.
      if (error.name === 'SyntaxError') throw new Error('Invalid JSON. Please check the file format.');
      throw error;
    }
  } else if (/\.csv$/i.test(name)) {
    table = site.parseCSV(text);
  } else {
    throw new Error('Please choose a .json or .csv file.');
  }
  const [xColumn, yColumn] = site.defaultColumns(site.numericColumns(table));
  return plain(site.buildDataset(table, xColumn, yColumn, DEFAULT_DATASET));
}
