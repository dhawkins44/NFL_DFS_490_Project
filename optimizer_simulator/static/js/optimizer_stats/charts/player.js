const cloudName = "dcsd2trwx";

function createPlayerExposureChart(
    playerData,
    containerId = "player-exposure-chart"
) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Convert the data object to an array and sort by exposure rate
    const players = Object.entries(playerData)
        .map(([name, stats]) => ({
            name: name,
            exposure: stats.exposure_rate || 0,
            fpts: stats.avg_fpts || 0,
        }))
        .sort((a, b) => b.exposure - a.exposure)
        .slice(0, 20); // Top 20 players

    const isModal = containerId.includes("modal");

    // Increase bottom margin to accommodate rotated labels
    const margin = {
        top: 20,
        right: 20,
        bottom: isModal ? 115 : 100,
        left: 60,
    };

    const width = container.offsetWidth - margin.left - margin.right;
    const height = isModal ? 500 : 400;

    // Clear any existing chart
    d3.select(`#${containerId}`).html("");

    const svg = d3
        .select(`#${containerId}`)
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${width + margin.left + margin.right} ${
                height + margin.top + margin.bottom
            }`
        )
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Set up scales
    const x = d3
        .scaleBand()
        .range([0, width])
        .padding(0.1)
        .domain(players.map((d) => d.name));

    const y = d3
        .scaleLinear()
        .range([height, 0])
        .domain([0, d3.max(players, (d) => d.exposure)]);

    // Add bars
    svg.selectAll(".bar")
        .data(players)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", (d) => x(d.name))
        .attr("width", x.bandwidth())
        .attr("y", (d) => y(d.exposure))
        .attr("height", (d) => height - y(d.exposure))
        .style("fill", "#0a2342")
        .on("mouseover", function (event, d) {
            d3
                .select("#tooltip")
                .style("opacity", 1)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px").html(`
                    Player: ${d.name}<br/>
                    Exposure: ${d.exposure.toFixed(1)}%<br/>
                    Avg Points: ${d.fpts.toFixed(1)}
                `);
        })
        .on("mouseout", function () {
            d3.select("#tooltip").style("opacity", 0);
        });

    // Add axes with adjusted text positioning
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-45)")
        .attr("dx", "-0.5em")
        .attr("dy", "0.5em")
        .style("text-anchor", "end")
        .style("font-size", isModal ? "16px" : "12px")
        .style("font-weight", "500");

    svg.append("g")
        .call(
            d3
                .axisLeft(y)
                .ticks(5)
                .tickFormat((d) => d + "%")
        )
        .selectAll("text")
        .style("font-size", isModal ? "16px" : "12px")
        .style("font-weight", "500");
}

function createLeverageScatterPlot(
    playerData,
    containerId = "leverage-scatter-plot"
) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Adjust dimensions and image sizes based on modal
    const isModal = containerId.includes("modal");
    const height = isModal ? 700 : 400;

    // Adjust sizes based on modal context
    const imageSize = isModal ? 48 : 24;
    const circleRadius = isModal ? 26 : 13;
    const hoverImageSize = isModal ? 60 : 30;
    const hoverCircleRadius = isModal ? 32 : 16;
    const fontSize = isModal ? 16 : 12;
    const axisLabelSize = isModal ? 18 : 14;
    const tickLabelSize = isModal ? 14 : 12;

    const margin = {
        top: 20,
        right: 20,
        bottom: 100,
        left: isModal ? 90 : 60,
    };

    const width = container.offsetWidth - margin.left - margin.right;

    // Clear existing content
    d3.select(`#${containerId}`).html("");

    // Debug log to see the raw data
    console.log("Raw Player Data:", playerData);
    console.log("Sample player:", Object.entries(playerData)[0]);

    // Process data and add image paths
    const scatterData = Object.entries(playerData)
        .map(([name, stats]) => {
            // Skip the flex_distribution entry
            if (name === "flex_distribution") return null;

            const cleanName = name.trim();

            // Handle DST teams differently
            const isDST = stats.position === "DST";
            const playerInfo = isDST
                ? {
                      first_name: cleanName.replace(" DST", ""),
                      last_name: "",
                      Position: "DST",
                      Team: stats.team,
                  }
                : {
                      first_name: cleanName.split(" ")[0],
                      last_name: cleanName.split(" ").slice(1).join(" "),
                      Position: stats.position,
                      Team: stats.team,
                  };

            return {
                name: cleanName,
                exposure: stats.exposure_rate || 0,
                ownership: parseFloat(stats.ownership) || 0,
                leverage:
                    (stats.exposure_rate || 0) -
                    (parseFloat(stats.ownership) || 0),
                position: stats.position,
                team: stats.team,
                imagePath: getPlayerImageUrl(playerInfo),
            };
        })
        .filter((d) => d && (d.exposure > 1 || d.ownership > 1)); // Add null check in filter

    // Create SVG
    const svg = d3
        .select(`#${containerId}`)
        .append("svg")
        .attr(
            "viewBox",
            `0 0 ${width + margin.left + margin.right} ${
                height + margin.top + margin.bottom
            }`
        )
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add glow filter for hover effect
    const defs = svg.append("defs");

    const filter = defs
        .append("filter")
        .attr("id", `glow-${containerId}`)
        .attr("x", "-50%")
        .attr("y", "-50%")
        .attr("width", "200%")
        .attr("height", "200%");

    filter
        .append("feGaussianBlur")
        .attr("stdDeviation", "2")
        .attr("result", "coloredBlur");

    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // ClipPath for regular state
    defs.append("clipPath")
        .attr("id", `circleClip-${containerId}`)
        .append("circle")
        .attr("r", circleRadius);

    // Scales
    const x = d3
        .scaleLinear()
        .domain([0, d3.max(scatterData, (d) => d.ownership)])
        .range([0, width])
        .nice();

    const y = d3
        .scaleLinear()
        .domain([0, d3.max(scatterData, (d) => d.exposure)])
        .range([height, 0])
        .nice();

    // Add the diagonal line y=x
    svg.append("line")
        .attr("x1", x(0))
        .attr("y1", y(0))
        .attr("x2", x(d3.max(scatterData, (d) => d.ownership)))
        .attr("y2", y(d3.max(scatterData, (d) => d.ownership)))
        .style("stroke", "#6b7280")
        .style("stroke-dasharray", "4,4")
        .style("stroke-width", isModal ? 2 : 1);

    // Create a group for each data point
    const dots = svg
        .selectAll(".player-point")
        .data(scatterData)
        .enter()
        .append("g")
        .attr("class", "player-point")
        .attr(
            "transform",
            (d) => `translate(${x(d.ownership)},${y(d.exposure)})`
        )
        .style("transition", "all 0.3s ease");

    // Add white background circle
    dots.append("circle")
        .attr("r", circleRadius)
        .style("fill", "white")
        .style("stroke", (d) => (d.leverage > 0 ? "#22c55e" : "#dc2626"))
        .style("stroke-width", isModal ? 3 : 2);

    // Add images
    dots.append("image")
        .attr("x", -imageSize / 2)
        .attr("y", -imageSize / 2)
        .attr("width", imageSize)
        .attr("height", imageSize)
        .attr("clip-path", `url(#circleClip-${containerId})`)
        .attr("xlink:href", (d) => {
            const playerData = {
                first_name: d.name.split(" ")[0],
                last_name: d.name.split(" ").slice(1).join(" "),
                Position: d.position,
                Team: d.team,
            };
            return getPlayerImageUrl(playerData);
        })
        .on("error", function () {
            const img = d3.select(this);
            if (!img.attr("data-is-retry")) {
                img.attr("data-is-retry", "true").attr(
                    "xlink:href",
                    getPlaceholderImageUrl()
                );
            }
        });

    // Add interaction
    dots.on("mouseover", function (event, d) {
        // Dim all other points
        dots.style("opacity", 0.3);

        // Highlight this point
        const thisPoint = d3
            .select(this)
            .style("opacity", 1)
            .style("filter", `url(#glow-${containerId})`)
            .style("z-index", 1000);

        // Create hover clip path
        const hoverId = `hoverClip-${containerId}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        defs.append("clipPath")
            .attr("id", hoverId)
            .append("circle")
            .attr("r", hoverCircleRadius);

        // Enlarge the dot and image
        thisPoint
            .select("circle")
            .transition()
            .duration(200)
            .attr("r", hoverCircleRadius)
            .style("stroke-width", isModal ? 4 : 3);

        thisPoint
            .select("image")
            .transition()
            .duration(200)
            .attr("x", -hoverImageSize / 2)
            .attr("y", -hoverImageSize / 2)
            .attr("width", hoverImageSize)
            .attr("height", hoverImageSize)
            .attr("clip-path", `url(#${hoverId})`);

        // Show tooltip
        d3
            .select("#tooltip")
            .style("opacity", 1)
            .style("left", event.pageX + 10 + "px")
            .style("top", event.pageY - 10 + "px")
            .style("font-size", isModal ? "16px" : "12px").html(`
                <strong>${d.name}</strong><br/>
                Exposure: ${d.exposure.toFixed(1)}%<br/>
                Ownership: ${d.ownership.toFixed(1)}%<br/>
                Leverage: ${d.leverage.toFixed(1)}%
            `);
    }).on("mouseout", function () {
        // Restore all points
        dots.style("opacity", 1).style("filter", null).style("z-index", null);

        // Reset the dot size
        const thisPoint = d3.select(this);

        thisPoint
            .select("circle")
            .transition()
            .duration(200)
            .attr("r", circleRadius)
            .style("stroke-width", isModal ? 3 : 2);

        thisPoint
            .select("image")
            .transition()
            .duration(200)
            .attr("x", -imageSize / 2)
            .attr("y", -imageSize / 2)
            .attr("width", imageSize)
            .attr("height", imageSize)
            .attr("clip-path", `url(#circleClip-${containerId})`);

        // Remove hover clip paths
        svg.selectAll(`clipPath[id^="hoverClip-${containerId}"]`).remove();

        // Hide tooltip
        d3.select("#tooltip").style("opacity", 0);
    });

    // Add axes with larger font sizes
    // X-axis
    const xAxis = svg
        .append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat((d) => d + "%"));

    // Set tick label size
    xAxis
        .selectAll(".tick text")
        .style("font-size", isModal ? "16px" : "12px")
        .style("font-weight", "500");

    xAxis.selectAll("line").style("stroke-width", isModal ? 2 : 1);

    xAxis.select(".domain").style("stroke-width", isModal ? 2 : 1);

    // Y-axis
    const yAxis = svg
        .append("g")
        .call(d3.axisLeft(y).tickFormat((d) => d + "%"));

    // Set tick label size
    yAxis
        .selectAll(".tick text")
        .style("font-size", isModal ? "16px" : "12px")
        .style("font-weight", "500");

    yAxis.selectAll("line").style("stroke-width", isModal ? 2 : 1);

    yAxis.select(".domain").style("stroke-width", isModal ? 2 : 1);

    // Add labels with larger font sizes
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", width / 2)
        .attr("y", height + (isModal ? 60 : 40))
        .style("font-size", axisLabelSize + "px")
        .style("font-weight", "600")
        .text("Projected Ownership %");

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + (isModal ? 30 : 15))
        .attr("x", -height / 2)
        .style("font-size", axisLabelSize + "px")
        .style("font-weight", "600")
        .text("Actual Exposure %");

    // Update axis text sizes
    svg.selectAll(".axis text").style("font-size", isModal ? "14px" : "12px");
}

