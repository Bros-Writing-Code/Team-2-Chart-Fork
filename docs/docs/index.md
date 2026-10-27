Zing Plot Plus Plus

Zing Plot Plus Plus is a small charting library for the web, plus a website built on top of it. You give it a list of x and y values, and it draws a line or scatter chart you can zoom, pan and download. There's no framework to install and no build step.

The project has two parts:

zing-plot-plus-plus is the library. The charts are custom HTML tags (<line-plot>, <scatter-plot> and <canvas-scatter-plot>) and the package is published to npm as bros-zing-plot-plus-plus.
zing-plot-web is a static site that uses the library. You type in numbers or drop in a CSV or JSON file, and it gives you a chart you can save as an image.

If you want to know how the two connect, read the Architecture page. This page covers what each part does from a user's point of view and where the limits are.

The library

Every chart type shares one base class, so they all behave the same way. Each chart can:

draw labelled axes with tick marks that adjust to the data
zoom and pan, with a reset button to get back to the full view
show a tooltip with the exact value when you hover over a point

The line and scatter charts draw as SVG. The canvas scatter chart draws everything onto one <canvas>, which is the one the website uses for scatter plots because it copes better with many points. The SVG scatter chart is still there because the website uses it when exporting to SVG.

To install it:

npm install bros-zing-plot-plus-plus

The website doesn't import the library from this repo. It loads the published package from the jsDelivr CDN, the same way anyone else would.

The website
Getting data in

There are three ways to give the site data: type values in by hand, upload a .csv file, or upload a .json file. Files can be up to 5 MB and 10,000 points. Drop one file at a time.

A few rules about what counts as a number, because this is where most of the early bugs were:

Plain decimals and scientific notation are fine: 12, -3.5, .5, 1e3, 2.5E-4.
Hex, binary and octal (0x10, 0b11) are rejected, and so is anything wrapped in an array.
Values larger than ±1e300 are rejected, since they break the axis range.
Thousands separators aren't allowed. In a file you get an error telling you to write 1000 instead of 1,000. In manual entry the comma separates values, so 1,000 would be read as two numbers.
Extra commas in manual entry (like 1,,2) are skipped, and a yellow warning tells you it happened.

A JSON file can be a list of [x, y] pairs, a list of objects, or an object of arrays. If one point is malformed, the whole file is rejected and the message says which point is wrong, for example "Point 3 is invalid". Titles and axis labels in a file are cut to 100 and 60 characters, and the site tells you when that happens.

Picking columns

If a file has two numeric columns, the site just uses them. If it has three or more, X and Y dropdowns appear so you can choose. By default the site picks columns named x and y (any capitalisation), and if there aren't any it falls back to the first two numeric columns. Text columns are skipped. Changing a dropdown redraws the chart, and the axis label follows the column name unless the file sets its own label.

Saving the chart

Save opens a preview instead of downloading straight away. In the preview you choose an aspect ratio and a format:

PNG is the default. You also pick a resolution, and the image has a white background.
SVG scales to any size without going blurry, so there's no resolution option.

It costs one extra click compared with the old one-step download, and the preview takes a moment to generate.

Layout

On a wide screen the editor sits in a narrow column on the left and the chart gets the larger column on the right. On a narrow screen they stack, so on a phone you scroll between the two. There's one line/scatter selector, in the editor.

Known limits

These are known and listed here so nobody has to find them by accident:

Negative values draw off the chart. The site accepts them, but both axes still start at 0. The library itself handles negative ranges correctly when it's given the right starting point, so the fix is in how the site sets the range.
No zero lines. The axes sit on the left and bottom edges, so data that mixes positive and negative values has no visible line through zero.
One series per chart. The library draws a single line or set of points.
No date or time columns.
The 10,000-point limit is a single constant (MAX_POINTS in script.js). If you change it, change the text in index.html too.
Tests

The library has a test suite that runs with npm test. It uses Node's built-in test runner and fake stand-ins for the browser and canvas, so it runs without a browser. Besides the normal cases, it covers odd inputs: negative numbers, zero ranges and single data points. Because the browser is faked, the tests can't tell you how a chart actually looks on screen, so changes to drawing still need a quick look in a real browser.

Decisions

The reasoning behind the website's main design choices is written up as short decision records:

ADR 0001: Input validation and column selection
ADR 0002: Responsive visual redesign for the website
ADR 0003: Export preview and download options
