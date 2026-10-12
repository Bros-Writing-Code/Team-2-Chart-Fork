/**
 * Minimal browser globals so the web components can be imported in Node.
 *
 * The plot classes extend HTMLElement and register themselves with
 * customElements.define(). Neither exists in Node, so we provide stand-ins and
 * keep a registry of the defined classes. Tests then call the pure SVG-building
 * methods (generateGraph, formatValue) on Object.create(Class.prototype), which
 * skips the constructor (and its attachShadow call) entirely.
 *
 * Why not jsdom: it would add a dependency to a zero-dependency package, and the
 * logic worth testing here is string generation, which needs no real DOM.
 *
 * This module must be imported BEFORE any src/ module.
 */

/** @type {Record<string, Function>} tag name -> class passed to customElements.define */
export const registry = {};

globalThis.HTMLElement ??= class HTMLElement {};
globalThis.customElements ??= {
  define(name, constructor) {
    registry[name] = constructor;
  },
};

/**
 * Returns an instance of a registered element without running its constructor.
 * @param {string} tag - e.g. 'scatter-plot'
 */
export function instanceOf(tag) {
  if (!registry[tag]) throw new Error(`<${tag}> was never registered`);
  return Object.create(registry[tag].prototype);
}
