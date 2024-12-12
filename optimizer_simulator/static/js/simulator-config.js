// Global array to store player data fetched from the server
let players = [];

function toggleConfig(show = null) {
    const content = document.getElementById("config-content");
    const toggleBtn = document.getElementById("toggle-config");
    const icon = toggleBtn?.querySelector("i");

    if (show === null) {
        // Toggle mode
        content.classList.toggle("collapsed");
        icon?.classList.toggle("bi-chevron-up");
        icon?.classList.toggle("bi-chevron-down");
    } else if (show) {
        // Show mode
        content.classList.remove("collapsed");
        icon?.classList.add("bi-chevron-up");
        icon?.classList.remove("bi-chevron-down");
    } else {
        // Hide mode
        content.classList.add("collapsed");
        icon?.classList.remove("bi-chevron-up");
        icon?.classList.add("bi-chevron-down");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    // Initialize salary progress bar
    const salaryProgress = document.querySelector(".salary-progress");
    if (salaryProgress) {
        salaryProgress.style.width = "0%";
    }

    // Add click handler for config header
    const configHeader = document.querySelector(".config-header");
    if (configHeader) {
        configHeader.addEventListener("click", () => toggleConfig());
    }

    // Create a function to handle optimizer lineups
    function handleOptimizerLineups() {
        const optimizerLineups = sessionStorage.getItem("optimizer_lineups");
        if (optimizerLineups) {
            try {
                const lineups = JSON.parse(optimizerLineups);
                lineups.forEach((lineup) => {
                    addCustomLineup(lineup);
                });

                // Update lineup count after adding all lineups
                updateLineupCount();

                // Clear the optimizer lineups from storage
                sessionStorage.removeItem("optimizer_lineups");

                // Handle lineup view opening
                const shouldOpenLineupsView =
                    sessionStorage.getItem("open_lineups_view");
                if (shouldOpenLineupsView === "true") {
                    // Open the Custom Lineup Builder section
                    const lineupBuilderCollapse = document.getElementById(
                        "collapseLineupBuilder"
                    );
                    if (lineupBuilderCollapse) {
                        new bootstrap.Collapse(lineupBuilderCollapse, {
                            show: true,
                        });
                    }

                    // Open the Added Lineups section
                    const viewLineupsCollapse = document.getElementById(
                        "collapseViewLineups"
                    );
                    if (viewLineupsCollapse) {
                        setTimeout(() => {
                            new bootstrap.Collapse(viewLineupsCollapse, {
                                show: true,
                            });
                            const addedLineupsTable =
                                document.getElementById("added-lineups");
                            if (addedLineupsTable) {
                                addedLineupsTable.style.display = "block";
                            }
                            viewLineupsCollapse.scrollIntoView({
                                behavior: "smooth",
                                block: "center",
                            });
                        }, 150);
                    }
                }
            } catch (e) {
                console.error("Error loading optimizer lineups:", e);
            }
        }
    }

    // Fetch player data first
    fetch("/optimizer_simulator/get_players/")
        .then((response) => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            players = data.players.map((player) => ({
                id: player.ID,
                name: player.Name,
                team: player.Team,
                position: player.Position,
                salary: parseInt(player.Salary || 0),
                fpts: parseFloat(player.Fpts || 0),
                gameInfo: player.GameInfo || "",
            }));

            if (players.length > 0) {
                initializeAll();
                // Only handle optimizer lineups after players are loaded
                handleOptimizerLineups();
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
    // Initialize correlation rules
    initializeCorrelationRules();

    // Setup config panel toggle
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

    // Initialize lineup builder
    initializeLineupBuilder();

    // Setup simulation button
    document
        .getElementById("run-simulation-btn")
        ?.addEventListener("click", function () {
            const config = gatherSimulationConfig();
            runSimulation(config);
        });
}

function runSimulation(config) {
    const loadingOverlay = document.getElementById("loading-overlay");
    if (loadingOverlay) {
        loadingOverlay.style.display = "flex";
    }

    // Collapse the config panel when running simulation
    toggleConfig(false);

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
                if (typeof window.initializeLineups === "function") {
                    window.initializeLineups(data.lineups);
                } else {
                    console.error("initializeLineups function not found");
                }

                document.getElementById("lineups-section").style.display =
                    "block";

                // Update download links
                const downloadCsv = document.getElementById("download-csv");
                if (downloadCsv) {
                    downloadCsv.href = `/optimizer_simulator/simulator/download/${data.lineups_filename}`;
                    downloadCsv.style.display = "inline-block";
                }

                const downloadExposures =
                    document.getElementById("download-exposures");
                if (downloadExposures) {
                    downloadExposures.href = `/optimizer_simulator/simulator/download/${data.exposures_filename}`;
                    downloadExposures.style.display = "inline-block";
                }
            } else {
                alert("Error running simulation: " + data.error);
                // Show the configuration section back if there's an error
                toggleConfig(true);
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("Error running simulation: " + error);
            // Show the configuration section back if there's an error
            toggleConfig(true);
        })
        .finally(() => {
            if (loadingOverlay) {
                loadingOverlay.style.display = "none";
            }
        });
}

// Gather simulation configuration from form inputs
function gatherSimulationConfig() {
    const customLineups = [];
    // Gather lineups from the table
    document.querySelectorAll("#added-lineups-body tr").forEach((row) => {
        const lineup = [];
        row.querySelectorAll("td:not(:last-child)").forEach((td) => {
            const playerId = td.getAttribute("data-player-id");
            if (playerId) {
                lineup.push(parseInt(playerId));
            }
        });

        // Only add complete lineups with 9 players
        if (lineup.length === 9) {
            customLineups.push(lineup);
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
        use_lineup_input: customLineups.length > 0,
        custom_lineups: customLineups,
        correlation_rules: gatherCorrelationRules(),
    };
}

// Parse CSV results into structured data
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

// Display simulation results in the results table
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

// Initialize player select dropdown with Select2
function initializePlayerSelect(selectElement) {
    $(selectElement).empty().val(null);

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
        option.value = String(player.id);
        option.text = `${player.name} (${player.team} - ${player.position})`;
        option.dataset.salary = player.salary;
        option.dataset.fpts = player.fpts;
        option.dataset.position = player.position;
        option.dataset.image = getPlayerImageUrl({
            name: player.name,
            position: player.position,
        }).url;
        option.dataset.gameInfo = player.gameInfo || "";
        selectElement.appendChild(option);
    });

    try {
        $(selectElement).val([]);

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
                if (selectElement.classList.contains("player-select")) {
                    if (!option.id) return option.text;

                    const $option = $(option.element);
                    const salary = $option.data("salary");
                    const fpts = $option.data("fpts");
                    const gameInfo = $option.data("gameInfo");

                    return `${option.text} | $${parseInt(
                        salary
                    ).toLocaleString()} | ${parseFloat(fpts).toFixed(
                        1
                    )} FPTS | ${gameInfo}`;
                }
                return option.text;
            },
        });

        $(selectElement).on("change", function () {
            updateLineupStats();
        });
    } catch (error) {
        console.error("Error initializing Select2:", error);
    }
}

