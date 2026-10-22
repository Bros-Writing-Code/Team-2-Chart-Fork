// This application currently runs entirely in the browser.
const $ = (id) => document.getElementById(id);

// Store one shared dataset so both chart selectors display the same data.
let chartType = "line";
let dataset = {
  title: "Sales Over Time",
  xLabel: "Month",
  yLabel: "Sales (Units)",
  x: [1, 2, 3, 4, 5, 6],
  y: [1, 3, 4, 6, 5, 8],
};
// The last imported file's columns, used by the X/Y column picker.
let imported = null;

let prevWidth = window.innerWidth;
let prevHeight = window.innerHeight;

// Escape user-provided text before inserting it into SVG markup.
function escapeXML(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };

  return String(value).replace(
    /[&<>"']/g,
    (character) => entities[character]
  );
}

// Input limits. MAX_POINTS is expected to change with the Canvas renderer.
const MAX_POINTS = 10000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_ABS = 1e300; // Larger values overflow the axis range math.
const TITLE_MAX = 100; // Matches the form's maxlength.
const LABEL_MAX = 60;

// Plain decimals with optional scientific notation; no hex, binary or octal.
const DECIMAL = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
// A leading, trailing or doubled separator in manual entry.
const EMPTY_ENTRY = /^[,;]|[,;]\s*[,;]|[,;]$/;

// Convert one imported or typed value to a number, or throw a user-facing error.
function toNumber(value) {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    String(value).trim() === ""
  ) {
    throw new Error("X and Y values must be numbers.");
  }
  const text = String(value).trim();
  if (typeof value === "string" && !DECIMAL.test(text)) {
    throw new Error(
      "X and Y values must be valid numbers." +
      (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(text)
        ? " Remove thousands separators (1,000 → 1000)."
        : "")
    );
  }
  const number = Number(text);
  if (!Number.isFinite(number)) {
    throw new Error("X and Y values must be valid numbers.");
  }
  if (Math.abs(number) > MAX_ABS) {
    throw new Error("Values are too large (limit ±1e300).");
  }
  return number;
}

// Convert comma-separated or whitespace-separated input into numeric values.
// Empty entries (",1,2" or "1,2,") are skipped; see EMPTY_ENTRY for the warning.
function numbers(value) {
  const pieces = String(value).trim().split(/[\s,;]+/).filter(Boolean);

  if (!pieces.length) {
    throw new Error("Please enter X and Y values.");
  }

  return pieces.map(toNumber);
}

// Check that X and Y contain matching arrays of valid numeric values.
function validate(data) {
  if (
    !Array.isArray(data.x) ||
    !Array.isArray(data.y) ||
    !data.x.length ||
    data.x.length !== data.y.length
  ) {
    throw new Error("X and Y must contain the same number of values.");
  }
  if (data.x.length > MAX_POINTS) {
    throw new Error(
      `Please use no more than ${MAX_POINTS.toLocaleString("en-US")} points.`
    );
  }
  return { ...data, x: data.x.map(toNumber), y: data.y.map(toNumber) };
}

// Display messages below the input card. kind: true = error, "warning" = warning.
function notify(text, kind = false) {
  $("message").hidden = !text;
  $("message").textContent = text;
  $("message").classList.toggle("error", kind === true);
  $("message").classList.toggle("warning", kind === "warning");
}

// Read and validate the current values from the manual input fields.
function readForm() {
  return validate({
    title: $("chart-title").value.trim() || "Untitled Chart",
    xLabel: $("x-label").value.trim(),
    yLabel: $("y-label").value.trim(),
    x: numbers($("x-values").value),
    y: numbers($("y-values").value),
  });
}

// Populate the manual input fields with an imported dataset.
function updateForm(data) {
  $("chart-title").value = data.title;
  $("x-label").value = data.xLabel;
  $("y-label").value = data.yLabel;
  $("x-values").value = data.x.join(", ");
  $("y-values").value = data.y.join(", ");
}

// Graph Generation functions write here







// Synchronize both chart selectors.
function setType(type) {
  chartType = type;
  document.querySelectorAll("[data-type]").forEach((button) => {
    const selected = button.dataset.type === type;
    button.classList.toggle(
      "active",
      selected && button.classList.contains("type-tab")
    );
    button.classList.toggle(
      "selected",
      selected && button.classList.contains("preview-type")
    );
    button.setAttribute("aria-pressed", String(selected));
  });
}

