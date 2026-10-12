# Zing Plot Plus Plus: QA Test Plan

Owner: Gage (QA). Last run: 2026-10-11 against `main` @ `d067559` (library `zing-plot-plus-plus@1.0.8`).

## Goal

Try to break the tool before users do, and turn each break into an automated
check so it stays fixed. Each part of the tool has its own test approach:

| Layer | What it covers | How it's tested |
|---|---|---|
| Library (`zing-plot-plus-plus/src`) | Chart object → SVG: scaling, ticks, labels, scatter points, line path, tooltip formatting | Unit tests: `zing-plot-plus-plus/tests/plots.test.js` |
| Site input (`zing-plot-web/script.js`) | Manual entry, CSV/JSON parsing, validation | Unit tests: `zing-plot-web/tests/parsing.test.mjs` |
| Bad-input corpus (`qa/fixtures/`) | 46 hostile and edge-case files, each with an expected outcome in `manifest.json` | Data-driven tests: `zing-plot-web/tests/fixtures.test.mjs` |
| Rendering in a real browser | Things only visible on screen: blank charts, NaN, injected HTML, overflow | Manual / scripted browser runs (results below) |

## Running the tests

Requires Node 20 or later. There's nothing to install, because both suites use Node's built-in test runner.

```bash
cd zing-plot-plus-plus && npm test
```

```bash
cd zing-plot-web && node --test
```

CI (`.github/workflows/test.yml`) runs both on every push and pull request. The
publish workflow also runs the library tests before `npm publish`.

### Known bugs are TODO tests

A test marked `{ todo: 'BUG-xx ...' }` describes behaviour we **want** but don't have yet.
It runs and shows up as `# TODO` in the output, but doesn't turn CI red. When you
fix a bug, the TODO test starts passing. Delete its `todo` option so it becomes a
normal test that guards the fix. For fixtures, delete `parseBug` from the
manifest entry.

### Adding a bad input

Put the file in `qa/fixtures/` and add an entry to `qa/fixtures/manifest.json`
(`expect: "ok"` plus the expected values, or `expect: "error"` plus a fragment of the message).
A test fails if a file has no manifest entry.

## Results summary

| Suite | Pass | TODO (known bug) | Fail |
|---|---|---|---|
| Library | 14 | 5 | 0 |
| Site + fixtures | 51 | 8 | 0 |

The parser handled most of the hostile input correctly: empty files, missing
columns, words in number columns, blank cells, unclosed quotes, BOM and CRLF line endings,
Infinity/NaN, and over 10,000 rows. The serious problems turned up in **rendering**:
input that parses fine still draws a broken or blank chart.

## Bugs found

Severity: **High** = wrong or unsafe output on realistic input · **Med** = visible defect or broken feature · **Low** = edge case or polish.
"Suggested owner" follows the roles in the meeting notes; reassign in GitHub issues as needed.

