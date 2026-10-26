# ADR 0003: Export preview and download options

- **Status:** Accepted
- **Date:** 2026-10-24
- **Scope:** `zing-plot-web` export workflow only

## Context

- The original Save button downloaded a PNG immediately. Users could not check the image before saving.
- Users can't choose its aspect ratio, size, or file type. This left something to be desired.
- Download does not support SVG export.

## Decisions

1. Clicking Save opens an export preview to allow user check generated chart instead of downloading immediately.
2. The preview lets users choose an aspect ratio and PNG resolution before downloading.
3. PNG is the default format. Users can also choose SVG. And SVG hides the resolution picker because SVG files are resolution independent.


## Consequences

- Users can check the export before downloading and make choices in one place.
- PNG exports have a white background and match the selected size and ratio.
- SVG exports can scale without losing quality.
- Exporting now takes one extra click and may take a short moment while the preview is generated.
