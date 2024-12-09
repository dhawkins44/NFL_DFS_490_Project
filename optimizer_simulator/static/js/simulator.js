// Global players array
let players = [];

// Wait for DOM content to be loaded before initializing anything
document.addEventListener("DOMContentLoaded", function () {
    // Log all player-select elements
    const selectElements = document.querySelectorAll(".player-select");

    // Fetch players first, then initialize everything else
    fetch("/optimizer_simulator/get_players/")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            // Transform the data to match the expected format
            players = data.players.map((player) => ({
                id: player.ID,
                name: player.Name,
                team: player.Team,
                position: player.Position,
                salary: parseInt(player.Salary || 0),
                fpts: parseFloat(player.Fpts || 0),
                gameInfo: player.GameInfo || "",
            }));

            // Only initialize if we have valid players
            if (players.length > 0) {
                initializeAll();
            } else {
                console.error(
                    "No valid players available to initialize selects"
                );
            }
        })
        .catch((error) => {
            console.error("Error fetching players:", error);
            const errorMessage = document.createElement("div");
            errorMessage.className = "alert alert-danger";
            errorMessage.textContent = `Error loading players: ${error.message}`;
            document.body.insertBefore(errorMessage, document.body.firstChild);
        });
});

function initializeAll() {
    // Initialize all player selects
    document.querySelectorAll(".player-select").forEach((select) => {
        initializePlayerSelect(select);
    });

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize correlation rules
    initializeCorrelationRules();

    // Initialize lineup buttons
    initializeLineupButtons();

    // Event Listeners
    const clearLineupBtn = document.getElementById("clear-lineup");
    if (clearLineupBtn) {
        clearLineupBtn.addEventListener("click", clearLineupBuilder);
    }

    const runSimulationBtn = document.getElementById("run-simulation-btn");
    if (runSimulationBtn) {
        runSimulationBtn.addEventListener("click", runSimulation);
    }
}

function initializePlayerSelect(selectElement) {
    selectElement.innerHTML = "";
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    selectElement.appendChild(emptyOption);

    const position = selectElement.dataset.position;
    const filteredPlayers = position
        ? players.filter((player) => {
              return (
                  player.position === position ||
                  (position === "FLEX" &&
                      ["RB", "WR", "TE"].includes(player.position))
              );
          })
        : players;

    filteredPlayers.forEach((player) => {
        const option = document.createElement("option");
        option.value = player.id;
        option.text = `${player.name} (${player.team} - ${player.position})`;
        option.dataset.salary = player.salary;
        option.dataset.fpts = player.fpts;
        option.dataset.position = player.position;
        option.dataset.image = getPlayerImageUrl({
            name: player.name,
            position: player.position,
        });
        option.dataset.gameInfo = player.gameInfo || "";
        selectElement.appendChild(option);
    });

    try {
        $(selectElement).select2({
            placeholder: "Select a player",
            allowClear: true,
            width: "100%",
            multiple: true,

            maximumSelectionLength: 1,
            containerCssClass: "select2-container--lineup",
            dropdownCssClass: "select2-dropdown--lineup",
            escapeMarkup: function (markup) {
                return markup;
            },
            templateResult: formatPlayerOption,
            templateSelection: function (option) {
                // Only use custom template for lineup builder
                if (selectElement.classList.contains("player-select")) {
                    if (!option.id) return option.text;

                    const $option = $(option.element);
                    const salary = $option.data("salary");
                    const fpts = $option.data("fpts");
                    const gameInfo = $option.data("gameInfo");

                    // Use the full text that includes team and position
                    return `${option.text} | $${parseInt(
                        salary
                    ).toLocaleString()} | ${parseFloat(fpts).toFixed(
                        1
                    )} FPTS | ${gameInfo}`;
                }
                // Use default template for other selects
                return option.text;
            },
            language: {
                maximumSelected: function () {
                    return "You may only select one player";
                },
            },
        });

        $(selectElement).on("change", updateLineupStats);
    } catch (error) {
        console.error("Error initializing Select2:", error);
    }
}

function formatPlayerOption(option) {
    if (!option.id) {
        return option.text;
    }

    const $option = $(option.element);
    const imgUrl = $option.data("image");
    const salary = $option.data("salary");
    const fpts = $option.data("fpts");
    const gameInfo = $option.data("gameInfo");

    return $(`
        <div class="player-option">
            <img src="${imgUrl}" 
                 alt="${option.text}"
                 class="img-option"
                 onerror="this.src='${getPlaceholderImageUrl()}'">
            <div class="player-info">
                <div class="player-name">${option.text}</div>
                <div class="player-stats">
                    <span class="salary">$${parseInt(
                        salary
                    ).toLocaleString()}</span>
                    <span class="projection">${parseFloat(fpts).toFixed(
                        1
                    )} FPTS</span>
                    <span class="game-info">${gameInfo}</span>
                </div>
            </div>
        </div>
    `);
}

