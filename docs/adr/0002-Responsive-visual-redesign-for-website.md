# ADR 0002: Responsive visual redesign for the website

- **Status:** Accepted
- **Date:** 2026-10-22
- **Scope:** `zing-plot-web` (website layout and styling only; no behavior or library changes)

## Context

1. The original page used two panels of similar size. It did not use the available page space well, gave little visual focus to the chart, and made the interface less convenient to use.

2. The editor and preview areas had mostly fixed sizes and proportions. On narrower screens, this reduced readability and left less room for controls.

3. The page title was too large and looked like a pop-up advertisement, which could confuse users.

4. Users could select the line or scatter chart type in two different places. This duplicated control could lead to confusion.

5. The redesign must keep the existing interaction logic and chart components. It should not add new dependencies or change the application's features.

## Decisions

1. **Use an asymmetric two-column layout on desktop.** The editor uses a narrower column and the chart preview uses the larger column, giving the chart more visual focus.
2. **Use a smaller, simpler header.** The title area is reduced so it supports the page instead of competing with the chart.
3. **Keep one chart-type selector.** Line and scatter selection remains in the editor. The duplicate selector in the preview toolbar is hidden to avoid conflicting controls.
4. **Use a shared visual system.** CSS variables define the main colors, surfaces, borders, and text colors. Buttons, form fields, and panels follow the same style rules.
5. **Make the layout responsive.** On narrower screens, the editor and preview stack vertically. Input and upload areas also stack when there is not enough horizontal space.


## Consequences

1. **The chart receives more space and visual focus.** The editor remains available for manual input and file upload.
2. **Narrower screens are easier to use.** The stacked layout gives controls and chart content more room to remain readable.
3. **Chart-type selection is less confusing.** Users select line or scatter charts only in the editor.
4. **The interface is more consistent and easier to maintain.** Shared CSS variables and component styles make future visual updates simpler.
5. **Application behavior is unchanged.** The redesign changes only the presentation layer; data handling, chart generation, and file upload logic remain the same.
6. **Mobile users may need to scroll between the editor and chart preview.** This is an accepted tradeoff for avoiding overly compressed panels.
