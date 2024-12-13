let currentLineupIndex = 0;
let simulationData = [];
let playerData = {};

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
    try {
        const lineup = simulationData[index];
        if (!lineup) {
            console.error("No lineup data found for index:", index);
            return;
        }

        // Get all required DOM elements
        const elements = {
            currentLineup: document.getElementById("current-lineup"),
            prevLineup: document.getElementById("prev-lineup"),
            nextLineup: document.getElementById("next-lineup"),
            lineupBody: document.getElementById("lineup-body"),
            totalSalary: document.getElementById("total-salary"),
            totalProjected: document.getElementById("total-projected"),
            winPercentage: document.getElementById("win-percentage"),
            topTenPercentage: document.getElementById("top-ten-percentage"),
            lineupStack: document.getElementById("lineup-stack"),
            lineupType: document.getElementById("lineup-type"),
            lineupCeiling: document.getElementById("lineup-ceiling"),
        };

        // Update navigation
        elements.currentLineup.textContent = index + 1;
        elements.prevLineup.disabled = index === 0;
        elements.nextLineup.disabled = index === simulationData.length - 1;

        // Clear and populate table body
        elements.lineupBody.innerHTML = "";

        // Extract players array from lineup data structure
        const positionOrder = [
            "QB", // QB first
            "RB", // Then RB
            "RB",
            "WR",
            "WR",
            "WR",
            "TE",
            "FLEX",
            "DST", // DST last
        ];

        // Reorder the lineup array to match the correct position order
        const orderedLineup = [...lineup.Lineup];
        // Move DST from first position to last position
        const dst = orderedLineup.shift();
        orderedLineup.push(dst);

        const players = orderedLineup
            .map((playerId, idx) => {
                const playerData = window.playerData[String(playerId)];
                if (!playerData) {
                    console.error(
                        "Could not find player data for ID:",
                        playerId
                    );
                    return null;
                }
                return {
                    ...playerData,
                    position: positionOrder[idx], // Use the position from our order array
                };
            })
            .filter(Boolean);

        players.forEach((player) => {
            const row = document.createElement("tr");
            const nameParts = player.Name.split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ");

            // Format player data for image URL
            const imagePlayer = {
                first_name: firstName,
                last_name: lastName,
                position: player.Position[0],
                Team: player.Team,
            };

            row.innerHTML = `
                <td>${player.position}</td>
                <td>
                    <div class="player-cell">
                        <img src="${getPlayerImageUrl(imagePlayer).url}" 
                             alt="${player.Name}" 
                             class="player-image"
                             onerror="this.src='${getPlaceholderImageUrl()}'">
                        <div class="player-name">${player.Name}</div>
                    </div>
                </td>
                <td>${player.Team}</td>
                <td>${player.Opponent || "N/A"}</td>
                <td>$${player.Salary?.toLocaleString() || 0}</td>
                <td>${player.Fpts?.toFixed(1) || "0.0"}</td>
                <td>${
                    player.fieldFpts?.toFixed(1) ||
                    player.Fpts?.toFixed(1) ||
                    "0.0"
                }</td>
                <td>${player.Ownership?.toFixed(1) || "0.0"}%</td>
            `;
            elements.lineupBody.appendChild(row);
        });

        // Update summary stats
        const totalSalary = players.reduce(
            (sum, player) => sum + (player.Salary || 0),
            0
        );
        const totalFpts = players.reduce(
            (sum, player) => sum + (player.Fpts || 0),
            0
        );

        elements.totalSalary.textContent = "$" + totalSalary.toLocaleString();
        elements.totalProjected.textContent = totalFpts.toFixed(1);

        // Update win percentage and top 10% from the lineup data
        const numSimulations = window.numSimulations || 100;
        elements.winPercentage.textContent =
            ((lineup.Wins / numSimulations) * 100).toFixed(1) + "%";
        elements.topTenPercentage.textContent =
            ((lineup.Top1Percent / numSimulations) * 100).toFixed(1) + "%";

        // Update stack info using the exact field names from the CSV
        const stack1 = lineup["Stack1 Type"] || "-";
        const stack2 = lineup["Stack2 Type"] || "-";
        elements.lineupStack.textContent =
            [stack1, stack2]
                .filter((x) => x !== "-" && x !== "No Stack") // Filter out No Stack and empty values
                .join(" / ") || "-";

        // Add Type and Ceiling using the exact field names from the CSV
        elements.lineupType.textContent = lineup.Type || "-";
        elements.lineupCeiling.textContent =
            typeof lineup.Ceiling === "number"
                ? lineup.Ceiling.toFixed(1)
                : "-";
    } catch (error) {
        console.error("Error rendering lineup:", error);
    }
}

window.initializeLineups = function (data) {
    try {
        if (!data.lineups || !data.players) {
            console.error("Missing required data");
            return;
        }

        // Store player data and simulation info globally
        window.playerData = data.players;
        window.numSimulations = data.num_simulations;
        simulationData = Object.values(data.lineups);
        currentLineupIndex = 0;

        const totalLineupsElement = document.getElementById("total-lineups");
        const lineupsSectionElement =
            document.getElementById("lineups-section");

        if (!totalLineupsElement || !lineupsSectionElement) {
            console.error("Required elements not found for initialization");
            return;
        }

        totalLineupsElement.textContent = simulationData.length;
        lineupsSectionElement.style.display = "block";

        if (simulationData.length > 0) {
            renderLineup(0);
        }
    } catch (error) {
        console.error("Error initializing lineups:", error);
    }
};

document.addEventListener("DOMContentLoaded", function () {
    try {
        // Initialize navigation buttons
        const prevButton = document.getElementById("prev-lineup");
        const nextButton = document.getElementById("next-lineup");

        if (prevButton) {
            prevButton.addEventListener("click", function () {
                if (currentLineupIndex > 0) {
                    currentLineupIndex--;
                    renderLineup(currentLineupIndex);
                }
            });
        }

        if (nextButton) {
            nextButton.addEventListener("click", function () {
                if (currentLineupIndex < simulationData.length - 1) {
                    currentLineupIndex++;
                    renderLineup(currentLineupIndex);
                }
            });
        }

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
    } catch (error) {
        console.error("Error setting up event listeners:", error);
    }
});