// Correlation Rules Functions
let correlationRulesInitialized = false;

function initializeCorrelationRules() {
    // Only initialize once
    if (correlationRulesInitialized) {
        return;
    }

    const addCorrelationRuleBtn = document.getElementById(
        "add-correlation-rule"
    );
    if (addCorrelationRuleBtn) {
        addCorrelationRuleBtn.addEventListener("click", function () {
            addCorrelationRule();
        });
        correlationRulesInitialized = true;
    } else {
        console.error("Could not find add correlation rule button");
    }
}

function addCorrelationRule() {
    const container = document.getElementById("correlation-rules-list");
    if (!container) {
        console.error("Could not find correlation rules container");
        return;
    }

    const ruleDiv = document.createElement("div");
    ruleDiv.classList.add("mb-3", "correlation-rule");

    ruleDiv.innerHTML = `
        <div class="form-label-wrapper d-flex align-items-center mb-2">
            <label>Correlation Rule ${container.children.length + 1}</label>
        </div>
        <div class="input-group">
            <select class="correlation-player-select" name="correlation_player">
                <!-- Options will be populated dynamically -->
            </select>
            <select class="form-control position-select">
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="DST">DST</option>
                <option value="Opp QB">Opp QB</option>
                <option value="Opp RB">Opp RB</option>
                <option value="Opp WR">Opp WR</option>
                <option value="Opp TE">Opp TE</option>
                <option value="Opp DST">Opp DST</option>
            </select>
            <input type="number" class="form-control correlation-value" 
                   min="-1" max="1" step="0.1" value="0">
            <button class="btn btn-danger remove-rule-btn">
                <i class="bi bi-trash"></i>
            </button>
        </div>
    `;

    container.appendChild(ruleDiv);

    // Initialize the new select2 for player selection
    const selectElement = ruleDiv.querySelector(".correlation-player-select");
    initializeCorrelationSelect(selectElement);

    // Add remove button handler
    const removeBtn = ruleDiv.querySelector(".remove-rule-btn");
    removeBtn.addEventListener("click", function () {
        ruleDiv.remove();
        updateCorrelationRuleLabels();
    });
}

function updateCorrelationRuleLabels() {
    const correlationRules = document.querySelectorAll(
        "#correlation-rules-list .correlation-rule"
    );
    correlationRules.forEach((ruleDiv, index) => {
        const label = ruleDiv.querySelector(".form-label-wrapper label");
        label.textContent = `Correlation Rule ${index + 1}`;
    });
}

// Configuration Functions
function gatherSimulationConfig() {
    const customLineups = [];
    document.querySelectorAll("#added-lineups-body tr").forEach((row) => {
        const lineup = [];
        row.querySelectorAll("td:not(:last-child)").forEach((td) => {
            lineup.push(td.textContent);
        });
        if (lineup.length > 0) {
            customLineups.push(lineup);
        }
    });

    const correlationRules = {};
    document.querySelectorAll(".correlation-rule").forEach((rule) => {
        const playerSelect = rule.querySelector(".player-select");
        const playerName = playerSelect.value
            ? playerSelect.selectedOptions[0].text.split(" - ")[0]
            : null;

        if (playerName) {
            correlationRules[playerName] = {
                position: rule.querySelector(".position-select").value,
                correlation: parseFloat(
                    rule.querySelector(".correlation-value").value
                ),
            };
        }
    });

    return {
        num_simulations: parseInt(
            document.getElementById("numSimulations").value
        ),
        field_size: parseInt(document.getElementById("fieldSize").value),
        max_pct_off_optimal: parseFloat(
            document.getElementById("maxPctOffOptimal").value
        ),
        pct_field_using_stacks:
            parseFloat(document.getElementById("pctFieldStacks").value) / 100,
        pct_field_double_stacks:
            parseFloat(document.getElementById("pctFieldDoubleStacks").value) /
            100,
        randomness: parseFloat(document.getElementById("randomness").value),
        use_contest_data: document.getElementById("useContestData").checked,
        use_lineup_input: document.getElementById("useLineupInput").checked,
        custom_lineups: customLineups,
        correlation_rules: correlationRules,
    };
}

