function createSummaryMetrics(data) {
    const container = document.getElementById("summary-metrics");
    if (!container) {
        console.error("Summary metrics container not found");
        return;
    }

    const metrics = [
        { label: "Total Lineups", value: data.total_lineups },
        { label: "Avg Points", value: data.avg_fpts.toFixed(2) },
        {
            label: "Avg Salary",
            value: `$${data.avg_salary.toLocaleString()}`,
        },
    ];

    const container_d3 = d3.select("#summary-metrics");

    const cards = container_d3
        .selectAll(".col-md-4")
        .data(metrics)
        .enter()
        .append("div")
        .attr("class", "col-md-4 mb-3")
        .append("div")
        .attr("class", "metric-card text-center p-3");

    cards.append("h3").text((d) => d.value);
    cards
        .append("p")
        .attr("class", "text-muted mb-0")
        .text((d) => d.label);
}

// Performance Line Chart with Confidence Intervals
function createPerformanceChart(containerId, data) {
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width =
        document.getElementById(containerId).offsetWidth -
        margin.left -
        margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear existing content
    d3.select(`#${containerId}`).html("");

    const svg = d3
        .select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip if it doesn't exist
    const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "chart-tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("pointer-events", "none");

    // Calculate statistics
    const avgFpts = data.avg_fpts;
    const stdDev = data.fpts_distribution.std;
    const lineupCount = data.total_lineups;

    // Use actual lineup data instead of random values
    const fptValues =
        data.lineup_points?.map((pts, i) => ({
            lineup: i + 1,
            fpts: pts,
        })) ||
        Array.from({ length: lineupCount }, (_, i) => ({
            lineup: i + 1,
            fpts:
                data.fpts_distribution.min +
                (data.fpts_distribution.max - data.fpts_distribution.min) *
                    Math.random(),
        }));

    // Create scales
    const x = d3.scaleLinear().domain([1, lineupCount]).range([0, width]);
    const y = d3
        .scaleLinear()
        .domain([
            data.fpts_distribution.min - stdDev / 2,
            data.fpts_distribution.max + stdDev / 2,
        ])
        .range([height, 0]);

    // Create confidence interval area
    const confidenceArea = d3
        .area()
        .x((d) => x(d.lineup))
        .y0((d) => y(avgFpts - stdDev))
        .y1((d) => y(avgFpts + stdDev))
        .curve(d3.curveMonotoneX);

    // Add gradient for confidence interval
    const gradientId = `confidence-gradient-${containerId}`;
    const gradient = svg
        .append("defs")
        .append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%");

    gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#28a745")
        .attr("stop-opacity", 0.2);

    gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#28a745")
        .attr("stop-opacity", 0.05);

    // Add confidence interval area
    svg.append("path")
        .datum(fptValues)
        .attr("class", "confidence-area")
        .attr("fill", `url(#${gradientId})`)
        .attr("d", confidenceArea);

    // Create line generator
    const line = d3
        .line()
        .x((d) => x(d.lineup))
        .y((d) => y(d.fpts))
        .curve(d3.curveMonotoneX);

    // Add the line
    svg.append("path")
        .datum(fptValues)
        .attr("class", "performance-line")
        .attr("fill", "none")
        .attr("stroke", "#28a745")
        .attr("stroke-width", 2)
        .attr("d", line);

    // Update points with enhanced tooltip
    svg.selectAll(".point")
        .data(fptValues)
        .enter()
        .append("circle")
        .attr("class", "point")
        .attr("cx", (d) => x(d.lineup))
        .attr("cy", (d) => y(d.fpts))
        .attr("r", 3)
        .attr("fill", "#28a745")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .on("mouseover", function (event, d) {
            const point = d3.select(this);
            const lineupDetails = data.lineup_details[d.lineup - 1];

            // Highlight point
            point
                .attr("r", 5)
                .attr("stroke-width", 2)
                .attr("stroke", "#2c5aa0");

            // Show tooltip
            tooltip.transition().duration(200).style("opacity", 0.9);

            tooltip
                .html(
                    `
                    <div class="tooltip-content">
                        <strong>Lineup #${d.lineup}</strong><br/>
                        <span>Fantasy Points: ${d.fpts.toFixed(2)}</span><br/>
                        <div class="lineup-players">
                            <span>QB: ${lineupDetails.players.QB}</span><br/>
                            <span>RB: ${lineupDetails.players.RB1}, ${
                        lineupDetails.players.RB2
                    }</span><br/>
                            <span>WR: ${lineupDetails.players.WR1}, ${
                        lineupDetails.players.WR2
                    }, ${lineupDetails.players.WR3}</span><br/>
                            <span>TE: ${lineupDetails.players.TE}</span><br/>
                            <span>FLEX: ${
                                lineupDetails.players.FLEX
                            }</span><br/>
                            <span>DST: ${lineupDetails.players.DST}</span>
                        </div>
                    </div>
                `
                )
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", function () {
            // Reset point style
            d3.select(this)
                .attr("r", 3)
                .attr("stroke-width", 1)
                .attr("stroke", "#fff");

            // Hide tooltip
            tooltip.transition().duration(500).style("opacity", 0);
        })
        .on("click", function (event, d) {
            // TODO: Add lineup detail view functionality
            console.log(`Clicked lineup ${d.lineup} with ${d.fpts} points`);
        });

    // Add mean line
    svg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y(avgFpts))
        .attr("y2", y(avgFpts))
        .attr("stroke", "#dc3545")
        .attr("stroke-dasharray", "4,4")
        .attr("stroke-width", 1.5);

    // Add mean label
    svg.append("text")
        .attr("x", width + 5)
        .attr("y", y(avgFpts))
        .attr("dy", "0.35em")
        .attr("text-anchor", "start")
        .style("fill", "#dc3545")
        .style("font-size", "12px")
        .text(`Avg: ${avgFpts.toFixed(2)} pts`);

    // Add axes with grid lines
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).ticks(10))
        .call((g) =>
            g
                .selectAll(".tick line")
                .clone()
                .attr("y2", -height)
                .attr("stroke-opacity", 0.1)
        );

    svg.append("g")
        .call(d3.axisLeft(y))
        .call((g) =>
            g
                .selectAll(".tick line")
                .clone()
                .attr("x2", width)
                .attr("stroke-opacity", 0.1)
        );

    // Add labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .text("Lineup Number");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .style("text-anchor", "middle")
        .text("Fantasy Points");
}

