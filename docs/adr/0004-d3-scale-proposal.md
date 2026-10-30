# ADR 0004: Use d3-scale for chart scales and ticks

- **Status:** Proposed
- **Date:** 2026-10-25
- **Scope:** `zing-plot-web` (demo mode only; the library and the main version are unchanged)

## Context

1. Every chart has to do two pieces of math: turn data values into pixel positions, and pick readable numbers for the axis ticks (e.g. 0, 2, 4, 6 instead of 0, 1.73, 3.46). Our library does both by hand in `plotBase.js`.
2. Issue #25 asks whether we should use D3 for this. d3-scale is D3's module for exactly this math: it converts values to pixels, picks tick values, and can convert a pixel back into a value.
3. d3-scale is pure math and does not draw anything, so it works for both of our charts: the SVG line plot and the canvas scatter plot.
4. The website has no build step, and our tests run without installing any packages. Any new dependency has to work within those limits.

## Decisions

1. **Use d3-scale for both charts.** D3 would do the math for where points go and which tick numbers to show. Our drawing code stays the same.
2. **Show it as a demo first.** Adding `?demo=d3` to the website link draws the charts with D3. The normal link stays the same, so the team can compare both with the same data.
3. **Don't change the library.** The D3 charts are built on top of our existing charts. They reuse our drawing code and only swap in D3's math.
4. **Keep our own tick number formatting.** Ours already switches to scientific notation (like 1.5e6) for very large or very small numbers. D3 doesn't do this by default.
5. **Only download D3 in demo mode.** D3 loads from a CDN with a fixed version, the same way the website loads our library. People using the normal link never download it.

## Consequences

1. **Less custom math to maintain, if adopted.** About 40 lines of our tick and scale code could be replaced by D3.
2. **New features get easier.** D3 can turn a mouse position back into a data value, which our zoom and pan code does by hand today. D3 also supports log scales.
3. **Tick numbers may be slightly different.** D3 picks ticks almost the same way we do, but a few data ranges will show a different number of ticks. Compare the same data with and without `?demo=d3` to see this.
4. **The charts would need D3 to download from a CDN.** If the CDN is down or blocked, the charts won't load. The website already loads our own library this way, so the added risk is small.
5. **Testing needs a team decision.** Our tests can't download D3, so the demo tests use a simple fake version of it. Using d3-scale for real would mean installing D3 as a package and adding an install step to our CI tests.
6. **No new library version is needed for the demo.** The demo lives in the website, so it works as soon as it's merged. It only runs when someone opens the `?demo=d3` link.