function gatherLineupData() {
    const lineup = [];
    document.querySelectorAll(".player-select").forEach((select) => {
        const selectedOption = select.selectedOptions[0];
        if (selectedOption) {
            // Find the original player data to get all properties
            const player = players.find((p) => p.id === selectedOption.value);
            if (player) {
                lineup.push({
                    id: player.id,
                    name: player.name,
                    position: player.position, // Use the original player position
                    team: player.team,
                });
            }
        }
    });
    return lineup;
}

function validateLineup(lineup) {
    // Clear any existing warnings
    const warningsContainer = document.getElementById("lineup-warnings");
    warningsContainer.innerHTML = "";

    // Check for duplicate players
    const playerCounts = {};
    let hasDuplicates = false;
    lineup.forEach((player) => {
        if (player) {
            if (playerCounts[player.Name]) {
                hasDuplicates = true;
                playerCounts[player.Name]++;
            } else {
                playerCounts[player.Name] = 1;
            }
        }
    });

    if (hasDuplicates) {
        warningsContainer.innerHTML = `
            <div class="lineup-warning">
                Warning: You have selected the same player multiple times
            </div>
        `;
        return false;
    }

    return true;
}

// Simulation Functions
function runSimulation() {
    document.getElementById("loading-overlay").style.display = "flex";

    const config = gatherSimulationConfig();

    fetch("/optimizer_simulator/run_simulation/", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": document.querySelector("[name=csrfmiddlewaretoken]")
                .value,
        },
        body: JSON.stringify(config),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                fetch(data.download_url)
                    .then((response) => response.text())
                    .then((csvText) => {
                        const results = parseSimulationResults(csvText);
                        displayResults(results);

                        const downloadBtn =
                            document.getElementById("download-csv");
                        if (downloadBtn) {
                            downloadBtn.href = data.download_url;
                            downloadBtn.style.display = "inline-block";
                        }

                        document.getElementById("view-stats").style.display =
                            "inline-block";
                        document.getElementById(
                            "simulation-results"
                        ).style.display = "block";
                    })
                    .catch((error) => {
                        console.error("Error parsing CSV:", error);
                        alert("Error parsing results: " + error);
                    });
            } else {
                alert("Error running simulation: " + data.error);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("Error running simulation: " + error);
        })
        .finally(() => {
            document.getElementById("loading-overlay").style.display = "none";
        });
}

function parseSimulationResults(csvText) {
    const lines = csvText.split("\n");
    const headers = lines[0].split(",");
    return lines
        .slice(1)
        .filter((line) => line.trim())
        .map((line) => {
            const values = line.split(",");
            return {
                lineup: values.slice(0, 9).map((p) => p.split(" (")[0]),
                win_rate: parseFloat(values[13]) / 100,
                roi: parseFloat(values[16]),
                top_10_rate: parseFloat(values[14]) / 100,
                cash_rate: 0,
                avg_points: parseFloat(values[9]),
            };
        });
}