// Salary Distribution Histogram
function createSalaryDistribution(containerId, data) {
    // Set dimensions and margins
    const margin = { top: 40, right: 30, bottom: 50, left: 60 };
    const width =
        document.getElementById(containerId).offsetWidth -
        margin.left -
        margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear existing content
    d3.select(`#${containerId}`).html("");

    // Create SVG
    const svg = d3
        .select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Get actual lineup salaries from the data and convert to numbers
    const salaries = (data.salary_distribution?.lineup_salaries || []).map(
        Number
    );

    console.log("Raw salary data:", {
        salaryDistribution: data.salary_distribution,
        avgSalary: data.avg_salary,
        totalLineups: data.total_lineups,
        minSalary: Math.min(...salaries),
        maxSalary: Math.max(...salaries),
        sampleSalaries: salaries.slice(0, 5),
        uniqueSalaries: new Set(salaries).size,
    });

    if (!salaries.length) {
        console.error("No lineup salary data available");
        return;
    }

    // Calculate actual statistics from the real data
    const actualMean = Math.round(d3.mean(salaries));
    const actualMin = Math.min(...salaries);
    const actualMax = Math.max(...salaries);

    // Create histogram bins with appropriate thresholds
    const histogram = d3
        .histogram()
        .domain([actualMin - 100, actualMax + 100])
        .thresholds(
            d3.thresholdFreedmanDiaconis(salaries, actualMin, actualMax)
        );

    const bins = histogram(salaries);

    // Create scales with the actual domain
    const x = d3
        .scaleLinear()
        .domain([actualMin - 100, actualMax + 100])
        .range([0, width]);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(bins, (d) => d.length)])
        .range([height, 0]);

    // Add tooltips for bars
    const tooltip = d3
        .select("body")
        .append("div")
        .attr("class", "chart-tooltip")
        .style("opacity", 0);

    // Add bars with interaction
    svg.selectAll("rect")
        .data(bins)
        .enter()
        .append("rect")
        .attr("x", (d) => x(d.x0))
        .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
        .attr("y", (d) => y(d.length))
        .attr("height", (d) => height - y(d.length))
        .attr("fill", "#4287f5")
        .attr("fill-opacity", 0.6)
        .on("mouseover", function (event, d) {
            const percentage = ((d.length / data.total_lineups) * 100).toFixed(
                1
            );
            const minSalary = Math.round(d.x0);
            const maxSalary = Math.round(d.x1);

            d3.select(this)
                .attr("fill-opacity", 0.8)
                .attr("stroke", "#2c5aa0")
                .attr("stroke-width", 2);

            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip
                .html(
                    `
                    <strong>Salary Range:</strong> $${minSalary.toLocaleString()} - $${maxSalary.toLocaleString()}<br/>
                    <strong>Lineups:</strong> ${d.length} (${percentage}%)
                    `
                )
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 28 + "px");
        })
        .on("mouseout", function () {
            d3.select(this).attr("fill-opacity", 0.6).attr("stroke", "none");

            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Add hover effects for vertical lines
    const lines = [
        { x: actualMin, color: "#ff7f0e", label: "Minimum Salary" },
        { x: actualMean, color: "#28a745", label: "Average Salary" },
        { x: 50000, color: "#dc3545", label: "Salary Cap" },
    ];

    lines.forEach((line) => {
        const lineGroup = svg.append("g").attr("class", "line-group");

        lineGroup
            .append("line")
            .attr("x1", x(line.x))
            .attr("x2", x(line.x))
            .attr("y1", 0)
            .attr("y2", height)
            .attr("stroke", line.color)
            .attr("stroke-dasharray", "4,4")
            .attr("stroke-width", 1)
            .style("cursor", "pointer")
            .on("mouseover", function (event) {
                d3.select(this)
                    .attr("stroke-width", 2)
                    .attr("stroke-dasharray", "none");

                tooltip.transition().duration(200).style("opacity", 0.9);
                tooltip
                    .html(
                        `<strong>${
                            line.label
                        }:</strong> $${line.x.toLocaleString()}`
                    )
                    .style("left", event.pageX + 10 + "px")
                    .style("top", event.pageY - 28 + "px");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .attr("stroke-width", 1)
                    .attr("stroke-dasharray", "4,4");

                tooltip.transition().duration(500).style("opacity", 0);
            });
    });

    // Update labels with actual values
    const avgLabel = svg
        .append("text")
        .attr("x", x(actualMean))
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("fill", "#28a745")
        .style("font-size", "12px")
        .text(`Avg: $${actualMean.toLocaleString()}`);

    const capLabel = svg
        .append("text")
        .attr("x", x(50000))
        .attr("y", -25)
        .attr("text-anchor", "middle")
        .style("fill", "#dc3545")
        .style("font-size", "12px")
        .text("Cap: $50,000");

    const minLabel = svg
        .append("text")
        .attr("x", x(actualMin))
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("fill", "#ff7f0e")
        .style("font-size", "12px")
        .text(`Min: $${actualMin.toLocaleString()}`);

    // Add axes
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat((d) => `$${d / 1000}K`));

    svg.append("g").call(d3.axisLeft(y));

    // Add labels
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .text("Salary");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .style("text-anchor", "middle")
        .text("Number of Lineups");
}

// Initialize charts when data is available
function initializeSummaryCharts(data) {
    createPerformanceChart("performance-chart", data.summary_stats);
    createSalaryDistribution("salary-histogram", data.summary_stats);
}