// Format player option for Select2 dropdown
function formatPlayerOption(option) {
    if (!option.id) {
        return option.text;
    }

    const $option = $(option.element);
    const player = {
        name: option.text.split(" (")[0],
        position: $option.data("position"),
    };

    return $(`
        <div class="player-option">
            <img src="${getPlayerImageUrl(player).url}" 
                 alt="${option.text}"
                 class="img-option"
                 onerror="this.src='${getPlaceholderImageUrl()}'">
            <div class="player-info">
                <div class="player-name">${option.text}</div>
                <div class="player-stats">
                    <span class="salary">$${parseInt(
                        $option.data("salary")
                    ).toLocaleString()}</span>
                    <span class="projection">${parseFloat(
                        $option.data("fpts")
                    ).toFixed(1)} FPTS</span>
                    <span class="game-info">${$option.data("gameInfo")}</span>
                </div>
            </div>
        </div>
    `);
}

// Update lineup statistics (salary, points, warnings)
function updateLineupStats() {
    const salaryTotal = calculateSalaryTotal();
    const projectedPoints = calculateProjectedPoints();
    const warnings = validateLineup();

    const maxSalary = 50000;
    const salaryProgress = document.querySelector(".salary-progress");
    if (salaryProgress) {
        const progressWidth = Math.min((salaryTotal / maxSalary) * 100, 100);
        salaryProgress.style.width = `${progressWidth}%`;
    }

    document.getElementById(
        "salary-total"
    ).textContent = `$${salaryTotal.toLocaleString()}`;
    document.getElementById("projected-points").textContent =
        projectedPoints.toFixed(1);

    const salaryTracker = document.querySelector(".salary-tracker");
    if (salaryTotal > 50000) {
        salaryTracker?.classList.add("over-salary");
    } else {
        salaryTracker?.classList.remove("over-salary");
    }
}

