// Global players array
let players = [];

document.addEventListener("DOMContentLoaded", function () {
    // Initialize salary progress bar to 0
    const salaryProgress = document.querySelector(".salary-progress");
    if (salaryProgress) {
        salaryProgress.style.width = "0%";
    }

    // Fetch players first, then initialize everything else
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
    document.querySelectorAll(".player-select").forEach((select) => {
        initializePlayerSelect(select);
    });

    initializeCorrelationRules();

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
                // Check if the function exists before calling it
                if (typeof window.initializeLineups === "function") {
                    window.initializeLineups(data.lineups);
                } else {
                    console.error("initializeLineups function not found");
                }

                // Show lineups section
                document.getElementById("lineups-section").style.display =
                    "block";

                // Update download buttons for both files
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
            }
        })
        .catch((error) => {
            console.error("Error:", error);
            alert("Error running simulation: " + error);
        })
        .finally(() => {
            if (loadingOverlay) {
                loadingOverlay.style.display = "none";
            }
        });
}

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

// Helper functions for simulation results
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

function initializePlayerSelect(selectElement) {
    // Clear any existing selections and data
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
        });
        option.dataset.gameInfo = player.gameInfo || "";
        selectElement.appendChild(option);
    });

    try {
        // Initialize with empty state
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
            <img src="${getPlayerImageUrl(player)}" 
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

function updateLineupStats() {
    const salaryTotal = calculateSalaryTotal();
    const projectedPoints = calculateProjectedPoints();
    const warnings = validateLineup();

    // Update salary display and progress bar
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

    // Update warnings display
    const warningsContainer = document.getElementById("lineup-warnings");
    warningsContainer.innerHTML = warnings
        .map(
            (warning) =>
                `<div class="lineup-warning"><i class="bi bi-exclamation-triangle-fill"></i> ${warning}</div>`
        )
        .join("");

    // Update Add Lineup button state
    const addLineupBtn = document.getElementById("add-lineup");
    if (addLineupBtn) {
        addLineupBtn.disabled = warnings.length > 0;
    }

    return warnings;
}

function clearLineupBuilder() {
    document.querySelectorAll(".player-select").forEach((select) => {
        // Clear the underlying select element
        select.value = "";

        // Reset the Select2 instance
        $(select).val(null).trigger("change");

        // Destroy and reinitialize Select2
        $(select).select2("destroy");
        initializePlayerSelect(select);
    });

    // Reset lineup stats
    document.getElementById("salary-total").textContent = "$0";
    document.getElementById("projected-points").textContent = "0";

    // Clear any warnings
    document.getElementById("lineup-warnings").innerHTML = "";

    // Remove over-salary class if it exists
    document.querySelector(".salary-tracker")?.classList.remove("over-salary");

    // Reset salary progress bar
    const salaryProgress = document.querySelector(".salary-progress");
    if (salaryProgress) {
        salaryProgress.style.width = "0%";
    }
}

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

function addLineupToTable(lineup) {
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
                    <img src="${getPlayerImageUrl(player)}" 
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

    // Add remove button
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

// Move correlation rules functions outside initializeAll
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
        $(ruleDiv).closest(".correlation-rule").remove();
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
