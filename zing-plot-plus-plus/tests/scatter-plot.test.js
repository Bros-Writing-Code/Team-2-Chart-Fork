import scatter from "../src/scatter.js";

const mock_data = [
  { coordinate: [1, 2] },
  { coordinate: [3, 4] },
  { coordinate: [5, 6] }
];

const mock_chart_data = {
  title: "Test Scatter Plot",
  "x-axis-label": "X",
  "y-axis-label": "Y",
  points: mock_data
};

console.log(scatter(mock_chart_data,1000, 1000, false,0, 0,10,10,5));