| ID | Sev | Area | Bug | Repro | Suggested fix | Suggested owner |
|---|---|---|---|---|---|---|
| BUG-02 | High | Library | Title and axis labels are inserted into the SVG as raw HTML. A CSV header like `<img src=x onerror=…>` **runs JavaScript** and wipes out every data point. Even `a < b` breaks the chart. | Upload `qa/fixtures/html-in-header.csv` | Escape title/labels in `generateGraph` (script.js already has an unused `escapeXML`; move it into the library) | Charlie |
| BUG-11 | High | Site | Axes always start at 0 (`renderChart` passes anchor `0,0` and range = max + 10%). All-negative data gives a **blank chart**, and mixed-sign data hides the negative points. | Upload `all-negative.csv` (0/3 points visible) or `mixed-sign.csv` (1/3) | Anchor at `min − padding`, range = `(max − min) + 2·padding` | Nathan / Jessie |
| BUG-01 | Med | Library | Line chart connects points in input order. Agreed design was "sort by X first", so unsorted data zig-zags. | Line tab, upload `unsorted-x.csv` | Sort a copy: `[...points].sort((a, b) => a.coordinate[0] - b.coordinate[0])` | David |
| BUG-04 | Med | Library + Site | A range of 0 divides by zero, so coordinates are `NaN` and the chart is blank with no ticks. Happens with a single point at the origin. | Upload `single-point-origin.csv` | Library: treat range 0 as 1. Site: fix together with BUG-11 | Charlie |
| BUG-08 | Med | Site | Form limits title to 100 chars and labels to 60, but imported files have no limit. A 100,000-char title renders 1.4 million px wide. | Upload `title-100k-chars.json` or `header-100k-chars.csv` | Truncate or reject on import, same limits as the form | Nathan |
| BUG-09 | Med | Site | A non-string JSON title (e.g. `12345`) is accepted, then **Save fails** ("Could not save the chart") because `title.replace` isn't a function. | Upload `numeric-title.json`, click Save | `String(value.title)` in `parseJSON` | Nathan |
| BUG-10 | Med | Site | Trailing comma in manual entry adds a phantom `0`: `1, 2, 3,` → `[1, 2, 3, 0]`. | Type `1, 2, 3,` in X and Y, Generate | `.split(…).filter(Boolean)` in `numbers()` | Nathan |
| BUG-14 | Med | CI | Publish workflow fails (red ✗) on every push to main that doesn't bump the version (e.g. runs for `2626a12`, `d067559`). | GitHub Actions history | Skip publish when `npm view zing-plot-plus-plus@<version>` already exists | Brian |
| BUG-15 | Med | Packaging | `package.json` `main` and `start` point to `src/components.js`, which doesn't exist; `src/index.js` is a hello-world. `import 'zing-plot-plus-plus'` fails (the site only works because it loads `src/detailedPlots.js` by URL). | `node -e "import('zing-plot-plus-plus')"` after install | Point `main` at `src/detailedPlots.js` (and export the classes) | Brian |
| BUG-05 | Low | Library | Tooltip shows every negative number in scientific notation (`-5` → `-5.00e+0`) because the "tiny number" check doesn't use `Math.abs`. | Hover a negative point | Compare `Math.abs(num)` | Brian |
| BUG-03 | Low | Library | Missing title/label prints the literal text `undefined`. | Call the library without labels | Default to `''` | Charlie |
| BUG-06 | Low | Site | A `null` inside a JSON point array shows a raw JS error: "Cannot read properties of null (reading 'x')". | Upload `null-point.json` | Validate entries in `parseJSON` | Nathan |
| BUG-07 | Low | Site | Hex/binary literals are accepted as numbers (`0x10` → 16, `0b11` → 3). | Upload `hex-binary-values.csv` | Accept only decimal / scientific notation | Nathan |
| BUG-12 | Low | Site | Values near the float max overflow the axis range to Infinity; Y ticks vanish and points collapse onto the X axis. | Upload `huge-values.csv` | Error if the computed range isn't finite | Nathan |
| BUG-13 | Low | Site | Leading comma (`,1,2`) is rejected with the misleading "Please enter X and Y values." | Type `,1,2` | Same fix as BUG-10 | Nathan |
| BUG-16 | Low | Library | `// TODO` inside the SVG `<style>` isn't a CSS comment; the browser drops the `.plot-line` rule after it. | Read `plotBase.js` `<style>` | Use `/* … */` | Charlie |
| BUG-17 | Low | Library | Changing `title` / `x-axis-label` / `y-axis-label` attributes after render throws `Cannot set properties of null`. The selectors look for tags (`'title-text'`) instead of classes, and the label `<text>` elements have no distinguishing class. | `chart.setAttribute('x-axis-label', 'New')` | Add ids/classes to the text elements and select those | Charlie |

Fix order recommendation: **BUG-02 and BUG-11 first** (security, and blank charts on
ordinary data), then BUG-01 and BUG-04, since they break the two core chart types.

## Manual / exploratory checklist

| Check | Status |
|---|---|
| Every render-relevant fixture loaded via the real `importFile()` in Chrome, both chart types; SVG inspected for NaN, visible points, ticks, injected elements | Done (findings above) |
| Save PNG with normal data | Not yet run |
| Save PNG after numeric-title import | Done (BUG-09) |
| Tooltip hover follows point, shows correct values, hides on leave | Not yet run |
| Window resize redraws the chart | Not yet run |
| Phone-width layout (the `.app` uses `width: 130%` + `scale(0.6)`) | Not yet run, worth checking |
| Drag-and-drop upload | Not yet run |
| Keyboard-only use (tabs, form, file button) | Not yet run |
| Chart type switch keeps data | Done (works) |
| 10,000-point dataset renders on both chart types | Done (works) |

## How the tests reach the code without changing it

- **Library:** the components extend `HTMLElement`, which Node doesn't have.
  `tests/helpers/dom-stub.js` provides a stand-in `HTMLElement` and a
  `customElements.define` that records each class. Tests call `generateGraph()`
  on `Object.create(Class.prototype)` and check the SVG string.
- **Site:** `script.js` is a classic browser script that binds DOM listeners when it
  loads. `tests/helpers/load-script.mjs` runs the real file in a `node:vm` sandbox
  with a no-op `window`/`document`, then calls its functions directly. If
  `script.js` is ever split into modules, swap this for normal imports.
