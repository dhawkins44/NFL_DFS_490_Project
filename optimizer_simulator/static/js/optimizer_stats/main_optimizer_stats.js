// Debounce utility function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

$(document).ready(function () {
    // Use ResizeObserver for more efficient resize handling
    const resizeObserver = new ResizeObserver(
        debounce(() => {
            const activeTab = $(".tab-pane.show.active");
            if (activeTab.length) {
                renderChartsForTab(activeTab.attr("id"));
            }
        }, 250)
    );

    // Initialize charts and observers
    if (window.statsData) {
        // Initial render
        renderChartsForTab("summary-section");

        // Set up tab change handlers
        $("#optimizerTabs a").on("shown.bs.tab", function (e) {
            try {
                const targetId = $(e.target).attr("href")?.substring(1);
                if (targetId) {
                    renderChartsForTab(targetId);

                    // Observe the new active chart container
                    const chartContainers = document.querySelectorAll(
                        `#${targetId} .chart-container`
                    );
                    chartContainers.forEach((container) => {
                        // Disconnect previous observations
                        resizeObserver.disconnect();
                        // Observe new container
                        resizeObserver.observe(container);
                    });
                }
            } catch (error) {
                console.warn("Tab change error:", error);
            }
        });

        // Initial observation of visible chart containers
        const activeChartContainers = document.querySelectorAll(
            ".tab-pane.show.active .chart-container"
        );
        activeChartContainers.forEach((container) => {
            resizeObserver.observe(container);
        });
    }

    // Cleanup on page unload
    $(window).on("unload", function () {
        resizeObserver.disconnect();
    });
});
