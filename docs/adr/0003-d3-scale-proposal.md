# ADR 0003: Use d3-scale for chart scales and ticks

- **Status:** Proposed
- **Date:** 2026-10-25
- **Scope:** `zing-plot-plus-plus` and `zing-plot-web` (D3 chart versions shown only in the website's demo mode; the main version is unchanged)

## Context

1. Every chart has to do two pieces of math: turn data values into pixel positions, and pick readable numbers for the axis ticks (e.g. 0, 2, 4, 6 instead of 0, 1.73, 3.46). Our library does both by hand in `plotBase.js`.
2. Issue #25 asks whether we should use D3 for this. d3-scale is D3's module for exactly this math: it converts values to pixels, picks tick values, and can convert a pixel back into a value.
3. d3-scale is pure math and does not draw anything, so it works for both of our charts: the SVG line plot and the canvas scatter plot.
4. The website has no build step, and our tests run without installing any packages. Any new dependency has to work within those limits.

## Decisions

1. **Propose d3-scale for both charts.** It would replace our hand-written scale and tick math. The drawing code would not need to change, because a D3 scale is used the same way as our current one.
2. **Build a demo version of the website first.** Opening the website with `?demo=d3` at the end of the link draws the charts with D3. The normal link is unchanged, so the team can try both with the same data. The main version is not switched over by this proposal.
3. **Add one small hook to the library.** The charts get their layout through a method that the D3 versions can override. This lets them reuse all of the real drawing code and swap only the math. The current charts behave exactly as before.
4. **Keep our own tick label formatting.** Our formatter already switches to scientific notation for very large and very small numbers, which D3 does not do by default.
5. **Load D3 from a CDN with a fixed version, only in demo mode**, the same way the website loads our library. Normal visitors never download D3.

## Consequences

1. **Less custom math to maintain, if adopted.** Our tick-picking function and scale formulas (roughly 40 lines) could be replaced with D3 calls.
2. **New features become easy.** D3 can convert the mouse position back into a data value, which our zoom and pan code currently works out by hand. It also supports log scales, which would make log axes a small change.
3. **Tick numbers may differ slightly.** D3 picks ticks using almost the same rule as our code, but a few data ranges will get a different number of ticks. This can be checked by opening the same data with and without `?demo=d3`.
4. **We would depend on an outside library** loading from a CDN.
5. **Testing needs a team decision.** Our tests can't load D3 from a CDN. The demo tests work around this without installing D3, but adopting d3-scale for real would mean adding it as a package and an install step to our CI tests.
6. **The D3 chart versions are published with the library** (version 1.1.0) so the demo link works on the live site. They are not used unless the demo link is opened.
