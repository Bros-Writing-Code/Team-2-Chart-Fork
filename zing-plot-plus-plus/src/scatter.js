/**
 * Generates a scatter plot contained in an SVG HTML object.
 * 
 * @param {Object} chartData - JSON object following the chart format
 * @param {number} x - Width of the component
 * @param {number} y - Height of the component
 * @param {boolean} center - If true, chart frame is fixed by a center point. If false, fixed by left-bottom corner.
 * @param {number} centerX - Anchor coordinate X.
 * @param {number} centerY - Anchor coordinate Y.
 * @param {number} rangeX - Range of displayed X values.
 * @param {number} rangeY - Range of displayed Y values.
 * @param {number} ticks - Number of displayed tick values per axis, result may have slightly less or more ticks due to rounding
 * @returns {string} - An SVG string component containing the chart.
 */
function scatter(chartData, x, y, center, centerx, centery, rangeX, rangeY, ticks) {
    const minDim = Math.min(x, y);

    // sizes of various graph components as a % of SVG size, can change parameters
    const sizes = {
        tickFont: minDim * 0.022,
        labelFont: minDim * 0.03,
        titleFont: minDim * 0.04,
        pointRadius: minDim * 0.008,
        axisStroke: Math.max(minDim * 0.003, 0.5),
        gridStroke: Math.max(minDim * 0.0015, 0.25)
    };

    const margin = { 
        top: minDim * 0.08, 
        right: minDim * 0.05, 
        bottom: minDim * 0.12, 
        left: minDim * 0.12 
    };

    // size of actual graph
    const plotWidth = x - margin.left - margin.right;
    const plotHeight = y - margin.top - margin.bottom;

    // calculate domain of graph
    let domainMinX, domainMaxX, domainMinY, domainMaxY;
    if (center === true) {
        domainMinX = centerx - (rangeX / 2);
        domainMaxX = centerx + (rangeX / 2);
        domainMinY = centery - (rangeY / 2);
        domainMaxY = centery + (rangeY / 2);
    } else {
        domainMinX = centerx;
        domainMaxX = centerx + rangeX;
        domainMinY = centery;
        domainMaxY = centery + rangeY;
    }

    // Data point -> graph point functions, change these if we want to use a different scale (e.g logarithmic)
    const scaleX = (val) => margin.left + ((val - domainMinX) / rangeX) * plotWidth;
    const scaleY = (val) => margin.top + plotHeight - ((val - domainMinY) / rangeY) * plotHeight;

    //add tick lines
    const getTicks = (min, max, maxTicks) => {
        const range = max - min;
        const roughStep = range / maxTicks;
        const stepPower = Math.pow(10, Math.floor(Math.log10(roughStep)));
        const normalizedStep = roughStep / stepPower;
        
        //Clamp ticks to multiples of 1/2/5/10, whichever is closer
        let multiplier = 1;
        if (normalizedStep >= 1.5 && normalizedStep < 3) multiplier = 2;
        else if (normalizedStep >= 3 && normalizedStep < 7) multiplier = 5;
        else if (normalizedStep >= 7) multiplier = 10;
        
        const step = stepPower * multiplier;
        const startTick = Math.ceil(min / step) * step;
        //No epsilon bugs since 1e-6 comes after division
        const numTicks = Math.floor((max - startTick) / step + 1e-6) + 1; 

        const ticks = [];
        for (let i = 0; i < numTicks; i++) {
            ticks.push(startTick + (i * step)); 
        }
        return ticks;
    };
    const xTicks = getTicks(domainMinX, domainMaxX, ticks);
    const yTicks = getTicks(domainMinY, domainMaxY, ticks);

    //format numbers properly
    const formatAxisNumber = (num) => {
        if (num === 0) return "0";
        const absNum = Math.abs(num);
        // switch to scientific notation if numbers are large/small
        if (absNum >= 1e6 || absNum <= 1e-4) {
            return num.toExponential(2); // e.g., 1.50e6
        }
        return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(num);
    };

    // build svg, check style for possible customization, using class tags for simplicity
    let svg = `<svg width="${x}" height="${y}" viewBox="0 0 ${x} ${y}" xmlns="http://www.w3.org/2000/svg">
        <style>
            .grid-line { stroke: #e0e0e0; stroke-width: ${sizes.gridStroke}; stroke-dasharray: 4,4; }
            .axis-line { stroke: #333; stroke-width: ${sizes.axisStroke}; }
            .axis-text { font-family: sans-serif; font-size: ${sizes.tickFont}px; fill: #555; text-anchor: middle; }
            .label-text { font-family: sans-serif; font-size: ${sizes.labelFont}px; font-weight: bold; fill: #333; text-anchor: middle; }
            .title-text { font-family: sans-serif; font-size: ${sizes.titleFont}px; font-weight: bold; fill: #111; text-anchor: middle; }
            .point { fill: #3498db; stroke: #2980b9; stroke-width: ${Math.max(sizes.axisStroke / 2, 0.5)}; opacity: 0.8; }
        </style>
        
        <defs>
            <clipPath id="plot-clip">
                <rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" />
            </clipPath>
        </defs>

        <rect width="${x}" height="${y}" fill="#ffffff" />`;

    //add tick numbers, grid lines
    xTicks.forEach(tick => {
        const px = scaleX(tick);
        const textY = margin.top + plotHeight + (margin.bottom * 0.35);
        svg += `
            <line x1="${px}" y1="${margin.top}" x2="${px}" y2="${margin.top + plotHeight}" class="grid-line" />
            <text x="${px}" y="${textY}" class="axis-text">${formatAxisNumber(tick)}</text>
        `;
    });

    yTicks.forEach(tick => {
        const py = scaleY(tick);
        const textX = margin.left - (margin.left * 0.12);
        const textY = py + (sizes.tickFont * 0.3);
        svg += `
            <line x1="${margin.left}" y1="${py}" x2="${margin.left + plotWidth}" y2="${py}" class="grid-line" />
            <text x="${textX}" y="${textY}" class="axis-text" text-anchor="end">${formatAxisNumber(tick)}</text>
        `;
    });

    //axes, chart title, etc

    svg += `
        <line x1="${margin.left}" y1="${margin.top + plotHeight}" x2="${margin.left + plotWidth}" y2="${margin.top + plotHeight}" class="axis-line" />
        <line x1="${margin.left}" y1="${margin.top}" x2="${margin.left}" y2="${margin.top + plotHeight}" class="axis-line" />
    `;

    const titleY = margin.top * 0.6;
    const xLabelY = y - (margin.bottom * 0.15);
    const yLabelX = margin.left * 0.25;
    const yLabelY = margin.top + (plotHeight / 2);

    svg += `
        <text x="${x / 2}" y="${titleY}" class="title-text">${chartData.title}</text>
        <text x="${margin.left + (plotWidth / 2)}" y="${xLabelY}" class="label-text">${chartData['x-axis-label']}</text>
        <text x="${yLabelX}" y="${yLabelY}" class="label-text" transform="rotate(-90, ${yLabelX}, ${yLabelY})">${chartData['y-axis-label']}</text>
    `;


    //plotting points
    svg += `<g clip-path="url(#plot-clip)">`;
    chartData.points.forEach(p => {
        const [px, py] = p.coordinate;
        svg += `<circle cx="${scaleX(px)}" cy="${scaleY(py)}" r="${sizes.pointRadius}" class="point" />`;
    });
    svg += `</g></svg>`;

    return svg;
}