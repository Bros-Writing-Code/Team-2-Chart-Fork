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

// Convert comma-separated or whitespace-separated input into numeric values.
function numbers(value) {
  const pieces = String(value).trim().split(/[\s,;]+/);

  if (!pieces[0]) {
    throw new Error("Please enter X and Y values.");
  }

  return pieces.map((value) => {
    const number = Number(value);

    if (!Number.isFinite(number)) {
      throw new Error("X and Y values must be valid numbers.");
    }

    return number;
  });
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
  if (data.x.length > 10000) {
    throw new Error("Please use no more than 10,000 points.");
  }
  const toNumber = (value) => {
    if (
      value == null ||
      typeof value === "boolean" ||
      String(value).trim() === ""
    ) {
      throw new Error("X and Y values must be numbers.");
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error("X and Y values must be valid numbers.");
    }
    return number;
  };
  return {
    ...data,
    x: data.x.map(toNumber),
    y: data.y.map(toNumber),
  };
}

// Display success messages or validation errors below the input card.
function notify(text, error = false) {
  $("message").hidden = !text;
  $("message").textContent = text;
  $("message").classList.toggle("error", error);
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







// Synchronize both chart selectors and redraw the shared dataset.
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
  renderChart();
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
  if (
    rows[0].some(
      (value) => value === "" || !Number.isFinite(Number(value))
    )
  ) {
    headers = rows.shift();
  }
  if (!rows.length || rows.some((row) => row.length < 2)) {
    throw new Error("CSV needs two columns: X and Y.");
  }
  let xIndex = 0;
  let yIndex = 1;
  if (headers) {
    const names = headers.map((value) => value.toLowerCase());

    if (names.includes("x") && names.includes("y")) {
      xIndex = names.indexOf("x");
      yIndex = names.indexOf("y");
    }
  }
  return {
    x: rows.map((row) => row[xIndex]),
    y: rows.map((row) => row[yIndex]),
    ...(headers
      ? {
        xLabel: headers[xIndex],
        yLabel: headers[yIndex],
      }
      : {}),
  };
}

// Normalize supported JSON formats into the shared dataset structure.
function parseJSON(text) {
  const value = JSON.parse(text.replace(/^\uFEFF/, ""));
  if (Array.isArray(value)) {
    if (!value.length) {
      throw new Error("The JSON file is empty.");
    }
    return {
      x: value.map(
        (point) => Array.isArray(point) ? point[0] : point.x
      ),
      y: value.map(
        (point) => Array.isArray(point) ? point[1] : point.y
      ),
    };
  }
  if (!value || typeof value !== "object") {
    throw new Error(
      "JSON needs X and Y arrays or an array of points."
    );
  }
  const points = value.data || value.points;
  return {
    ...value,
    title: value.title || value.chartTitle,
    xLabel: value.xLabel || value.xAxisLabel,
    yLabel: value.yLabel || value.yAxisLabel,
    x:
      value.x ||
      value.xValues ||
      (
        Array.isArray(points)
          ? points.map(
            (point) => Array.isArray(point) ? point[0] : point.x
          )
          : undefined
      ),
    y:
      value.y ||
      value.yValues ||
      (
        Array.isArray(points)
          ? points.map(
            (point) => Array.isArray(point) ? point[1] : point.y
          )
          : undefined
      ),
  };
}

// Import a local file, validate its data, and update the form and chart.
async function importFile(file) {
  if (!file) {
    return;
  }
  try {
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Please choose a file smaller than 5 MB.");
    }
    // BACKEND HOOK: upload the file using FormData here if server parsing is added.
    const text = await file.text();
    let incoming;
    if (/\.json$/i.test(file.name)) {
      incoming = parseJSON(text);
    } else if (/\.csv$/i.test(file.name)) {
      incoming = parseCSV(text);
    } else {
      throw new Error("Please choose a .json or .csv file.");
    }
    dataset = validate({
      ...dataset,
      ...incoming,
      title: incoming.title || dataset.title,
      xLabel: incoming.xLabel || dataset.xLabel,
      yLabel: incoming.yLabel || dataset.yLabel,
    });
    updateForm(dataset);
    $("file-status").textContent = file.name;
    renderChart();
    notify(
      `Loaded ${dataset.x.length} data points from ${file.name}.`
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

// Apply manual input when the Generate Chart button is pressed.
function handleGenerateChart(event) {
  event.preventDefault();
  try {
    dataset = readForm();
    renderChart();
    notify("");
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

// Convert the current SVG chart into a PNG and download it locally.
async function handleSaveChart() {
  const button = $("save");
  button.disabled = true;
  try {
    // BACKEND HOOK: add cloud storage or a server export request here.
    const chartComponent = $("chart");
    // Clone the SVG element to avoid modifying the original.
    const svg = chartComponent.shadowRoot.querySelector("svg").cloneNode(true);
    svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    svg.setAttribute("width", "1268");
    svg.setAttribute("height", "1420");
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
      canvas.width = 1268;
      canvas.height = 1420;
      canvas.getContext("2d").drawImage(image, 0, 0);
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
    } finally {
      URL.revokeObjectURL(svgURL);
    }
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
      if (eventName === "drop") {
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
      /* TODO: Implement line chart rendering */
    } else {
      chart = document.createElement('scatter-plot');
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
    }
  } catch (error) {
    console.error("Error rendering chart:", error);
    notify("Could not render the chart. Please try again.", true);
  }
}

// Initialize the controls and display the default chart after the HTML loads.
bindEvents();

