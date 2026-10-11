const mock_data = [
  { coordinate: [1, 2] },
  { coordinate: [3, 4] },
  { coordinate: [5, 6] }
];

setTimeout(() => {
    document.getElementById("my-scatter-plot").setChartProperties({
        title: "Test Scatter Plot",
        "x-axis-label": "X",
        "y-axis-label": "Y",
        points: mock_data
    }, 1000, 1000, { x: 250, y: 250 }, 0, 0, 10, 10, 5);
}, 1000);