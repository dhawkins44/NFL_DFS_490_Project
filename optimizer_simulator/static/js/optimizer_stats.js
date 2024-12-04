$(document).ready(function () {
    let resizeTimeout;

    // Remove the modal event handler from window resize
    $(window).on("resize", function () {
        if (resizeTimeout) clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(function () {
            const activeTab = $(".tab-pane.show.active");
            if (activeTab.length) {
                renderChartsForTab(activeTab.attr("id"));
            }
        }, 250);
    });

    // Add modal event handler separately
    $("#enlargeChartModal").on("shown.bs.modal", function () {
        const modalChartContainer = this.querySelector(".chart-container");
        if (modalChartContainer) {
            const chartId = modalChartContainer.id;
            const parentContainer = document.querySelector(
                `[data-modal-source="${chartId}"]`
            );

            if (parentContainer) {
                if (chartId.includes("player-exposure")) {
                    createPlayerExposureChart(
                        window.statsData.player_stats,
                        chartId
                    );
                } else if (chartId.includes("leverage-scatter")) {
                    createLeverageScatterPlot(
                        window.statsData.player_stats,
                        chartId
                    );
                } else if (chartId.includes("team-stacking")) {
                    createTeamStackingChart(
                        window.statsData.team_stats,
                        chartId
                    );
                }
            }
        }
    });

    // Mutation observers for enlarge buttons
    const chartContainers = document.querySelectorAll(".chart-container");
    chartContainers.forEach((container) => {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "childList" ||
                    mutation.type === "attributes"
                ) {
                    createOrUpdateEnlargeButton(container);
                }
            });
        });
        observer.observe(container, { childList: true, attributes: true });
    });

    // Watch for changes to tab content
    const tabContent = document.querySelector(".tab-content");
    const tabContentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
                chartContainers.forEach((container) => {
                    createOrUpdateEnlargeButton(container);
                });
            }
        });
    });
    tabContentObserver.observe(tabContent, { childList: true });

    // Initialize charts
    if (window.statsData) {
        renderChartsForTab("summary-section");

        $("#optimizerTabs a").on("shown.bs.tab", function (e) {
            const targetId = $(e.target).attr("href").substring(1);
            if (targetId) {
                renderChartsForTab(targetId);
            }
        });
    }
});

function renderChartsForTab(tabId) {
    if (!tabId) return;

    try {
        const renderPromises = [];

        switch (tabId) {
            case "summary-section":
                if (document.getElementById("summary-metrics")) {
                    renderPromises.push(
                        createSummaryMetrics(window.statsData.summary_stats)
                    );
                }
                break;

            case "player-section":
                if (document.getElementById("player-exposure-chart")) {
                    renderPromises.push(
                        createPlayerExposureChart(window.statsData.player_stats)
                    );
                }
                if (document.getElementById("leverage-scatter-plot")) {
                    renderPromises.push(
                        createLeverageScatterPlot(window.statsData.player_stats)
                    );
                }
                if (document.getElementById("position-donut-chart")) {
                    renderPromises.push(
                        createPositionDonutChart(window.statsData.player_stats)
                    );
                }
                break;

            case "team-section":
                if (document.getElementById("team-stacking-chart")) {
                    renderPromises.push(
                        createTeamStackingChart(window.statsData.team_stats)
                    );
                }
                break;

            case "correlation-section":
                if (document.getElementById("correlation-matrix")) {
                    renderPromises.push(
                        createCorrelationMatrix(
                            window.statsData.correlation_stats
                        )
                    );
                }
                break;
        }

        Promise.all(renderPromises)
            .then(() => {
                // Call addEnlargeIcons after all charts are rendered
                addEnlargeIcons();
            })
            .catch((error) => {
                console.error(
                    `Error rendering charts for tab ${tabId}:`,
                    error
                );
            });
    } catch (error) {
        console.error(`Error rendering charts for tab ${tabId}:`, error);
    }
}