function createPositionDonutChart(
    playerData,
    containerId = "position-donut-chart"
) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }

    // Get flex distribution directly from the data
    const flexDistribution = playerData.flex_distribution;
    if (!flexDistribution) {
        console.error("No flex distribution data found");
        return;
    }

    // Set dimensions
    const margin = {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
    };

    const width = container.offsetWidth - margin.left - margin.right;
    const legendWidth = 120;
    const availableWidth = width - legendWidth;
    const height = Math.min(500, availableWidth) - margin.top - margin.bottom;
    const radius = Math.min(availableWidth, height) / 2;

    // Clear existing content
    d3.select(`#${containerId}`).html("");

    // Convert data for D3
    const total = Object.values(flexDistribution).reduce(
        (sum, val) => sum + val,
        0
    );
    const data = Object.entries(flexDistribution)
        .filter(([_, count]) => count > 0)
        .map(([position, count]) => ({
            position,
            count,
            percentage: ((count / total) * 100).toFixed(1),
        }))
        .sort((a, b) => b.count - a.count);

    // Color scale
    const colorScale = d3
        .scaleOrdinal()
        .domain(["RB", "WR", "TE"])
        .range(["#22c55e", "#3b82f6", "#f59e0b"]);

    // Create SVG
    const svg = d3
        .select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr(
            "transform",
            `translate(${availableWidth / 2 + margin.left},${
                height / 2 + margin.top
            })`
        );

    // Create donut chart layout
    const pie = d3
        .pie()
        .value((d) => d.count)
        .sort(null);

    const arc = d3
        .arc()
        .innerRadius(radius * 0.6)
        .outerRadius(radius * 0.85);

    const hoverArc = d3
        .arc()
        .innerRadius(radius * 0.58)
        .outerRadius(radius * 0.87);

    // Add slices
    const slices = svg
        .selectAll("path")
        .data(pie(data))
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("fill", (d) => colorScale(d.data.position))
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("transition", "all 0.3s ease")
        .on("mouseover", function (event, d) {
            d3.select(this).transition().duration(200).attr("d", hoverArc);

            d3
                .select("#tooltip")
                .style("opacity", 1)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px").html(`
                    <div style="padding: 8px;">
                        <strong style="color: ${colorScale(
                            d.data.position
                        )}">${d.data.position}</strong><br/>
                        Count: ${d.data.count.toLocaleString()}<br/>
                        Percentage: ${d.data.percentage}%
                    </div>
                `);
        })
        .on("mouseout", function () {
            d3.select(this).transition().duration(200).attr("d", arc);
            d3.select("#tooltip").style("opacity", 0);
        });

    // Add center text
    const centerText = svg
        .append("g")
        .attr("class", "center-text")
        .attr("text-anchor", "middle");

    centerText
        .append("text")
        .attr("y", -10)
        .style("font-size", "18px")
        .style("font-weight", "600")
        .style("fill", "var(--primary)")
        .text("FLEX");

    centerText
        .append("text")
        .attr("y", 20)
        .style("font-size", "12px")
        .style("fill", "var(--neutral-medium)")
        .text("Position Usage");

    // Add legend
    const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${radius + 20}, ${-radius * 0.5})`);

    const legendItems = legend
        .selectAll(".legend-item")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 20})`);

    legendItems
        .append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 3)
        .style("fill", (d) => colorScale(d.position));

    legendItems
        .append("text")
        .attr("x", 16)
        .attr("y", 9)
        .style("font-size", "11px")
        .style("font-weight", "500")
        .text((d) => `${d.position} (${d.percentage}%)`);
}

function createPlayerUsageTreemap(
    playerData,
    containerId = "player-usage-treemap"
) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Determine if we're in a modal
    const isModal = containerId.includes("modal");

    // Clear any existing content
    d3.select(`#${containerId}`).html("");

    // Set dimensions
    const margin = {
        top: isModal ? 40 : 20,
        right: isModal ? 40 : 20,
        bottom: isModal ? 0 : 0,
        left: isModal ? 40 : 20,
    };

    const width = container.offsetWidth - margin.left - margin.right;
    const height = (isModal ? 700 : 400) - margin.bottom;

    // Process data into hierarchical structure
    const positionGroups = {
        name: "root",
        children: [],
    };

    // Create base position groups
    const basePositions = ["QB", "RB", "WR", "TE", "DST"];
    const positionMap = {};

    basePositions.forEach((pos) => {
        positionMap[pos] = {
            name: pos,
            children: [],
        };
        positionGroups.children.push(positionMap[pos]);
    });

    // Group players by base position
    Object.entries(playerData).forEach(([name, stats]) => {
        if (name === "flex_distribution") return;

        let basePosition = null;
        if (Array.isArray(stats.positions_used)) {
            basePosition = basePositions.find((pos) =>
                stats.positions_used.some((usedPos) => usedPos.startsWith(pos))
            );
        } else {
            basePosition = basePositions.find((pos) =>
                stats.positions_used.startsWith(pos)
            );
        }

        if (basePosition && positionMap[basePosition]) {
            positionMap[basePosition].children.push({
                name: name,
                value: stats.exposures,
                exposureRate: stats.exposure_rate || 0,
                avgPoints: stats.avg_fpts || 0,
                team: stats.team || "",
            });
        }
    });

    // Sort positions and players
    positionGroups.children.sort((a, b) => {
        const aTotal = a.children.reduce((sum, child) => sum + child.value, 0);
        const bTotal = b.children.reduce((sum, child) => sum + child.value, 0);
        return bTotal - aTotal;
    });

    positionGroups.children.forEach((position) => {
        position.children.sort((a, b) => b.value - a.value);
    });

    // Create color scales
    const positionColorScale = d3
        .scaleOrdinal()
        .domain(basePositions)
        .range(["#22c55e", "#3b82f6", "#f59e0b", "#ec4899", "#6366f1"]);

    // Create SVG
    const svg = d3
        .select(`#${containerId}`)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create treemap layout
    const treemap = d3.treemap().size([width, height]).padding(1).round(true);

    // Create hierarchy and compute values
    const root = d3
        .hierarchy(positionGroups)
        .sum((d) => d.value)
        .sort((a, b) => b.value - a.value);

    // Generate treemap layout
    treemap(root);

    // Create groups for each cell
    const cell = svg
        .selectAll("g")
        .data(root.leaves())
        .enter()
        .append("g")
        .attr("transform", (d) => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    cell.append("rect")
        .attr("width", (d) => d.x1 - d.x0)
        .attr("height", (d) => d.y1 - d.y0)
        .attr("fill", (d) => positionColorScale(d.parent.data.name))
        .attr("opacity", 0.8)
        .style("transition", "all 0.2s ease")
        .on("mouseover", function (event, d) {
            d3.select(this)
                .attr("opacity", 1)
                .attr("stroke", "#000")
                .attr("stroke-width", 2);

            d3
                .select("#tooltip")
                .style("opacity", 1)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .style("font-size", isModal ? "16px" : "12px").html(`
                    <strong>${d.data.name}</strong><br/>
                    Position: ${d.parent.data.name}<br/>
                    Team: ${d.data.team}<br/>
                    Exposure: ${d.data.exposureRate.toFixed(1)}%<br/>
                    Avg Points: ${d.data.avgPoints.toFixed(1)}
                `);
        })
        .on("mouseout", function () {
            d3.select(this).attr("opacity", 0.8).attr("stroke", "none");

            d3.select("#tooltip").style("opacity", 0);
        });

    // Add player name labels
    cell.append("text")
        .attr("x", 4)
        .attr("y", 14)
        .style("font-size", isModal ? "12px" : "10px")
        .style("font-weight", "500")
        .style("fill", "white")
        .style("overflow", "hidden")
        .style("text-overflow", "ellipsis")
        .style("white-space", "nowrap")
        .text((d) => d.data.name)
        .each(function () {
            // Get the parent cell width
            const parentCell = d3.select(this.parentNode);
            const cellWidth = parentCell.datum().x1 - parentCell.datum().x0;

            // Create a temporary SVG to measure text width
            const tempSvg = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "svg"
            );
            const tempText = document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );
            tempText.textContent = this.textContent;
            tempText.style.fontSize = this.style.fontSize;
            tempSvg.appendChild(tempText);
            document.body.appendChild(tempSvg);
            const textWidth = tempText.getComputedTextLength();
            document.body.removeChild(tempSvg);

            // If text is wider than cell, clip it
            if (textWidth > cellWidth - 8) {
                const clipId = `clip-${Math.random()
                    .toString(36)
                    .substr(2, 9)}`;
                const clipPath = parentCell
                    .append("clipPath")
                    .attr("id", clipId);

                clipPath
                    .append("rect")
                    .attr("width", cellWidth - 8)
                    .attr("height", 20);

                d3.select(this).attr("clip-path", `url(#${clipId})`);
            }
        });

    // Calculate legend width and position
    const legendItemWidth = 80; // Fixed width for each legend item
    const totalLegendWidth = legendItemWidth * basePositions.length;
    const legendStartX = (width - totalLegendWidth) / 2; // Center the legend

    // Add centered legend at the bottom
    const legend = svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendStartX}, ${height + 20})`);

    const legendItems = legend
        .selectAll(".legend-item")
        .data(basePositions)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(${i * legendItemWidth}, 0)`);

    legendItems
        .append("rect")
        .attr("width", 12)
        .attr("height", 12)
        .attr("rx", 2)
        .attr("fill", (d) => positionColorScale(d));

    legendItems
        .append("text")
        .attr("x", 16)
        .attr("y", 9)
        .style("font-size", isModal ? "14px" : "11px")
        .style("font-weight", "500")
        .text((d) => d);
}
