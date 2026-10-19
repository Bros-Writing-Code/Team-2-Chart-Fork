# ADR 0001: Input validation and column selection

- **Status:** Accepted
- **Date:** 2026-10-17
- **Scope:** `zing-plot-web` (site input handling only; no library changes)

## Context

QA (`qa/TEST_PLAN.md`) confirmed several gaps in how the website reads manual entry and CSV/JSON uploads:

- comma handling in manual entry (BUG-10, BUG-13)
- hex/binary values accepted (BUG-07)
- huge values breaking the axis (BUG-12)
- unbounded or non-string imported titles (BUG-08, BUG-09)
- raw JavaScript errors on malformed JSON points (BUG-06)
- an unhelpful thousands-separator error
- nested arrays silently unwrapped
- unknown JSON keys copied into the dataset

Users also couldn't choose which columns to plot from multi-column files, negative values were rejected, and the upload limits weren't shown anywhere.

The guiding principle for this change was to **keep it simple**: small, targeted changes in `script.js`, with no new dependencies and no new features beyond what's listed here.

## Decisions

### Number parsing
1. **Decimal and scientific notation only.** Accepted values are `12`, `-3.5`, `.5`, `1e3`, `2.5E-4`. Hex, binary and octal (`0x10`, `0b11`, `0o17`) are rejected. Manual entry and file import share one rule (`toNumber()`).
2. **Values are capped at ±1e300.** Anything larger is rejected with "Values are too large". Beyond that, the axis range math (`max + 10% of span`) overflows to `Infinity`.
3. **Nested arrays and objects are not numbers.** `[5]` used to pass because `Number([5]) === 5`. It's now rejected.
4. **Thousands separators get a helpful error** for CSV/JSON: "Remove thousands separators (1,000 → 1000)". In manual entry the comma is the value separator, so `1,000` can't be told apart from two values. The help text says "no thousands separators" instead.
5. **Negative values are accepted.** The old rejection was a workaround for the axes always starting at 0.

### Manual entry
6. **Empty entries are ignored, with a warning.** Leading, trailing and doubled separators (`,1,2`, `1,2,`, `1,,2`) are skipped. The chart still draws, and a yellow warning says "Ignored empty entries in X values." `notify()` gained a `"warning"` state for this.

### File import
7. **Imported title and labels** must be text or a number, which is converted to text. Anything else falls back to the current value. They're cut to the form's limits (title 100, labels 60) and the user is told they were shortened.
8. **Malformed JSON points reject the file**, with the point's position: "Point 3 is invalid: expected [x, y] or {x, y}." This matches how a blank CSV cell is treated (an error, not a silent 0).
9. **Only known JSON keys are read:**
   - `title` / `chartTitle`
   - `xLabel` / `xAxisLabel`
   - `yLabel` / `yAxisLabel`
   - the data keys (`x` / `xValues`, `y` / `yValues`, `data` / `points`, or arrays by name)

   Nothing else is copied into the dataset.
10. **One file per drop.** Dropping several files shows "Please drop one file at a time." Multi-file import isn't supported, and the file picker already allows only one.
11. **Limits are shown in the UI:** "Supports .json and .csv · max 5 MB · up to 10,000 points".

### Column picker
12. **Both parsers return named columns**, so multi-column files work the same way for CSV and JSON. JSON can be an array of `[a, b, c…]` arrays, an array of objects, or an object of arrays.
13. **Default columns:** columns named `x` and `y` (any case) if both exist, otherwise the first two numeric columns. Text columns (e.g. `name`) are skipped.
14. **X/Y dropdowns appear only when a file has 3 or more numeric columns.** Changing a dropdown re-validates and redraws. The axis label follows the column name unless the file sets its own label.
15. **The picker is hidden when the user generates a chart from manual entry**, because manual data replaces the file's data.
16. **Out of scope:** multiple Y series (the library draws one series) and date/time columns.

## Consequences

- **Negative values render off-chart for now.** `renderChart()` still anchors both axes at 0. Making negatives visible depends on the zoom/scroll sub-team's range/anchor work, which we aren't touching. The library itself renders negative domains correctly when given the right anchor.
- **No zero lines.** Axis lines stay on the bottom and left edges of the plot, so mixed-sign data has no visible zero line. Drawing lines through x = 0 and y = 0 would be a future library change.
- **The 10,000-point limit is owned by the Canvas team.** It lives in one constant (`MAX_POINTS` in `script.js`), but the UI text in `index.html` must be updated with it.
- `tests/helpers/load-script.mjs` still mirrors `importFile()`'s extension and size checks by hand. The parsing and dataset-building steps now call the real functions (`numericColumns`, `defaultColumns`, `buildDataset`).
- Fixtures `all-negative.csv` and `mixed-sign.csv` now expect success. The manifest has no `parseBug` entries left.