// Parse CSV columns while supporting quoted fields and optional headers.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const character = text[i];

    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if (
      (character === "\n" || character === "\r") &&
      !quoted
    ) {
      if (character === "\r" && text[i + 1] === "\n") {
        i++;
      }
      row.push(field.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (quoted) {
    throw new Error("CSV has an unclosed quoted field.");
  }
  row.push(field.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }
  if (!rows.length) {
    throw new Error("The CSV file is empty.");
  }
  let headers = null;
  if (rows[0].some((value) => !DECIMAL.test(value))) {
    headers = rows.shift();
  }
  if (!rows.length || rows.some((row) => row.length < 2)) {
    throw new Error("CSV needs two columns: X and Y.");
  }
  const width = Math.max(...rows.map((row) => row.length));
  return {
    columns: Array.from({ length: width }, (_, i) => ({
      name: headers?.[i] || `Column ${i + 1}`,
      generic: !headers?.[i],
      values: rows.map((row) => row[i]),
    })),
  };
}

// Turn [[x, y, ...], ...] or [{x, y, ...}, ...] into columns. The first point
// sets the format; any point that doesn't match it is reported by position.
function pointsToColumns(points) {
  if (!points.length) {
    throw new Error("The JSON file is empty.");
  }
  const isPair = Array.isArray(points[0]);
  const keys = isPair
    ? points[0].map((_, i) => i)
    : Object.keys(points[0] ?? {});
  points.forEach((point, i) => {
    const ok = isPair
      ? Array.isArray(point) && point.length >= 2
      : point && typeof point === "object" && !Array.isArray(point);
    if (!ok || keys.length < 2) {
      throw new Error(`Point ${i + 1} is invalid: expected [x, y] or {x, y}.`);
    }
  });
  return keys.map((key) => ({
    name: isPair ? `Column ${key + 1}` : key,
    generic: isPair,
    values: points.map((point) => point[key]),
  }));
}

// Normalize supported JSON formats into named columns. Only known keys are read.
function parseJSON(text) {
  const value = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (Array.isArray(value)) {
    return { columns: pointsToColumns(value) };
  }
  if (!value || typeof value !== "object") {
    throw new Error(
      "JSON needs X and Y arrays or an array of points."
    );
  }
  const x = value.x || value.xValues;
  const y = value.y || value.yValues;
  const points = value.data || value.points;
  let columns;
  if (x || y) {
    columns = [
      { name: "x", generic: false, values: x },
      { name: "y", generic: false, values: y },
    ];
  } else if (Array.isArray(points)) {
    columns = pointsToColumns(points);
  } else {
    columns = Object.keys(value)
      .filter((key) => Array.isArray(value[key]))
      .map((key) => ({ name: key, generic: false, values: value[key] }));
  }
  if (columns.length < 2) {
    throw new Error(
      "JSON needs X and Y arrays or an array of points."
    );
  }
  return {
    title: value.title ?? value.chartTitle,
    xLabel: value.xLabel ?? value.xAxisLabel,
    yLabel: value.yLabel ?? value.yAxisLabel,
    columns,
  };
}

// Columns with at least one usable number, offered in the X/Y picker. Text
// columns (e.g. names) are left out; a mostly numeric column with a bad cell
// stays in so validate() reports it.
function numericColumns(table) {
  const columns = table.columns.filter(
    (column) => Array.isArray(column.values) && column.values.some((value) => {
      try {
        toNumber(value);
        return true;
      } catch {
        return false;
      }
    })
  );
  // Too few to choose from: fall back so validate() names the real problem.
  return columns.length >= 2 ? columns : table.columns;
}

// Prefer columns named x and y; otherwise use the first two.
function defaultColumns(columns) {
  const find = (name) =>
    columns.find((column) => String(column.name).toLowerCase() === name);
  return find("x") && find("y")
    ? [find("x"), find("y")]
    : [columns[0], columns[1]];
}

// Imported title/labels: text or numbers only, capped to the form's limits.
function cleanText(value, max, fallback) {
  if (typeof value !== "string" && typeof value !== "number") {
    return fallback;
  }
  return String(value).trim().slice(0, max) || fallback;
}

// Build a validated dataset from the chosen columns of an imported table.
function buildDataset(table, xColumn, yColumn, current) {
  const label = (fromFile, column, fallback) =>
    fromFile ?? (column.generic ? fallback : column.name);
  const raw = {
    title: table.title ?? current.title,
    xLabel: label(table.xLabel, xColumn, current.xLabel),
    yLabel: label(table.yLabel, yColumn, current.yLabel),
  };
  const data = validate({
    title: cleanText(raw.title, TITLE_MAX, current.title),
    xLabel: cleanText(raw.xLabel, LABEL_MAX, current.xLabel),
    yLabel: cleanText(raw.yLabel, LABEL_MAX, current.yLabel),
    x: xColumn.values,
    y: yColumn.values,
  });
  data.shortened = String(raw.title).length > TITLE_MAX ||
    String(raw.xLabel).length > LABEL_MAX ||
    String(raw.yLabel).length > LABEL_MAX;
  return data;
}

// Import a local file, validate its data, and update the form and chart.
async function importFile(file) {
  if (!file) {
    return;
  }
  try {
    if (file.size > MAX_FILE_BYTES) {
      throw new Error("Please choose a file smaller than 5 MB.");
    }
    // BACKEND HOOK: upload the file using FormData here if server parsing is added.
    const text = await file.text();
    let table;
    if (/\.json$/i.test(file.name)) {
      table = parseJSON(text);
    } else if (/\.csv$/i.test(file.name)) {
      table = parseCSV(text);
    } else {
      throw new Error("Please choose a .json or .csv file.");
    }
    const columns = numericColumns(table);
    const [xColumn, yColumn] = defaultColumns(columns);
    applyColumns(table, xColumn, yColumn);
    // Let the user pick other columns when the file has more than two.
    // applied: the column indices on screen, restored if a new pick fails.
    imported = {
      table,
      columns,
      applied: [columns.indexOf(xColumn), columns.indexOf(yColumn)],
    };
    $("column-picker").hidden = columns.length < 3;
    for (const [id, chosen] of [["x-column", xColumn], ["y-column", yColumn]]) {
      $(id).replaceChildren(...columns.map((column, i) =>
        new Option(column.name, i, false, column === chosen)
      ));
    }
    $("file-status").textContent = file.name;
    notify(
      `Loaded ${dataset.x.length} data points from ${file.name}.` +
      (dataset.shortened ? " Long title/labels were shortened." : "")
    );
  } catch (error) {
    notify(
      error instanceof SyntaxError
        ? "Invalid JSON. Please check the file format."
        : error.message,
      true
    );
  } finally {
    $("file-input").value = "";
  }
}

// Plot the chosen columns of an imported table and show them in the form.
function applyColumns(table, xColumn, yColumn) {
  dataset = buildDataset(table, xColumn, yColumn, dataset);
  updateForm(dataset);
  renderChart();
}

// Redraw when the user picks a different X or Y column.
function handleColumnChange() {
  try {
    const { table, columns } = imported;
    applyColumns(
      table,
      columns[$("x-column").value],
      columns[$("y-column").value]
    );
    imported.applied = [$("x-column").value, $("y-column").value];
    notify(dataset.shortened ? "Long title/labels were shortened." : "", "warning");
  } catch (error) {
    // Keep the dropdowns in sync with the chart, which still shows the old columns.
    [$("x-column").value, $("y-column").value] = imported.applied;
    notify(error.message, true);
  }
}

// Apply manual input when the Generate Chart button is pressed.
function handleGenerateChart(event) {
  event.preventDefault();
  try {
    dataset = readForm();
    renderChart();
    // Manual data replaces the imported file, so its column choice no longer applies.
    $("column-picker").hidden = true;
    const skipped = [["x-values", "X"], ["y-values", "Y"]]
      .filter(([id]) => EMPTY_ENTRY.test($(id).value.trim()))
      .map(([, name]) => name);
    notify(
      skipped.length
        ? `Ignored empty entries in ${skipped.join(" and ")} values.`
        : "",
      "warning"
    );
    const button = document.querySelector(".generate");
    const originalContent = button.innerHTML;
    button.disabled = true;
    button.textContent = "Chart Generated ✓";
    setTimeout(() => {
      button.innerHTML = originalContent;
      button.disabled = false;
    }, 1200);
  } catch (error) {
    notify(error.message, true);
  }
}

// Draw a chart element onto a canvas of the given size.
// Canvas charts draw themselves; SVG charts (line plot) are turned into an image first.
async function chartToCanvas(chartComponent, width, height) {
  if (typeof chartComponent.toImageCanvas === "function") {
    return chartComponent.toImageCanvas(width, height);
  }
  // Clone the SVG element to avoid modifying the original.
  const svg = chartComponent.shadowRoot.querySelector("svg").cloneNode(true);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  const markup = new XMLSerializer().serializeToString(svg);
  const svgURL = URL.createObjectURL(
    new Blob(
      [markup],
      { type: "image/svg+xml;charset=utf-8" }
    )
  );
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = svgURL;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(image, 0, 0);
    return canvas;
  } finally {
    URL.revokeObjectURL(svgURL);
  }
}

