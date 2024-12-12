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
        const playerImageUrl = getPlayerImageUrl({
            name: player.Name,
            position: player.Position,
            Team: player.Team,
        });

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${player.LineupPosition}</td>
            <td>
                <div class="player-cell">
                    <img src="${playerImageUrl.url}" 
                         alt="${player.Name}" 
                         class="player-image"
                         onerror="this.src='${getPlaceholderImageUrl()}'">
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

function formatPlayerImage(name) {
    if (!name) {
        return "player_placeholder";
    }

    // Handle DST differently
    if (name.includes("DST")) {
        const teamName = name.split("(")[0].trim().toLowerCase();
        return teamName;
    }

    // Regular player handling
    const fullName = name.split("(")[0].trim().toLowerCase();

    // Split into parts and take only first two parts
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0].replace(/[\.\']/g, ""); // Remove periods and apostrophes
    const lastName = nameParts.length > 1 ? nameParts[1] : "";

    // Remove any Jr, III, etc. from lastName and remove periods and apostrophes
    const cleanLastName =
        lastName
            .split(/\s|\.|\'/)
            .shift()
            .replace(/[\.\']/g, "") || "";

    return `${firstName}_${cleanLastName}`;
}

window.initializeLineups = function (lineups) {
    if (!lineups || !Array.isArray(lineups) || lineups.length === 0) {
        console.log("No lineup data to initialize");
        return;
    }

    lineupData = lineups;
    currentLineupIndex = 0;

    document.getElementById("total-lineups").textContent = lineups.length;
    document.getElementById("lineups-section").style.display = "block";
    document.getElementById("download-csv").style.display = "inline-block";
    document.getElementById("view-stats").style.display = "inline-block";
    document.getElementById("send-to-simulator").style.display = "inline-block";

    renderLineup(0);
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
});

document.getElementById("next-lineup")?.addEventListener("click", function () {
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

// Add click handler for the send to simulator button
document
    .getElementById("send-to-simulator")
    ?.addEventListener("click", function () {
        if (!lineupData || lineupData.length === 0) {
            alert("No lineups to send to simulator!");
            return;
        }

        // Convert lineup data to the format simulator expects
        const simulatorLineups = lineupData.map((lineup) => {
            // Extract player IDs in the correct order: [QB,RB,RB,WR,WR,WR,TE,FLEX,DST]
            const orderedLineup = [];
            const usedPlayers = new Set();

            // First, find QB and DST as they're unique
            const qb = lineup.players.find((p) => p.Position === "QB");
            const dst = lineup.players.find((p) => p.Position === "DST");
            if (qb) {
                orderedLineup[0] = qb.ID || qb.id;
                usedPlayers.add(qb.ID || qb.id);
            }
            if (dst) {
                orderedLineup[8] = dst.ID || dst.id;
                usedPlayers.add(dst.ID || dst.id);
            }

            // Find RBs (positions 1 and 2)
            const rbs = lineup.players.filter(
                (p) => p.Position === "RB" && !usedPlayers.has(p.ID || p.id)
            );
            rbs.slice(0, 2).forEach((rb, index) => {
                orderedLineup[1 + index] = rb.ID || rb.id;
                usedPlayers.add(rb.ID || rb.id);
            });

            // Find WRs (positions 3, 4, and 5)
            const wrs = lineup.players.filter(
                (p) => p.Position === "WR" && !usedPlayers.has(p.ID || p.id)
            );
            wrs.slice(0, 3).forEach((wr, index) => {
                orderedLineup[3 + index] = wr.ID || wr.id;
                usedPlayers.add(wr.ID || wr.id);
            });

            // Find TE (position 6)
            const te = lineup.players.find(
                (p) => p.Position === "TE" && !usedPlayers.has(p.ID || p.id)
            );
            if (te) {
                orderedLineup[6] = te.ID || te.id;
                usedPlayers.add(te.ID || te.id);
            }

            // Find FLEX (position 7) - can be RB, WR, or TE
            const remainingFlex = lineup.players.find(
                (p) =>
                    (p.Position === "RB" ||
                        p.Position === "WR" ||
                        p.Position === "TE") &&
                    !usedPlayers.has(p.ID || p.id)
            );
            if (remainingFlex) {
                orderedLineup[7] = remainingFlex.ID || remainingFlex.id;
            }

            return orderedLineup;
        });

        // Store lineups in session storage
        sessionStorage.setItem(
            "optimizer_lineups",
            JSON.stringify(simulatorLineups)
        );

        // Also store a flag to indicate we should open the lineups view
        sessionStorage.setItem("open_lineups_view", "true");

        // Clear any existing simulator data to prevent stale data
        sessionStorage.removeItem("simulator_data");
        sessionStorage.removeItem("simulator_current_index");

        // Redirect to simulator page
        window.location.href = "/optimizer_simulator/simulator/";
    });
