/**
 * A stand-in for a canvas 2D context, so canvas drawing can be tested in Node.
 *
 * It draws nothing. It keeps track of the current style (fillStyle, font, ...) and
 * records the shapes that would appear on screen:
 *   lines   - [x1, y1, x2, y2, strokeStyle] for every moveTo/lineTo/stroke
 *   texts   - { text, x, y, font, fill, align } for every fillText, with x/y after
 *             any translate() (the rotated y-axis label is drawn at 0,0 after translate)
 *   circles - [x, y, r] for every arc
 *   clipRect, fills (fillStyle used for each fill()), alphas (globalAlpha for each fill())
 */
export function fakeContext() {
  const state = { fillStyle: '#000', strokeStyle: '#000', font: '', textAlign: 'start', globalAlpha: 1, lineWidth: 1 };
  const stack = [];
  let offset = [0, 0];
  let path = [];
  let lastRect = null;
  const ctx = {
    lines: [], texts: [], circles: [], fills: [], alphas: [], fillRects: [], clipRect: null, dash: [],
    save() { stack.push({ ...state, offset }); },
    restore() { const s = stack.pop(); offset = s.offset; delete s.offset; Object.assign(state, s); },
    translate(x, y) { offset = [offset[0] + x, offset[1] + y]; },
    rotate() {},
    scale() {},
    beginPath() { path = []; },
    moveTo(x, y) { path.push([x, y]); },
    lineTo(x, y) { path.push([x, y]); },
    stroke() { if (path.length === 2) ctx.lines.push([...path[0], ...path[1], state.strokeStyle]); },
    arc(x, y, r) { ctx.circles.push([x, y, r]); },
    fill() { ctx.fills.push(state.fillStyle); ctx.alphas.push(state.globalAlpha); },
    rect(x, y, w, h) { lastRect = [x, y, w, h]; },
    clip() { ctx.clipRect = lastRect; },
    fillRect(x, y, w, h) { ctx.fillRects.push([x, y, w, h, state.fillStyle]); },
    setLineDash(d) { ctx.dash.push(d); },
    fillText(text, x, y) {
      ctx.texts.push({ text, x: x + offset[0], y: y + offset[1], font: state.font, fill: state.fillStyle, align: state.textAlign });
    },
  };
  for (const key of Object.keys(state)) {
    Object.defineProperty(ctx, key, { get: () => state[key], set: (v) => { state[key] = v; } });
  }
  return ctx;
}
