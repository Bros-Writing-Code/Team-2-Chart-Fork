# ADR 0004: Use d3-axis to draw the line plot's axes

- **Status:** Proposed
- **Date:** 2026-10-25
- **Scope:** `zing-plot-plus-plus` (comparison demo only; no library or website changes)

## Context

1. Our charts draw their axes by hand: the axis lines, the tick marks, the tick numbers, and the grid lines.
2. Issue #25 suggests d3-axis for axis labeling. d3-axis draws a complete axis (line, tick marks and numbers) from a D3 scale.
3. d3-axis can only draw into SVG. It cannot draw on a canvas.
4. On the website, the line plot is drawn with SVG, but the scatter plot is drawn on a canvas. So d3-axis can only be used for the line plot.
5. d3-axis needs D3 scales to work, so this proposal depends on ADR 0003 (d3-scale).

## Decisions

1. **Propose d3-axis for the line plot only.** The scatter plot keeps drawing its own axes on the canvas, using tick values from d3-scale.
2. **Show it in the same side-by-side demo** as ADR 0003, as a third version of the line plot: current, with d3-scale, and with d3-scale plus d3-axis.
3. **Match the current look.** The D3 axes use the same fonts, sizes and colors as our current chart, so any difference in the demo comes from D3 and not from styling.

## Consequences

1. **Less axis-drawing code for the line plot, if adopted.** Our hand-written axis and grid drawing would be replaced by two D3 calls.
2. **Two different ways of drawing axes.** The line plot would use d3-axis and the scatter plot would keep its own canvas code, so axis style changes would need to be made in both places.
3. **One more dependency.** d3-axis needs D3's selection module to draw on the page, so the line plot would rely on three D3 modules instead of one.
4. **The demo draws the axes twice.** It draws our axes first and then replaces them with D3's. This is fine for a demo, but adopting it for real would mean changing how the line plot is built.
5. **Harder to test.** Our tests can check which tick values the axis uses, but not the drawn axis itself, because the tests do not run in a real browser. The drawn result has to be checked by eye in the demo.
6. **Only useful if ADR 0003 is accepted.**
