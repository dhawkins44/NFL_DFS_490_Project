function createTeamStackingChart(
    teamData,
    containerId = "team-stacking-chart"
) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear existing content
    d3.select(`#${containerId}`).html("");

    const isModal = containerId.includes("modal");
    const margin = {
        top: 20,
        right: 20,
        bottom: isModal ? 70 : 50,
        left: isModal ? 80 : 65,
    };

    // Set the height based on container
    const containerHeight = isModal ? container.clientHeight : 500;
    const legendHeight = isModal ? 120 : 100;
    const availableHeight = containerHeight - legendHeight;
    const width = container.clientWidth - margin.left - margin.right;
    const height = availableHeight - margin.top - margin.bottom;
    // Process data
    const stackData = Object.entries(teamData)
        .map(([team, stats]) => {
            const stackObj = {
                team: team,
                total: stats.total_exposures || 0,
            };
            if (stats.stack_patterns) {
                Object.entries(stats.stack_patterns).forEach(
                    ([pattern, count]) => {
                        stackObj[pattern] = count;
                    }
                );
            }
            return stackObj;
        })
        .filter((d) => d.total > 0);

    // Get all possible stack patterns
    const allPatterns = new Set();
    stackData.forEach((d) => {
        Object.keys(d).forEach((key) => {
            if (key !== "team" && key !== "total") {
                allPatterns.add(key);
            }
        });
    });

    // Get stack keys
    const stackKeys = Array.from(allPatterns);

    // Create stack generator
    const stack = d3.stack().keys(stackKeys).order(d3.stackOrderDescending);
    const stackedData = stack(stackData);

    // Adjust legend dimensions for modal
    const legendItemHeight = isModal ? 24 : 16;
    const legendItemsPerColumn = Math.floor(legendHeight / legendItemHeight);

    // Calculate legend columns based on available width
    const maxLegendWidth = width - margin.left - margin.right;
    const itemWidth = isModal ? 200 : 150;
    const legendColumns = Math.min(
        Math.ceil(stackKeys.length / legendItemsPerColumn),
        Math.floor(maxLegendWidth / itemWidth)
    );

    const legendColumnWidth = maxLegendWidth / legendColumns;

    // Create SVG
    const svg = d3
        .select(`#${containerId}`)
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${width + margin.left + margin.right} ${containerHeight}`
        )
        .attr("preserveAspectRatio", "xMidYMid meet");

    // Create main chart group
    const chartGroup = svg
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3
        .scaleBand()
        .domain(stackData.map((d) => d.team))
        .range([0, width])
        .padding(0.1);

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(stackedData, (d) => d3.max(d, (d) => d[1]))])
        .range([height, 0]);

    // Color scale
    const color = d3.scaleOrdinal().domain(stackKeys).range(d3.schemeTableau10);

    // Create layers
    const layers = chartGroup
        .selectAll("g.stack")
        .data(stackedData)
        .join("g")
        .attr("class", "stack")
        .attr("fill", (d) => color(d.key));

    // Add rectangles to layers
    layers
        .selectAll("rect")
        .data((d) => d)
        .join("rect")
        .attr("x", (d) => x(d.data.team))
        .attr("y", (d) => y(d[1]))
        .attr("height", (d) => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .style("transition", "opacity 0.2s ease")
        .on("mouseover", function (event, d) {
            // Dim all bars
            svg.selectAll("rect").style("opacity", 0.3);

            // Highlight this stack type
            const stackKey = d3.select(this.parentNode).datum().key;
            svg.selectAll("g.stack")
                .filter((s) => s.key === stackKey)
                .selectAll("rect")
                .style("opacity", 1);

            // Highlight legend item
            legend
                .selectAll(".legend-item")
                .style("opacity", (item) => (item.key === stackKey ? 1 : 0.3));

            // Show tooltip
            d3
                .select("#tooltip")
                .style("opacity", 1)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px").html(`
                    <strong>Team:</strong> ${d.data.team}<br>
                    <strong>Stack:</strong> ${stackKey}<br>
                    <strong>Count:</strong> ${d[1] - d[0]} lineups<br>
                    <strong>Percentage:</strong> ${(
                        ((d[1] - d[0]) / d.data.total) *
                        100
                    ).toFixed(1)}%
                `);
        })
        .on("mouseout", function () {
            // Restore all elements
            svg.selectAll("rect").style("opacity", 1);
            legend.selectAll(".legend-item").style("opacity", 1);
            d3.select("#tooltip").style("opacity", 0);
        });

    // Add axes
    chartGroup
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll(".tick text")
        .attr("transform", "rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", isModal ? "16px" : "12px")
        .style("font-weight", "500");

    chartGroup
        .append("g")
        .call(d3.axisLeft(y))
        .selectAll(".tick text")
        .style("font-size", isModal ? "16px" : "12px")
        .style("font-weight", "500");

    // Create legend group
    const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr(
            "transform",
            `translate(${margin.left},${height + margin.top + margin.bottom})`
        );

    // When adding legend items, ensure proper spacing
    const legendItems = legend
        .selectAll(".legend-item")
        .data(stackKeys)
        .join("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => {
            const column = Math.floor(i / legendItemsPerColumn);
            const row = i % legendItemsPerColumn;
            return `translate(${column * legendColumnWidth},${
                row * legendItemHeight
            })`;
        });

    // Add colored rectangles to legend
    legendItems
        .append("rect")
        .attr("width", 10)
        .attr("height", 10)
        .attr("rx", 2)
        .style("fill", (d) => color(d));

    // Add text to legend
    legendItems
        .append("text")
        .attr("x", 14)
        .attr("y", 9)
        .style("font-size", "10px")
        .text((d) => d);

    // Y-axis label
    chartGroup
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + (isModal ? 20 : 6))
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-size", isModal ? "18px" : "12px")
        .style("font-weight", isModal ? "600" : "500")
        .text("Number of Lineups");

    // Modify axis label creation
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + (isModal ? 30 : 12))
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .attr("class", "axis-label")
        .style("text-anchor", "middle")
        .text("Number of Lineups");

    // Update font sizes based on context
    const axisFontSize = isModal ? "14px" : "12px";
    const legendFontSize = isModal ? "14px" : "10px";

    chartGroup.selectAll(".axis text").style("font-size", axisFontSize);

    legend.selectAll("text").style("font-size", legendFontSize);

    // Adjust legend position and spacing
    const legendSpacing = isModal ? 24 : 16;
    legendItems.attr("transform", (d, i) => {
        const column = Math.floor(i / legendItemsPerColumn);
        const row = i % legendItemsPerColumn;
        return `translate(${column * legendColumnWidth},${
            row * legendSpacing
        })`;
    });
}
