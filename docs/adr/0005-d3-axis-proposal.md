# ADR 0005: Use d3-axis to draw the line plot's axes

- **Status:** Proposed
- **Date:** 2026-10-25
- **Scope:** `zing-plot-web` (demo mode only; the library and the main version are unchanged)

## Context

1. Our charts draw their axes by hand: the axis lines, the tick marks, the tick numbers, and the grid lines.
2. Issue #25 suggests d3-axis for axis labeling. d3-axis draws a complete axis (line, tick marks and numbers) from a D3 scale.
3. d3-axis can only draw into SVG. It cannot draw on a canvas.
4. On the website, the line plot is drawn with SVG, but the scatter plot is drawn on a canvas. So d3-axis can only be used for the line plot.
5. d3-axis needs D3 scales to work, so this proposal depends on ADR 0004 (d3-scale).

## Decisions

1. **Use d3-axis for the line plot only.** The scatter plot is drawn on a canvas, where d3-axis can't draw, so it keeps drawing its own axes using tick numbers from d3-scale.
2. **Show it in the same demo as ADR 0004.** With `?demo=d3`, the line plot uses d3-scale and d3-axis, and the scatter plot uses d3-scale only.
3. **Keep the current look.** The D3 axes use the same fonts, sizes and colors as our current chart, so any difference you see comes from D3, not from styling.

## Consequences

1. **Less axis code for the line plot, if adopted.** Our hand-written tick numbers and grid lines would be replaced by two D3 calls.
2. **Two ways of drawing axes.** The line plot would use d3-axis and the scatter plot would keep its own canvas code. Changing how axes look would mean updating both.
3. **More D3 to download.** d3-axis also needs D3's selection module, so the line plot would use three D3 modules instead of just d3-scale.
4. **The demo draws tick numbers and grid lines twice.** It draws ours first, then replaces them with D3's. That's fine for a demo, but using it for real would mean changing how the line plot is built.
5. **Harder to test.** Our tests can check which tick numbers the axis uses, but not how the axis looks, because the tests don't run in a browser. The look has to be checked by eye with `?demo=d3`.
6. **Only useful if ADR 0004 (d3-scale) is accepted.**
