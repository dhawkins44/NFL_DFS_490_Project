//lineups.js
let currentLineupIndex = 0;
let lineupData = [];

function renderLineup(index) {
    const lineup = lineupData[index];
    if (!lineup) return;

    // Update navigation
    document.getElementById("current-lineup").textContent = index + 1;
    document.getElementById("prev-lineup").disabled = index === 0;
    document.getElementById("next-lineup").disabled =
        index === lineupData.length - 1;

    // Clear and populate table body
    const tableBody = document.getElementById("lineup-body");
    tableBody.innerHTML = "";

    lineup.players.forEach((player) => {
        const playerImageUrl = player.first_name
            ? `/static/player_images/${player.first_name}${
                  player.last_name ? "_" + player.last_name : ""
              }.png`
            : "/api/placeholder/40/40";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${player.LineupPosition}</td>
            <td>
                <div class="player-cell">
                    <img src="${playerImageUrl}" 
                         alt="${player.Name}" 
                         class="player-image"
                         onerror="this.src='/api/placeholder/40/40'">
                    <span>${player.Name}</span>
                </div>
            </td>
            <td>${player.Team}</td>
            <td>${player.Opponent || "N/A"}</td>
            <td>$${player.Salary.toLocaleString()}</td>
            <td>${player.Fpts.toFixed(1)}</td>
            <td>${player.Ownership.toFixed(1)}%</td>
        `;
        tableBody.appendChild(row);
    });

    // Update summary
    document.getElementById("total-salary").textContent =
        "$" + lineup.salary.toLocaleString();
    document.getElementById("total-projected").textContent =
        lineup.fpts_proj.toFixed(1);
    document.getElementById("lineup-stack").textContent = lineup.stack;
    document.getElementById("ownership-sum").textContent =
        lineup.ownership_sum.toFixed(1) + "%";
}

window.initializeLineups = function (lineups) {
    lineupData = lineups;
    currentLineupIndex = 0;
    document.getElementById("total-lineups").textContent = lineups.length;
    document.getElementById("lineups-section").style.display = "block";
    if (lineups.length > 0) {
        renderLineup(0);
    }
};

// Set up event listeners when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    document
        .getElementById("prev-lineup")
        ?.addEventListener("click", function () {
            if (currentLineupIndex > 0) {
                currentLineupIndex--;
                renderLineup(currentLineupIndex);
            }
        });

    document
        .getElementById("next-lineup")
        ?.addEventListener("click", function () {
            if (currentLineupIndex < lineupData.length - 1) {
                currentLineupIndex++;
                renderLineup(currentLineupIndex);
            }
        });

    // Handle optimizer configuration toggle
    document
        .getElementById("toggle-config")
        ?.addEventListener("click", function () {
            const configContent = document.getElementById("config-content");
            const icon = this.querySelector("i");
            configContent.classList.toggle("collapsed");
            icon.classList.toggle("fa-chevron-up");
            icon.classList.toggle("fa-chevron-down");
        });
});
