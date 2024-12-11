let currentLineupIndex = 0;
let simulationData = [];

function processSimulationData(data) {
    // Handle object with numeric keys (convert to array)
    if (data && typeof data === "object" && !Array.isArray(data)) {
        return Object.values(data).map((lineup) => ({
            players: lineup.players || [],
            salary: lineup.salary || 0,
            projectedPoints: lineup.projected_points || 0,
            stack: lineup.stack || "",
            ownershipSum: lineup.ownership_sum || 0,
        }));
    }

    // If it's an array, process as before
    if (Array.isArray(data)) {
        return data.map((lineup) => ({
            players: lineup.players || [],
            salary: lineup.salary || 0,
            projectedPoints: lineup.projected_points || 0,
            stack: lineup.stack || "",
            ownershipSum: lineup.ownership_sum || 0,
        }));
    }

    // If it's a CSV string, process as before
    if (typeof data === "string") {
        const lines = data.trim().split("\n");
        const headers = lines[0].split(",");

        return lines.slice(1).map((line) => {
            const values = line.split(",");
            const players = [];

            // Process first 9 columns which are player entries
            for (let i = 0; i < 9; i++) {
                const [name, id] = values[i].split(" (");
                players.push({
                    name: name,
                    id: id ? id.replace(")", "") : "",
                    position: getPosition(i),
                    salary: parseInt(values[12]) / 9,
                    fpts: parseFloat(values[9]) / 9,
                    team: getTeamFromName(name),
                    ownership: 0,
                });
            }

            return {
                players: players,
                salary: parseInt(values[12]),
                projectedPoints: parseFloat(values[9]),
                stack: values[17] + " / " + values[18],
                ownershipSum: parseFloat(values[16]),
            };
        });
    }

    // If none of the above, return empty array
    console.error("Invalid data format received:", data);
    return [];
}

function getPosition(index) {
    const positions = ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"];
    return positions[index];
}

function renderLineup(index) {
    const lineup = simulationData[index];
    if (!lineup) return;

    // Update navigation
    document.getElementById("current-lineup").textContent = index + 1;
    document.getElementById("prev-lineup").disabled = index === 0;
    document.getElementById("next-lineup").disabled =
        index === simulationData.length - 1;

    // Clear and populate table body
    const tableBody = document.getElementById("lineup-body");
    tableBody.innerHTML = "";

    lineup.players.forEach((player) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${player.position}</td>
            <td>
                <div class="player-cell">
                    <img src="/static/player_images/${formatPlayerImage(
                        player.name
                    )}.png" 
                         alt="${player.name}" 
                         class="player-image"
                         onerror="this.src='/api/placeholder/40/40'">
                    <span>${player.name}</span>
                </div>
            </td>
            <td>${player.team}</td>
            <td>${player.opponent || "N/A"}</td>
            <td>$${player.salary.toLocaleString()}</td>
            <td>${player.fpts.toFixed(1)}</td>
            <td>${player.ownership.toFixed(1)}%</td>
        `;
        tableBody.appendChild(row);
    });

    // Update summary
    document.getElementById(
        "total-salary"
    ).textContent = `$${lineup.salary.toLocaleString()}`;
    document.getElementById("total-projected").textContent =
        lineup.projectedPoints.toFixed(1);
    document.getElementById("lineup-stack").textContent = lineup.stack;
    document.getElementById(
        "ownership-sum"
    ).textContent = `${lineup.ownershipSum.toFixed(1)}%`;
}

function formatPlayerImage(name) {
    // Convert player name to image filename format
    return name.toLowerCase().replace(/[.']/g, "").replace(/\s+/g, "_");
}

window.initializeLineups = function (data) {
    simulationData = processSimulationData(data);
    currentLineupIndex = 0;
    document.getElementById("total-lineups").textContent =
        simulationData.length;
    document.getElementById("lineups-section").style.display = "block";
    if (simulationData.length > 0) {
        renderLineup(0);
    }
};

document.addEventListener("DOMContentLoaded", function () {
    // Initialize Bootstrap tabs
    const tabElements = document.querySelectorAll('[data-bs-toggle="tab"]');
    if (tabElements.length > 0) {
        // Only initialize if elements exist
        tabElements.forEach((tabElement) => {
            const tab = new bootstrap.Tab(tabElement);
        });
    }
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
            if (currentLineupIndex < simulationData.length - 1) {
                currentLineupIndex++;
                renderLineup(currentLineupIndex);
            }
        });

    // Add config collapse functionality
    const configHeader = document.querySelector(".config-header");
    if (configHeader) {
        configHeader.addEventListener("click", function () {
            const content = document.getElementById("config-content");
            const toggleBtn = document.getElementById("toggle-config");
            if (content && toggleBtn) {
                content.classList.toggle("collapsed");
                const icon = toggleBtn.querySelector("i");
                if (icon) {
                    icon.classList.toggle("bi-chevron-up");
                    icon.classList.toggle("bi-chevron-down");
                }
            }
        });
    }
});