function displayResults(results) {
    const tbody = document.getElementById("results-body");
    if (!tbody) return;

    tbody.innerHTML = "";

    results.forEach((result) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${
                Array.isArray(result.lineup) ? result.lineup.join(", ") : "N/A"
            }</td>
            <td class="text-end">${
                result.win_rate ? (result.win_rate * 100).toFixed(2) : "0.00"
            }%</td>
            <td class="text-end">${
                result.roi ? result.roi.toFixed(2) : "0.00"
            }%</td>
            <td class="text-end">${
                result.top_10_rate
                    ? (result.top_10_rate * 100).toFixed(2)
                    : "0.00"
            }%</td>
            <td class="text-end">${
                result.cash_rate ? (result.cash_rate * 100).toFixed(2) : "0.00"
            }%</td>
            <td class="text-end">${
                result.avg_points ? result.avg_points.toFixed(2) : "0.00"
            }</td>
        `;
        tbody.appendChild(row);
    });
}

// Initialize everything when the DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    // Initialize all player selects
    document.querySelectorAll(".player-select").forEach((select) => {
        initializePlayerSelect(select);
    });

    // Initialize correlation rules
    initializeCorrelationRules();

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Event Listeners
    const clearLineupBtn = document.getElementById("clear-lineup");
    if (clearLineupBtn) {
        clearLineupBtn.addEventListener("click", clearLineupBuilder);
    }

    const runSimulationBtn = document.getElementById("run-simulation-btn");
    if (runSimulationBtn) {
        runSimulationBtn.addEventListener("click", runSimulation);
    }

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

// Update filterPlayersByPosition to add debugging
function filterPlayersByPosition(players, position, salary) {
    console.log(`Filtering players for ${position} with salary ${salary}`);
    console.log("Sample player before filter:", players[0]);

    const filtered = players.filter((player) => {
        console.log(
            `Comparing ${player.name}: ${player.position} with ${position}`
        );
        if (position === "FLEX") {
            return ["RB", "WR", "TE"].includes(player.position);
        }
        return player.position === position;
    });

    console.log(`Found ${filtered.length} players for ${position}`);
    return filtered;
}

let debugMode = true;

function debugLog(...args) {
    if (debugMode) {
        console.log("[DEBUG]", ...args);
    }
}

function updateLineupStats() {
    const salaryTotal = calculateSalaryTotal();
    const projectedPoints = calculateProjectedPoints();
    const warnings = validateLineup();

    // Update displays
    document.getElementById(
        "salary-total"
    ).textContent = `$${salaryTotal.toLocaleString()}`;
    document.getElementById("projected-points").textContent =
        projectedPoints.toFixed(1);

    // Update salary color based on limit
    const salaryTracker = document.querySelector(".salary-tracker");
    if (salaryTotal > 50000) {
        salaryTracker.classList.add("over-salary");
    } else {
        salaryTracker.classList.remove("over-salary");
    }

    // Display warnings
    const warningsContainer = document.getElementById("lineup-warnings");
    warningsContainer.innerHTML = warnings
        .map(
            (warning) =>
                `<div class="lineup-warning"><i class="bi bi-exclamation-triangle"></i> ${warning}</div>`
        )
        .join("");

    // Disable/Enable add lineup button based on validation
    const addLineupBtn = document.getElementById("add-lineup");
    if (addLineupBtn) {
        addLineupBtn.disabled = warnings.length > 0;
    }
}

function calculateSalaryTotal() {
    let total = 0;
    document.querySelectorAll(".player-select").forEach((select) => {
        const selectedOptions = Array.from(select.selectedOptions);
        selectedOptions.forEach((option) => {
            total += parseInt(option.dataset.salary || 0);
        });
    });
    return total;
}

function calculateProjectedPoints() {
    let total = 0;
    document.querySelectorAll(".player-select").forEach((select) => {
        const selectedOptions = Array.from(select.selectedOptions);
        selectedOptions.forEach((option) => {
            total += parseFloat(option.dataset.fpts || 0);
        });
    });
    return total;
}

function validateLineup() {
    const warnings = [];
    const salaryTotal = calculateSalaryTotal();

    if (salaryTotal > 50000) {
        warnings.push(
            `Lineup is $${(
                salaryTotal - 50000
            ).toLocaleString()} over the salary cap`
        );
    }

    // Check for duplicate players
    const selectedPlayers = new Set();
    let duplicates = false;
    document.querySelectorAll(".player-select").forEach((select) => {
        const selectedOptions = Array.from(select.selectedOptions);
        selectedOptions.forEach((option) => {
            if (selectedPlayers.has(option.value)) {
                duplicates = true;
            }
            selectedPlayers.add(option.value);
        });
    });

    if (duplicates) {
        warnings.push("You have selected the same player multiple times");
    }

    return warnings;
}

function addLineupToTable(lineup) {
    // Remove event listener setup from initializeAll
    if (!lineup || lineup.length === 0) {
        console.log("No valid lineup to add");
        return;
    }

    const addedLineupsSection = document.getElementById("added-lineups");
    if (addedLineupsSection) {
        addedLineupsSection.style.display = "block";
    }

    const tbody = document.getElementById("added-lineups-body");
    if (!tbody) {
        console.error("Could not find added-lineups-body");
        return;
    }

    const row = document.createElement("tr");

    lineup.forEach((player) => {
        const td = document.createElement("td");
        td.className = "text-center";
        if (player && player.name) {
            td.innerHTML = `
                <div class="player-cell">
                    <img src="${getPlayerImageUrl({
                        name: player.name,
                        position: player.position,
                    })}" 
                         alt="${player.name}" 
                         class="player-image"
                         onerror="this.src='${getPlaceholderImageUrl()}'">
                    <span>${player.name.split("(")[0].trim()}</span>
                </div>
            `;
        }
        row.appendChild(td);
    });

    // Update the action column
    const actionTd = document.createElement("td");
    actionTd.className = "text-center";
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-sm btn-danger";
    removeBtn.innerHTML = '<i class="bi bi-trash"></i>';
    removeBtn.addEventListener("click", function () {
        row.remove();
        if (tbody.children.length === 0) {
            document.getElementById("added-lineups").style.display = "none";
        }
    });
    actionTd.appendChild(removeBtn);
    row.appendChild(actionTd);

    tbody.appendChild(row);
    clearLineupBuilder();
}

// Also let's make sure we only have one event listener for the Add Lineup button
function initializeLineupButtons() {
    const addLineupBtn = document.getElementById("add-lineup");
    if (addLineupBtn) {
        // Remove any existing listeners
        const newBtn = addLineupBtn.cloneNode(true);
        addLineupBtn.parentNode.replaceChild(newBtn, addLineupBtn);

        // Add new listener
        newBtn.addEventListener("click", function () {
            const lineup = gatherLineupData();
            if (validateLineup(lineup)) {
                addLineupToTable(lineup);
            }
        });
    }
}

function getPlayerImageUrl(player) {
    // Handle DST differently
    if (player.position === "DST") {
        // Just take the team name before any parentheses and lowercase it
        const teamName = player.name.split("(")[0].trim().toLowerCase();
        return `/static/player_images/${teamName}.png`;
    }

    // Regular player handling
    const fullName = player.name.split("(")[0].trim().toLowerCase();

    // Split into parts and take only first two parts (first and last name)
    const nameParts = fullName.split(" ");
    const firstName = nameParts[0].replace(/[\.\']/g, ""); // Remove periods and apostrophes
    const lastName = nameParts.length > 1 ? nameParts[1] : "";

    // Remove any Jr, III, etc. from lastName and remove periods and apostrophes
    const cleanLastName =
        lastName
            .split(/\s|\.|\'/)
            .shift()
            .replace(/[\.\']/g, "") || "";

    return `/static/player_images/${firstName}_${cleanLastName}.png`;
}

// Add this new function for placeholder image
function getPlaceholderImageUrl() {
    return "/static/player_images/player_placeholder.png"; // Default placeholder image
}

function initializeCorrelationSelect(selectElement) {
    try {
        // Add multiple attribute
        selectElement.setAttribute("multiple", "multiple");

        // Create options with data attributes first
        players.forEach((player) => {
            const option = document.createElement("option");
            option.value = player.id;
            option.text = `${player.name} (${player.team} - ${player.position})`;
            option.dataset.salary = player.salary;
            option.dataset.fpts = player.fpts;
            option.dataset.position = player.position;
            option.dataset.image = getPlayerImageUrl({
                name: player.name,
                position: player.position,
            });
            option.dataset.gameInfo = player.gameInfo || "";
            selectElement.appendChild(option);
        });

        $(selectElement).select2({
            placeholder: "Select players",
            allowClear: true,
            width: "100%",
            templateResult: formatPlayerOption,
            templateSelection: function (option) {
                if (!option.id) return option.text;

                const $option = $(option.element);
                // Just get the name and team-position part
                const text = option.text.split(" |")[0]; // Only take the part before any stats
                return text; // Will show "Player Name (Team - Pos)"
            },
            escapeMarkup: function (markup) {
                return markup;
            },
        });
    } catch (error) {
        console.error("Error initializing correlation Select2:", error);
    }
}

// Lineup Builder Functions
function clearLineupBuilder() {
    // Clear all select2 dropdowns
    document.querySelectorAll(".player-select").forEach((select) => {
        // Clear the select2 instance
        $(select).val(null).trigger("change");
    });

    // Clear any warnings
    const warningsContainer = document.getElementById("lineup-warnings");
    if (warningsContainer) {
        warningsContainer.innerHTML = "";
    }

    // Reset lineup stats
    document.getElementById("salary-total").textContent = "$0";
    document.getElementById("projected-points").textContent = "0";

    // Remove over-salary class if it exists
    document.querySelector(".salary-tracker")?.classList.remove("over-salary");
}

// Utility function to create tooltip icons
function createTooltipIcon(tooltipText) {
    const escapedText = tooltipText
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    return `<i class="bi bi-info-circle-fill tooltip-icon" data-bs-toggle="tooltip" data-bs-placement="top" title="${escapedText}"></i>`;
}

// Function to initialize tooltips within a container
function initializeTooltips(container) {
    const tooltipTriggerList = [].slice.call(
        container.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    tooltipTriggerList.forEach(function (tooltipTriggerEl) {
        new bootstrap.Tooltip(tooltipTriggerEl);
    });
}