function createSummaryMetrics(data) {
    const container = document.getElementById("summary-metrics");
    if (!container) {
        console.error("Summary metrics container not found");
        return;
    }

    const metrics = [
        { label: "Total Lineups", value: data.total_lineups },
        { label: "Avg Points", value: data.avg_fpts.toFixed(2) },
        { label: "Avg Salary", value: `$${data.avg_salary.toLocaleString()}` },
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
        bottom: 100,
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

function formatNameForImage(name) {
    // Define suffixes to remove (case-insensitive)
    const SUFFIXES = ["jr", "sr", "ii", "iii", "iv", "v"];

    // First, trim any extra whitespace
    name = name.trim();

    if (name.includes("DST")) {
        // For DST, just return the team name in lowercase
        return name.split(" DST")[0].toLowerCase();
    } else if (!name.includes(" ")) {
        // For single-word team names, return in lowercase
        return name.toLowerCase();
    } else {
        // For players, handle special cases
        let cleanedName = name.toLowerCase();

        // Special handling for names with periods and apostrophes
        cleanedName = cleanedName
            .replace(/\./g, "") // Remove periods
            .replace(/'/g, "") // Remove apostrophes
            .trim();

        // Split the name into parts
        const nameParts = cleanedName.split(" ");

        // Check if the last part is a suffix and remove it if present
        const lastPart = nameParts[nameParts.length - 1];
        if (SUFFIXES.includes(lastPart)) {
            nameParts.pop();
        }

        // After removing the suffix, ensure there are still enough parts
        if (nameParts.length === 0) {
            // If all parts were suffixes, return an empty string or handle accordingly
            return "";
        } else if (nameParts.length === 1) {
            // If there's only one part left, return it in lowercase
            return nameParts[0];
        } else {
            // Handle hyphenated last names
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join("_").replace(/-/g, "-"); // Preserve hyphens
            return `${firstName}_${lastName}`;
        }
    }
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
        top: isModal ? 40 : 30,
        right: isModal ? 60 : 40,
        bottom: isModal ? 70 : 50,
        left: isModal ? 80 : 60,
    };

    const width = container.offsetWidth - margin.left - margin.right;

    // Clear existing content
    d3.select(`#${containerId}`).html("");

    // Process data and add image paths
    const scatterData = Object.entries(playerData)
        .map(([name, stats]) => {
            const cleanName = name.trim();
            const imageFileName = formatNameForImage(cleanName);
            const imagePath = `/static/player_images/${imageFileName}.png`;

            return {
                name: cleanName,
                exposure: stats.exposure_rate || 0,
                ownership: parseFloat(stats.ownership) || 0,
                leverage:
                    (stats.exposure_rate || 0) -
                    (parseFloat(stats.ownership) || 0),
                imagePath: imagePath,
            };
        })
        .filter((d) => d.exposure > 1 || d.ownership > 1);

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
        .attr("xlink:href", (d) => d.imagePath)
        .on("error", function () {
            d3.select(this).attr(
                "xlink:href",
                `/api/placeholder/${imageSize}/${imageSize}`
            );
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

function addEnlargeIcons() {
    const chartContainers = document.querySelectorAll(".chart-container");

    chartContainers.forEach((container) => {
        // Avoid adding multiple buttons if the icon already exists
        if (container.querySelector(".enlarge-btn")) {
            console.log(
                `Enlarge button already exists for container: ${container.id}`
            );
            return;
        }

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (
                    mutation.type === "childList" ||
                    mutation.type === "attributes"
                ) {
                    // Create or update the enlarge button
                    createOrUpdateEnlargeButton(container);
                }
            });
        });

        observer.observe(container, { childList: true, attributes: true });
    });

    // Also watch for changes to the tab content
    const tabContent = document.querySelector(".tab-content");
    const tabContentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
                // Update enlarge buttons for all chart containers
                chartContainers.forEach((container) => {
                    createOrUpdateEnlargeButton(container);
                });
            }
        });
    });

    tabContentObserver.observe(tabContent, { childList: true });
}

// Function to create or update the enlarge button
function createOrUpdateEnlargeButton(container) {
    let button = container.querySelector(".enlarge-btn");

    if (!button) {
        button = document.createElement("button");
        button.classList.add("enlarge-btn");
        button.setAttribute("aria-label", "Enlarge Chart");
        button.innerHTML = '<i class="bi bi-arrows-angle-expand"></i>';

        container.style.position = "relative";
        container.appendChild(button);

        // Pass the container element itself, not its innerHTML
        button.addEventListener("click", () => {
            openEnlargeModal(
                container, // Changed from container.innerHTML
                container.getAttribute("data-title")
            );
        });
    } else {
        button.style.bottom = "10px";
        button.style.right = "10px";
    }
}

function openEnlargeModal(container, chartTitle) {
    const modalElement = document.getElementById("enlargeChartModal");
    if (!modalElement) return;

    // Remove any existing modal backdrop
    const existingBackdrop = document.querySelector(".modal-backdrop");
    if (existingBackdrop) {
        existingBackdrop.remove();
    }

    const modal = new bootstrap.Modal(modalElement, {
        backdrop: true,
        keyboard: true,
        focus: true,
    });

    const modalTitle = modalElement.querySelector(".modal-title");
    modalTitle.textContent = chartTitle || "Enlarged Chart";
    modalTitle.style.fontSize = "24px";
    modalTitle.style.fontWeight = "600";
    modalTitle.style.color = "var(--primary)";

    const modalBody = modalElement.querySelector(".modal-body");
    modalBody.innerHTML = "";

    // Generate unique ID for modal chart container
    const modalChartId = `modal-${container.id}`;

    // Create new container with full dimensions
    const enlargedContainer = document.createElement("div");
    enlargedContainer.className = "chart-container";
    enlargedContainer.id = modalChartId;
    enlargedContainer.style.height = "70vh"; // Use viewport height
    enlargedContainer.style.width = "100%";
    modalBody.appendChild(enlargedContainer);

    // Show modal and recreate chart after animation
    modal.show();

    modalElement.addEventListener(
        "shown.bs.modal",
        function () {
            // Recreate chart with proper dimensions
            setTimeout(() => {
                if (container.id.includes("player-exposure")) {
                    createPlayerExposureChart(
                        window.statsData.player_stats,
                        modalChartId
                    );
                } else if (container.id.includes("leverage-scatter")) {
                    createLeverageScatterPlot(
                        window.statsData.player_stats,
                        modalChartId
                    );
                } else if (container.id.includes("team-stacking")) {
                    createTeamStackingChart(
                        window.statsData.team_stats,
                        modalChartId
                    );
                }
            }, 50);
        },
        { once: true }
    );

    // Cleanup on modal close
    modalElement.addEventListener(
        "hidden.bs.modal",
        function () {
            modalBody.innerHTML = "";
        },
        { once: true }
    );
}