function calculateSalaryTotal() {
    let total = 0;
    document.querySelectorAll(".player-select").forEach((select) => {
        const selectedOption = select.selectedOptions[0];
        if (selectedOption) {
            total += parseInt(selectedOption.dataset.salary || 0);
        }
    });
    return total;
}

function calculateProjectedPoints() {
    let total = 0;
    document.querySelectorAll(".player-select").forEach((select) => {
        const selectedOption = select.selectedOptions[0];
        if (selectedOption) {
            total += parseFloat(selectedOption.dataset.fpts || 0);
        }
    });
    return total;
}

// Validate lineup for salary cap and duplicate players
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

    const selectedPlayers = new Set();
    document.querySelectorAll(".player-select").forEach((select) => {
        const selectedOption = select.selectedOptions[0];
        if (selectedOption && selectedOption.value) {
            if (selectedPlayers.has(selectedOption.value)) {
                warnings.push(
                    "You have selected the same player multiple times"
                );
            } else {
                selectedPlayers.add(selectedOption.value);
            }
        }
    });

    const warningsContainer = document.getElementById("lineup-warnings");
    warningsContainer.innerHTML = warnings
        .map(
            (warning) =>
                `<div class="lineup-warning"><i class="bi bi-exclamation-triangle-fill"></i> ${warning}</div>`
        )
        .join("");

    const addLineupBtn = document.getElementById("add-lineup");
    if (addLineupBtn) {
        addLineupBtn.disabled = warnings.length > 0;
    }

    return warnings;
}

// Reset lineup builder to initial state
function clearLineupBuilder() {
    document.querySelectorAll(".player-select").forEach((select) => {
        select.value = "";
        $(select).val(null).trigger("change");
        $(select).select2("destroy");
        initializePlayerSelect(select);
    });

    document.getElementById("salary-total").textContent = "$0";
    document.getElementById("projected-points").textContent = "0";
    document.getElementById("lineup-warnings").innerHTML = "";
    document.querySelector(".salary-tracker")?.classList.remove("over-salary");

    const salaryProgress = document.querySelector(".salary-progress");
    if (salaryProgress) {
        salaryProgress.style.width = "0%";
    }
}

// Collect current lineup data
function gatherLineupData() {
    const lineup = [];
    document.querySelectorAll(".player-select").forEach((select) => {
        const selectedOption = select.selectedOptions[0];
        if (selectedOption) {
            const playerId = String(selectedOption.value);
            const player = players.find((p) => String(p.id) === playerId);
            if (player) {
                lineup.push({
                    id: player.id,
                    name: player.name,
                    position: player.position,
                    team: player.team,
                });
            }
        }
    });
    return lineup;
}