// Convert the current chart into a PNG and download it locally.
async function handleSaveChart() {
  const button = $("save");
  button.disabled = true;
  try {
    // BACKEND HOOK: add cloud storage or a server export request here.
    const chartComponent = $("chart");
    const canvas = await chartToCanvas(chartComponent, 1268, 1420);
    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) {
      throw new Error("Unable to create the image.");
    }
    const downloadURL = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadURL;
    link.download = (
      dataset.title.replace(/[^\p{L}\p{N}\- _]/gu, "") ||
      "chart"
    ) + ".png";
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(downloadURL);
    }, 2000);
    notify("Chart saved as PNG.");
  } catch (error) {
    notify("Could not save the chart. Please try again.", true);
  } finally {
    button.disabled = false;
  }
}

// Register UI event listeners here when adding new buttons or interactions.
function bindEvents() {
  document.querySelectorAll("[data-type]").forEach((button) => {
    button.addEventListener("click", () => {
      setType(button.dataset.type);
      notify("");
    });
  });
  $("chart-form").addEventListener(
    "submit",
    handleGenerateChart
  );
  $("save").addEventListener(
    "click",
    handleSaveChart
  );
  // Open the native file picker from the Choose File button.
  $("choose-file").addEventListener("click", (event) => {
    event.stopPropagation();
    $("file-input").click();
  });
  $("drop-zone").addEventListener("click", (event) => {
    if (event.target !== $("file-input")) {
      $("file-input").click();
    }
  });
  $("file-input").addEventListener("change", (event) => {
    importFile(event.target.files[0]);
  });
  $("x-column").addEventListener("change", handleColumnChange);
  $("y-column").addEventListener("change", handleColumnChange);
  // Allow file drops and show the upload area's highlighted state.
  for (const eventName of ["dragenter", "dragover"]) {
    $("drop-zone").addEventListener(eventName, (event) => {
      event.preventDefault();
      $("drop-zone").classList.add("dragging");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    $("drop-zone").addEventListener(eventName, (event) => {
      event.preventDefault();
      $("drop-zone").classList.remove("dragging");
      if (eventName === "drop" && event.dataTransfer.files.length > 1) {
        notify("Please drop one file at a time.", true);
      } else if (eventName === "drop") {
        importFile(event.dataTransfer.files[0]);
      }
    });
  }
}

let windowResizeTimeout;
window.addEventListener("resize", () => {
  clearTimeout(windowResizeTimeout);
  windowResizeTimeout = setTimeout(() => {
    if (window.innerWidth !== prevWidth || window.innerHeight !== prevHeight) {
      prevWidth = window.innerWidth;
      prevHeight = window.innerHeight;
      renderChart();
    }
  }, 250);
});


function renderChart() {
  try {
    let chart;
    const chartContainer = document.querySelector('.chart-container');

    /* Remove any existing chart from the container */
    while (chartContainer.firstChild) {
      chartContainer.removeChild(chartContainer.firstChild);
    }

    const containerWidth = chartContainer.offsetWidth;
    const containerHeight = chartContainer.offsetHeight;
    if (chartType === "line") {
      chart = document.createElement('line-plot');
    } else {
      chart = document.createElement('canvas-scatter-plot');
    }
    chart.setChartProperties({
      "title": dataset.title,
      "x-axis-label": dataset.xLabel,
      "y-axis-label": dataset.yLabel,
      "points": dataset.x.map((x, i) => ({ coordinate: [x, dataset.y[i]] }))
    }, containerWidth,
      containerHeight,
      false, 0, 0,
      Math.max(...dataset.x) + (Math.max(...dataset.x) - Math.min(...dataset.x)) * 0.1,
      Math.max(...dataset.y) + (Math.max(...dataset.y) - Math.min(...dataset.y)) * 0.1,
      10);
    chart.id = "chart";
    chartContainer.appendChild(chart);
  } catch (error) {
    console.error("Error rendering chart:", error);
    notify("Could not render the chart. Please try again.", true);
  }
}

// Initialize the controls and display the default chart after the HTML loads.
bindEvents();
