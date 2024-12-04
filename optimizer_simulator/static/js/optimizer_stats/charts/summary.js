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