// Add lineup to saved lineups table
function addLineupToTable(lineup) {
    if (!lineup || lineup.length === 0) {
        console.log("No valid lineup to add");
        return;
    }

    const tbody = document.getElementById("added-lineups-body");
    if (!tbody) {
        console.error("Could not find added-lineups-body");
        return;
    }

    const row = document.createElement("tr");

    lineup.forEach((player) => {
        const td = document.createElement("td");
        td.setAttribute("data-player-id", player.id);
        td.className = "text-center";
        if (player && player.name) {
            td.innerHTML = `
                <div class="player-cell">
                    <img src="${getPlayerImageUrl(player).url}" 
                         alt="${player.name}" 
                         class="player-image"
                         onerror="this.src='${getPlaceholderImageUrl()}'">
                    <div class="player-name">${player.name
                        .split("(")[0]
                        .trim()}</div>
                </div>
            `;
        }
        row.appendChild(td);
    });

    const actionTd = document.createElement("td");
    actionTd.className = "text-center";
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-sm btn-danger";
    removeBtn.innerHTML = '<i class="bi bi-trash"></i>';
    removeBtn.addEventListener("click", function () {
        row.remove();

        // Ensure count is updated after DOM is modified
        setTimeout(() => {
            updateLineupCount();

            // Hide table if no lineups left
            const tbody = document.getElementById("added-lineups-body");
            if (tbody && tbody.children.length === 0) {
                document.getElementById("added-lineups").style.display = "none";
            }
        }, 0);
    });
    actionTd.appendChild(removeBtn);
    row.appendChild(actionTd);

    tbody.appendChild(row);
    document.getElementById("added-lineups").style.display = "block";

    // Ensure count is updated after DOM is modified
    setTimeout(() => {
        updateLineupCount();
    }, 0);

    // Clear the lineup builder after successfully adding the lineup
    clearLineupBuilder();
}

let correlationRulesInitialized = false;

// Initialize correlation rules functionality
function initializeCorrelationRules() {
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

// Add new correlation rule to the list
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

    const selectElement = ruleDiv.querySelector(".correlation-player-select");
    initializeCorrelationSelect(selectElement);

    const removeBtn = ruleDiv.querySelector(".remove-rule-btn");
    removeBtn.addEventListener("click", function () {
        $(ruleDiv).closest(".correlation-rule").remove();
        updateCorrelationRuleLabels();
    });
}

// Update correlation rule numbers after removal
function updateCorrelationRuleLabels() {
    const correlationRules = document.querySelectorAll(
        "#correlation-rules-list .correlation-rule"
    );
    correlationRules.forEach((ruleDiv, index) => {
        const label = ruleDiv.querySelector(".form-label-wrapper label");
        label.textContent = `Correlation Rule ${index + 1}`;
    });
}

// Initialize Select2 for correlation player selection
function initializeCorrelationSelect(selectElement) {
    try {
        selectElement.setAttribute("multiple", "multiple");

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
            }).url;
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
                const text = option.text.split(" |")[0];
                return text;
            },
            escapeMarkup: function (markup) {
                return markup;
            },
        });
    } catch (error) {
        console.error("Error initializing correlation Select2:", error);
    }
}

function gatherCorrelationRules() {
    const rules = [];
    document.querySelectorAll(".correlation-rule").forEach((ruleDiv) => {
        const playerSelect = ruleDiv.querySelector(
            ".correlation-player-select"
        );
        const positionSelect = ruleDiv.querySelector(".position-select");
        const correlationValue = ruleDiv.querySelector(".correlation-value");

        if (playerSelect && positionSelect && correlationValue) {
            const selectedPlayers = $(playerSelect).select2("data");
            const position = positionSelect.value;
            const value = parseFloat(correlationValue.value);

            if (selectedPlayers.length > 0 && !isNaN(value)) {
                selectedPlayers.forEach((player) => {
                    rules.push({
                        player_id: player.id,
                        player_name: player.text.split(" (")[0],
                        position: position,
                        correlation: value,
                    });
                });
            }
        }
    });
    return rules;
}

