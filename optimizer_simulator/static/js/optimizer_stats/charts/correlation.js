function createCorrelationMatrix(
    playerData,
    correlationData,
    containerId = "correlation-matrix"
) {
    const container = document.getElementById(containerId);
    if (!container) return;

    d3.select(`#${containerId}`).html("");

    // Define topNPlayers as 20
    const topNPlayers = 20;
    const topN = topNPlayers;

    // Determine if we're in a modal
    const isModal = containerId.includes("modal");

    // Legend dimensions - adjusted for better spacing
    const legendWidth = isModal ? 60 : 40;
    const legendPadding = 20;

    // Set margins with better spacing
    const margin = {
        top: isModal ? 130 : 100,
        right: legendWidth + legendPadding + 20,
        bottom: 10,
        left: 80,
    };

    // Calculate container dimensions
    const containerWidth = container.offsetWidth;
    const availableWidth = containerWidth - margin.left - margin.right;
    const maxMatrixSize = isModal ? 700 : 400;
    const matrixSize = Math.min(availableWidth, maxMatrixSize);

    // Set sizes based on context
    const fontSize = isModal ? 14 : 10;
    const labelRotation = isModal ? -45 : -65;

    // Create SVG with exact dimensions
    const svgWidth = matrixSize + margin.left + margin.right;
    const svgHeight = matrixSize + margin.top + margin.bottom;

    const svg = d3
        .select(`#${containerId}`)
        .append("svg")
        .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Get top 20 players by exposure rate
    const topPlayers = Object.entries(playerData)
        .map(([name, stats]) => ({
            name: name,
            exposure: stats.exposure_rate || 0,
        }))
        .sort((a, b) => b.exposure - a.exposure)
        .slice(0, topNPlayers)
        .map((d) => d.name);

    // Update topN based on the actual number of players obtained
    const topNActual = topPlayers.length;

    // Initialize matrix
    const matrix = Array(topNActual)
        .fill()
        .map(() => Array(topNActual).fill(0));

    // Create index mapping for players
    const playerIndex = {};
    topPlayers.forEach((name, i) => {
        playerIndex[name] = i;
    });

    // Populate matrix with normalized correlation values
    const totalLineups = correlationData.total_lineups || 1;

    if (Array.isArray(correlationData.player_pairs)) {
        correlationData.player_pairs.forEach((pair) => {
            if (pair && typeof pair === "object") {
                const count = pair.count || 0;
                const player1 = pair.player1;
                const player2 = pair.player2;

                if (
                    playerIndex[player1] !== undefined &&
                    playerIndex[player2] !== undefined
                ) {
                    const i = playerIndex[player1];
                    const j = playerIndex[player2];
                    const value = count / totalLineups;
                    matrix[i][j] = value;
                    matrix[j][i] = value;
                }
            }
        });
    }

    // Create scales with exact matrix size using player names
    const xScale = d3
        .scaleBand()
        .range([0, matrixSize])
        .domain(topPlayers)
        .padding(0);

    const yScale = d3
        .scaleBand()
        .range([0, matrixSize])
        .domain(topPlayers)
        .padding(0);

    // Create color scale
    const maxValue = d3.max(matrix.flat());
    const colorScale = d3
        .scaleSequential(d3.interpolateViridis)
        .domain([0, maxValue]);

    // Add rows
    const rows = svg
        .selectAll(".matrix-row")
        .data(matrix)
        .enter()
        .append("g")
        .attr("class", ".matrix-row")
        .attr("transform", (d, i) => `translate(0,${yScale(topPlayers[i])})`);

    // Add cells with fixed size
    rows.selectAll(".cell")
        .data((d, i) =>
            d.map((value, j) => ({
                value,
                player1: topPlayers[i],
                player2: topPlayers[j],
            }))
        )
        .enter()
        .append("rect")
        .attr("class", "cell")
        .attr("x", (d) => xScale(d.player2))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .style("fill", (d) => (d.value > 0 ? colorScale(d.value) : "#f3f4f6"))
        .style("stroke", "#e5e7eb")
        .on("mouseover", function (event, d) {
            d3
                .select("#tooltip")
                .style("opacity", 1)
                .style("left", event.pageX + 10 + "px")
                .style("top", event.pageY - 10 + "px")
                .style("font-size", isModal ? "16px" : "12px").html(`
                    <strong>${d.player1} & ${d.player2}</strong><br/>
                    Co-occurrence: ${(d.value * totalLineups).toFixed(
                        0
                    )} lineups<br/>
                    Correlation: ${(d.value * 100).toFixed(2)}%
                `);
        })
        .on("mouseout", function () {
            d3.select("#tooltip").style("opacity", 0);
        });

    // Add x-axis labels with improved positioning
    svg.append("g")
        .attr("class", "x-axis")
        .selectAll(".player-label-x")
        .data(topPlayers)
        .enter()
        .append("text")
        .attr("class", "player-label-x")
        .attr("x", (d) => xScale(d) + xScale.bandwidth() / 2)
        .attr("y", -fontSize)
        .attr("text-anchor", "start")
        .attr(
            "transform",
            (d) =>
                `rotate(${labelRotation},${
                    xScale(d) + xScale.bandwidth() / 2
                },-${fontSize})`
        )
        .style("font-size", fontSize + "px")
        .style("font-weight", "500")
        .text((d) => d);

    // Add y-axis labels with improved positioning
    svg.append("g")
        .attr("class", "y-axis")
        .selectAll(".player-label-y")
        .data(topPlayers)
        .enter()
        .append("text")
        .attr("class", "player-label-y")
        .attr("x", -10)
        .attr("y", (d) => yScale(d) + yScale.bandwidth() / 2)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .style("font-size", fontSize + "px")
        .style("font-weight", "500")
        .text((d) => d);

    // Add legend with proper positioning
    const legendSvg = svg
        .append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${matrixSize + legendPadding}, 0)`);

    // Create gradient for legend
    const defs = legendSvg.append("defs");
    const linearGradientId = `linear-gradient-${containerId}`;
    const linearGradient = defs
        .append("linearGradient")
        .attr("id", linearGradientId)
        .attr("x1", "0%")
        .attr("y1", "100%")
        .attr("x2", "0%")
        .attr("y2", "0%");

    linearGradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorScale(0));

    linearGradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorScale(maxValue));

    // Add legend rectangle
    legendSvg
        .append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", legendWidth)
        .attr("height", matrixSize)
        .style("fill", `url(#${linearGradientId})`);

    // Add legend axis
    const legendScale = d3
        .scaleLinear()
        .domain([0, maxValue])
        .range([matrixSize, 0]);

    const legendAxis = d3
        .axisRight(legendScale)
        .ticks(5)
        .tickFormat(d3.format(".0%"));

    legendSvg
        .append("g")
        .attr("class", "legend-axis")
        .attr("transform", `translate(${legendWidth}, 0)`)
        .call(legendAxis)
        .selectAll("text")
        .style("font-size", fontSize + "px")
        .style("font-weight", "500");

    // Add legend title
    legendSvg
        .append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-size", fontSize + "px")
        .style("font-weight", "600")
        .text("Correlation");
}