function addCustomLineup(lineup) {
    const tbody = document.getElementById("added-lineups-body");
    if (!tbody) return;

    console.log("Adding lineup:", lineup);
    console.log("Available players:", players);

    const row = document.createElement("tr");

    // Add each player to the row
    lineup.forEach((playerId) => {
        // Convert both IDs to strings for comparison and log the lookup
        const stringId = String(playerId);
        console.log("Looking for player ID:", stringId);

        const player = players.find((p) => String(p.id) === stringId);
        console.log("Found player:", player);

        if (player) {
            const td = document.createElement("td");
            td.setAttribute("data-player-id", player.id);
            td.className = "text-center";

            // Split name handling
            const nameParts = player.name.split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ");

            td.innerHTML = `
                <div class="player-cell">
                    <img src="${
                        getPlayerImageUrl({
                            first_name: player.name.split(" ")[0],
                            last_name: player.name
                                .split(" ")
                                .slice(1)
                                .join(" "),
                            position: player.position,
                            Team: player.team,
                        }).url
                    }" 
                         alt="${player.name}" 
                         class="player-image"
                         onerror="this.src='${getPlaceholderImageUrl()}'">
                    <div class="player-name">${player.name}</div>
                </div>
            `;
            row.appendChild(td);
        }
    });

    // Add remove button
    const actionTd = document.createElement("td");
    actionTd.className = "text-center";
    actionTd.innerHTML =
        '<button class="btn btn-sm btn-danger"><i class="bi bi-trash"></i></button>';
    actionTd.querySelector("button").addEventListener("click", function () {
        row.remove();

        // Ensure count is updated after DOM is modified
        setTimeout(() => {
            updateLineupCount();

            // Hide table if no lineups left
            const tbody = document.getElementById("added-lineups-body");
            if (tbody && tbody.children.length === 0) {
                document.getElementById("added-lineups").style.display = "none";
            }
        }, 0);
    });
    row.appendChild(actionTd);

    tbody.appendChild(row);
    document.getElementById("added-lineups").style.display = "block";

    // Ensure count is updated after DOM is modified
    setTimeout(() => {
        updateLineupCount();
    }, 0);
}

// Add this new function
function initializeLineupBuilder() {
    // Initialize player select dropdowns
    document.querySelectorAll(".player-select").forEach((select) => {
        initializePlayerSelect(select);
    });

    // Setup lineup management buttons
    const addLineupBtn = document.getElementById("add-lineup");
    if (addLineupBtn) {
        addLineupBtn.addEventListener("click", function () {
            const warnings = validateLineup();
            if (warnings.length === 0) {
                const lineup = gatherLineupData();
                if (lineup.length === 9) {
                    addLineupToTable(lineup);
                }
            }
        });
    }

    const clearLineupBtn = document.getElementById("clear-lineup");
    if (clearLineupBtn) {
        clearLineupBtn.addEventListener("click", clearLineupBuilder);
    }
}

function updateLineupCount() {
    const tbody = document.getElementById("added-lineups-body");
    const count = tbody ? tbody.children.length : 0;
    console.log("Current lineup count:", count); // Debug log

    // Update all instances of custom-lineup-count class
    const countElements = document.querySelectorAll(".custom-lineup-count");
    console.log("Found count elements:", countElements.length); // Debug log
    countElements.forEach((element) => {
        element.textContent = count;
    });

    // Update the badge in the View Lineups accordion header
    const viewLineupsHeader = document.querySelector(
        "#viewLineupsHeader .badge"
    );
    if (viewLineupsHeader) {
        viewLineupsHeader.textContent = count;
    }

    // Update any other instances of the count
    const customLineupCount = document.getElementById("custom-lineup-count");
    if (customLineupCount) {
        customLineupCount.textContent = count;
    }
}
