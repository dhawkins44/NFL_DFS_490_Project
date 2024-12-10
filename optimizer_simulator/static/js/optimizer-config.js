// Add these functions at the top level, before the DOMContentLoaded event
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

function getPlaceholderImageUrl() {
    return "/static/player_images/player_placeholder.png";
}

document.addEventListener("DOMContentLoaded", function () {
    let players = [];
    let teams = new Set();
    let matchups = new Set();
    let isConfigCollapsed = false;

    // Fetch players from backend
    fetch("/optimizer_simulator/get_players/")
        .then((response) => response.json())
        .then((data) => {
            // Transform the players data to match what the optimizer expects
            players = data.players.map((player) => ({
                Name: player.Name,
                ID: player.ID,
                Team: player.Team,
                Position: player.Position,
                Salary: player.Salary,
                Fpts: player.Fpts,
                GameInfo: player.GameInfo,
            }));

            // Extract unique teams and matchups
            players.forEach((player) => {
                if (player.Team) teams.add(player.Team);
                if (player.GameInfo) matchups.add(player.GameInfo);
            });

            // Convert to array of objects for Select2
            teams = Array.from(teams).map((team) => ({
                value: team,
                label: team,
            }));

            matchups = Array.from(matchups).map((matchup) => ({
                value: matchup,
                label: matchup,
            }));

            initializeAtLeastRules();
            initializeAtMostRules();
            initializePairRules();
            initializeLimitRules();
            initializeTeamLimits();
            initializeMatchupLimits();
            initializeMatchupAtLeast();
        })
        .catch((error) => console.error("Error fetching players:", error));

    function toggleConfig() {
        const content = document.getElementById("config-content");
        const toggleBtn = document.getElementById("toggle-config");
        if (!content || !toggleBtn) return;

        const icon = toggleBtn.querySelector(".bi");

        // Toggle the collapsed state
        isConfigCollapsed = !isConfigCollapsed;
        content.classList.toggle("collapsed", isConfigCollapsed);
        toggleBtn.classList.toggle("collapsed", isConfigCollapsed);

        // Toggle the icon class
        if (isConfigCollapsed) {
            icon.classList.remove("bi-chevron-up");
            icon.classList.add("bi-chevron-down");
        } else {
            icon.classList.remove("bi-chevron-down");
            icon.classList.add("bi-chevron-up");
        }
    }

    // Initialize At Least Rules
    function initializeAtLeastRules() {
        document
            .getElementById("addAtLeastRule")
            .addEventListener("click", function () {
                addAtLeastRule();
                updateAtLeastRuleLabels();
            });
    }

    function addAtLeastRule() {
        const container = document.getElementById("atLeastRulesContainer");
        const ruleDiv = document.createElement("div");
        ruleDiv.classList.add("mb-3", "at-least-rule");

        ruleDiv.innerHTML = `
            <div class="form-label-wrapper d-flex align-items-center">
                <label class="me-2"></label>
                <i class="bi bi-info-circle-fill tooltip-icon" data-bs-toggle="tooltip" data-bs-placement="top" title="Minimum number of players to select from this group"></i>
            </div>
            <div class="input-group">
                <span class="input-group-text">At least</span>
                <input type="number" class="form-control" name="at_least_count" value="1" min="1" style="max-width: 80px;">
                <span class="input-group-text">of</span>
                <select class="form-control select2" name="at_least_players" multiple="multiple" style="flex: 1;">
                    <!-- Options will be populated dynamically -->
                </select>
                <button class="btn btn-danger remove-rule-btn" title="Remove rule">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        container.appendChild(ruleDiv);

        // Populate player options
        const selectElement = ruleDiv.querySelector(
            `select[name="at_least_players"]`
        );
        initializePlayerSelect(selectElement);

        // Remove rule event
        ruleDiv
            .querySelector(".remove-rule-btn")
            .addEventListener("click", function () {
                ruleDiv.remove();
                updateAtLeastRuleLabels();
            });
    }

    function updateAtLeastRuleLabels() {
        const atLeastRules = document.querySelectorAll(
            "#atLeastRulesContainer .at-least-rule"
        );
        atLeastRules.forEach((ruleDiv, index) => {
            const label = ruleDiv.querySelector(".form-label-wrapper label");
            label.textContent = `At Least Rule ${index + 1}`;
        });
    }

    // Initialize At Most Rules
    function initializeAtMostRules() {
        document
            .getElementById("addAtMostRule")
            .addEventListener("click", function () {
                addAtMostRule();
                updateAtMostRuleLabels();
            });
    }

    function addAtMostRule() {
        const container = document.getElementById("atMostRulesContainer");
        const ruleDiv = document.createElement("div");
        ruleDiv.classList.add("mb-3", "at-most-rule");

        ruleDiv.innerHTML = `
            <div class="form-label-wrapper d-flex align-items-center">
                <label class="me-2"></label>
                <i class="bi bi-info-circle-fill tooltip-icon" data-bs-toggle="tooltip" data-bs-placement="top" title="Maximum number of players to select from this group"></i>
            </div>
            <div class="input-group">
                <span class="input-group-text">At most</span>
                <input type="number" class="form-control" name="at_most_count" value="1" min="0" style="max-width: 80px;">
                <span class="input-group-text">of</span>
                <select class="form-control select2" name="at_most_players" multiple="multiple" style="flex: 1;">
                    <!-- Options will be populated dynamically -->
                </select>
                <button class="btn btn-danger remove-rule-btn" title="Remove rule">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        container.appendChild(ruleDiv);

        // Populate player options
        const selectElement = ruleDiv.querySelector(
            `select[name="at_most_players"]`
        );
        initializePlayerSelect(selectElement);

        // Remove rule event
        ruleDiv
            .querySelector(".remove-rule-btn")
            .addEventListener("click", function () {
                ruleDiv.remove();
                updateAtMostRuleLabels();
            });
    }

    function updateAtMostRuleLabels() {
        const atMostRules = document.querySelectorAll(
            "#atMostRulesContainer .at-most-rule"
        );
        atMostRules.forEach((ruleDiv, index) => {
            const label = ruleDiv.querySelector(".form-label-wrapper label");
            label.textContent = `At Most Rule ${index + 1}`;
        });
    }

    // Initialize Pair Rules
    function initializePairRules() {
        document
            .getElementById("addPairRule")
            .addEventListener("click", function () {
                addPairRule();
                updatePairRuleLabels();
            });
    }

    function addPairRule() {
        const container = document.getElementById("pairRulesContainer");
        const ruleDiv = document.createElement("div");
        ruleDiv.classList.add("pair-rule");

        ruleDiv.innerHTML = `
            <div class="form-label-wrapper d-flex align-items-center">
                <label class="me-2"></label>
                <i class="bi bi-info-circle-fill tooltip-icon" data-bs-toggle="tooltip" data-bs-placement="top" title="Define stacking rules with key positions"></i>
            </div>
            <div class="d-flex align-items-start gap-4 flex-wrap">
                <div class="form-group" style="min-width: 120px;">
                    <label>Key Position</label>
                    <select class="form-control" name="pair_key">
                        <option value="QB">QB</option>
                        <option value="RB">RB</option>
                        <option value="WR">WR</option>
                        <option value="TE">TE</option>
                        <option value="DST">DST</option>
                    </select>
                </div>
                
                <div class="form-group" style="flex: 0 1 auto;">
                    <label>Positions to Pair</label>
                    <div class="position-checkboxes">
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" name="pair_positions" value="RB">
                            <label class="form-check-label">RB</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" name="pair_positions" value="WR">
                            <label class="form-check-label">WR</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" name="pair_positions" value="TE">
                            <label class="form-check-label">TE</label>
                        </div>
                    </div>
                </div>
                
                <div class="form-group" style="width: 80px;">
                    <label>Count</label>
                    <input type="number" class="form-control" name="pair_count" value="1" min="1">
                </div>
                
                <div class="form-group" style="min-width: 130px;">
                    <label>Type</label>
                    <select class="form-control" name="pair_type">
                        <option value="same-team">Same Team</option>
                        <option value="opp-team">Opposing Team</option>
                        <option value="same-game">Same Game</option>
                    </select>
                </div>
                
                <div class="form-group" style="min-width: 150px;">
                    <label>Exclude Teams</label>
                    <select class="form-control team-select" name="exclude_teams" multiple="multiple">
                        <!-- Options will be populated dynamically -->
                    </select>
                </div>
                
                <div class="form-group" style="align-self: center;">
                    <button class="btn btn-danger remove-rule-btn" title="Remove rule">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(ruleDiv);

        // Initialize exclude teams select
        const excludeTeamsSelect = ruleDiv.querySelector(
            'select[name="exclude_teams"]'
        );
        initializeSearchableDropdown(
            excludeTeamsSelect,
            teams,
            "Select teams to exclude"
        );

        // Remove rule event
        ruleDiv
            .querySelector(".remove-rule-btn")
            .addEventListener("click", () => {
                ruleDiv.remove();
                updatePairRuleLabels();
            });
    }

    function updatePairRuleLabels() {
        const pairRules = document.querySelectorAll(
            "#pairRulesContainer .pair-rule"
        );
        pairRules.forEach((ruleDiv, index) => {
            const label = ruleDiv.querySelector(".form-label-wrapper label");
            label.textContent = `Pair Rule ${index + 1}`;
        });
    }

    // Initialize Limit Rules
    function initializeLimitRules() {
        document
            .getElementById("addLimitRule")
            .addEventListener("click", function () {
                addLimitRule();
                updateLimitRuleLabels();
            });
    }

    function addLimitRule() {
        const container = document.getElementById("limitRulesContainer");
        const ruleDiv = document.createElement("div");
        ruleDiv.classList.add("limit-rule");

        ruleDiv.innerHTML = `
            <div class="form-label-wrapper d-flex align-items-center">
                <label class="me-2"></label>
                <i class="bi bi-info-circle-fill tooltip-icon" data-bs-toggle="tooltip" data-bs-placement="top" title="Limit positions in certain contexts"></i>
            </div>
            <div class="d-flex align-items-start gap-4 flex-wrap">
                <div class="form-group" style="min-width: 200px;">
                    <label>Positions to Limit</label>
                    <div class="position-checkboxes">
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" name="limit_positions" value="RB">
                            <label class="form-check-label">RB</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" name="limit_positions" value="WR">
                            <label class="form-check-label">WR</label>
                        </div>
                        <div class="form-check form-check-inline">
                            <input class="form-check-input" type="checkbox" name="limit_positions" value="TE">
                            <label class="form-check-label">TE</label>
                        </div>
                        <!-- Add more checkboxes as needed -->
                    </div>
                </div>
                <div class="form-group" style="min-width: 130px;">
                    <label>Type</label>
                    <select class="form-control" name="limit_type">
                        <option value="same-team">Same Team</option>
                        <option value="opp-team">Opposing Team</option>
                        <option value="same-game">Same Game</option>
                    </select>
                </div>
                <div class="form-group" style="width: 80px;">
                    <label>Count</label>
                    <input type="number" class="form-control" name="limit_count" value="1" min="1">
                </div>
                <div class="form-group" style="min-width: 150px;">
                    <label>Unless Positions</label>
                    <select class="form-control select2" name="limit_unless_positions" multiple>
                        <option value="QB">QB</option>
                        <option value="RB">RB</option>
                        <option value="WR">WR</option>
                        <option value="TE">TE</option>
                        <option value="DST">DST</option>
                    </select>
                </div>
                <div class="form-group" style="min-width: 130px;">
                    <label>Unless Type</label>
                    <select class="form-control" name="limit_unless_type">
                        <option value="same-team">Same Team</option>
                        <option value="opp-team">Opposing Team</option>
                        <option value="same-game">Same Game</option>
                    </select>
                </div>
                <div class="form-group" style="align-self: center;">
                    <button class="btn btn-danger remove-rule-btn" title="Remove rule">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;

        container.appendChild(ruleDiv);

        // Initialize Select2 on 'Unless Positions'
        const unlessPositionsSelect = ruleDiv.querySelector(
            `select[name="limit_unless_positions"]`
        );
        $(unlessPositionsSelect).select2({
            placeholder: "Select positions",
            width: "resolve",
            allowClear: true,
        });

        // Remove rule event
        ruleDiv
            .querySelector(".remove-rule-btn")
            .addEventListener("click", function () {
                ruleDiv.remove();
                updateLimitRuleLabels();
            });
    }

    function updateLimitRuleLabels() {
        const limitRules = document.querySelectorAll(
            "#limitRulesContainer .limit-rule"
        );
        limitRules.forEach((ruleDiv, index) => {
            const label = ruleDiv.querySelector(".form-label-wrapper label");
            label.textContent = `Limit Rule ${index + 1}`;
        });
    }

    // Initialize Team Limits
    function initializeTeamLimits() {
        document
            .getElementById("addTeamLimit")
            .addEventListener("click", function () {
                addTeamLimit();
                updateTeamLimitLabels();
            });
    }

    function addTeamLimit() {
        const container = document.getElementById("teamLimitsContainer");
        const limitDiv = document.createElement("div");
        limitDiv.classList.add("mb-3", "team-limit");

        limitDiv.innerHTML = `
            <div class="form-label-wrapper d-flex align-items-center">
                <label class="me-2"></label>
                <i class="bi bi-info-circle-fill tooltip-icon" data-bs-toggle="tooltip" data-bs-placement="top" title="Limit players from specific teams"></i>
            </div>
            <div class="input-group">
                <span class="input-group-text">Team</span>
                <select class="form-control team-select" name="team_name">
                    <!-- Options will be populated dynamically -->
                </select>
                <span class="input-group-text">Limit</span>
                <input type="number" class="form-control" name="team_limit" value="1" min="1" style="max-width: 80px;">
                <button class="btn btn-danger remove-team-limit-btn" title="Remove limit">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        container.appendChild(limitDiv);

        // Initialize team select
        const teamSelect = limitDiv.querySelector('select[name="team_name"]');
        initializeSearchableDropdown(teamSelect, teams, "Select team");

        // Remove limit event
        limitDiv
            .querySelector(".remove-team-limit-btn")
            .addEventListener("click", function () {
                limitDiv.remove();
                updateTeamLimitLabels();
            });
    }

    function updateTeamLimitLabels() {
        const teamLimits = document.querySelectorAll(
            "#teamLimitsContainer .team-limit"
        );
        teamLimits.forEach((limitDiv, index) => {
            const label = limitDiv.querySelector(".form-label-wrapper label");
            label.textContent = `Team Limit ${index + 1}`;
        });
    }

    // Initialize Matchup Limits
    function initializeMatchupLimits() {
        document
            .getElementById("addMatchupLimit")
            .addEventListener("click", function () {
                addMatchupLimit();
                updateMatchupLimitLabels();
            });
    }

    function addMatchupLimit() {
        const container = document.getElementById("matchupLimitsContainer");
        const limitDiv = document.createElement("div");
        limitDiv.classList.add("mb-3", "matchup-limit");

        limitDiv.innerHTML = `
            <div class="form-label-wrapper d-flex align-items-center">
                <label class="me-2"></label>
                <i class="bi bi-info-circle-fill tooltip-icon" data-bs-toggle="tooltip" data-bs-placement="top" title="Limit players from specific matchups"></i>
            </div>
            <div class="input-group">
                <span class="input-group-text">Matchup</span>
                <select class="form-control matchup-select" name="matchup_name">
                    <!-- Options will be populated dynamically -->
                </select>
                <span class="input-group-text">Limit</span>
                <input type="number" class="form-control" name="matchup_limit" value="1" min="1" style="max-width: 80px;">
                <button class="btn btn-danger remove-matchup-limit-btn" title="Remove limit">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        container.appendChild(limitDiv);

        // Initialize matchup select
        const matchupSelect = limitDiv.querySelector(
            'select[name="matchup_name"]'
        );
        initializeSearchableDropdown(matchupSelect, matchups, "Select matchup");

        // Remove limit event
        limitDiv
            .querySelector(".remove-matchup-limit-btn")
            .addEventListener("click", function () {
                limitDiv.remove();
                updateMatchupLimitLabels();
            });
    }
    function updateMatchupLimitLabels() {
        const matchupLimits = document.querySelectorAll(
            "#matchupLimitsContainer .matchup-limit"
        );
        matchupLimits.forEach((limitDiv, index) => {
            const label = limitDiv.querySelector(".form-label-wrapper label");
            label.textContent = `Matchup Limit ${index + 1}`;
        });
    }

    // Initialize Matchup At Least
    function initializeMatchupAtLeast() {
        document
            .getElementById("addMatchupAtLeast")
            .addEventListener("click", function () {
                addMatchupAtLeast();
                updateMatchupAtLeastLabels();
            });
    }

    function addMatchupAtLeast() {
        const container = document.getElementById("matchupAtLeastContainer");
        const atLeastDiv = document.createElement("div");
        atLeastDiv.classList.add("mb-3", "matchup-at-least");

        atLeastDiv.innerHTML = `
            <div class="form-label-wrapper d-flex align-items-center">
                <label class="me-2"></label>
                <i class="bi bi-info-circle-fill tooltip-icon" data-bs-toggle="tooltip" data-bs-placement="top" title="Require minimum players from matchups"></i>
            </div>
            <div class="input-group">
                <span class="input-group-text">Matchup</span>
                <select class="form-control matchup-select" name="matchup_at_least_name">
                    <!-- Options will be populated dynamically -->
                </select>
                <span class="input-group-text">At Least</span>
                <input type="number" class="form-control" name="matchup_at_least_count" value="1" min="1" style="max-width: 80px;">
                <button class="btn btn-danger remove-matchup-at-least-btn" title="Remove rule">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        `;

        container.appendChild(atLeastDiv);

        // Initialize matchup select
        const matchupSelect = atLeastDiv.querySelector(
            'select[name="matchup_at_least_name"]'
        );
        initializeSearchableDropdown(matchupSelect, matchups, "Select matchup");

        // Remove at least event
        atLeastDiv
            .querySelector(".remove-matchup-at-least-btn")
            .addEventListener("click", function () {
                atLeastDiv.remove();
                updateMatchupAtLeastLabels();
            });
    }

    function updateMatchupAtLeastLabels() {
        const matchupAtLeasts = document.querySelectorAll(
            "#matchupAtLeastContainer .matchup-at-least"
        );
        matchupAtLeasts.forEach((atLeastDiv, index) => {
            const label = atLeastDiv.querySelector(".form-label-wrapper label");
            label.textContent = `Matchup At Least ${index + 1}`;
        });
    }

    // Collect configuration data on Run Optimizer
    document
        .getElementById("run-optimizer-btn")
        .addEventListener("click", function () {
            // Collapse the configuration section
            toggleConfig(true);
            document.getElementById("lineups-section").style.display = "none";

            const config = {
                // Basic configurations
                num_lineups: document.getElementById("numLineups").value,
                min_salary: document.getElementById("minSalary").value,
                // Additional configurations
                global_team_limit:
                    document.getElementById("globalTeamLimit").value,
                projection_minimum:
                    document.getElementById("projectionMinimum").value,
                num_uniques: document.getElementById("numUniques").value,
                randomness: parseFloat(
                    document.getElementById("randomness").value
                ),
                allow_qb_vs_dst:
                    document.getElementById("allowQbVsDst").checked,
                use_double_te: document.getElementById("useDoubleTe").checked,
                // Collect complex configurations
                at_least: {},
                at_most: {},
                stack_rules: {
                    pair: [],
                    limit: [],
                },
                team_limits: {},
                matchup_limits: {},
                matchup_at_least: {},
            };

            // Collect At Least Rules
            const atLeastRules = document.querySelectorAll(
                "#atLeastRulesContainer .at-least-rule"
            );
            atLeastRules.forEach((ruleDiv) => {
                const count = ruleDiv.querySelector(
                    `input[name="at_least_count"]`
                ).value;
                const selectedPlayers = $(
                    ruleDiv.querySelector(`select[name="at_least_players"]`)
                ).val();

                if (selectedPlayers.length > 0) {
                    if (!config.at_least[count]) {
                        config.at_least[count] = [];
                    }
                    config.at_least[count].push(selectedPlayers);
                }
            });

            // Collect At Most Rules
            const atMostRules = document.querySelectorAll(
                "#atMostRulesContainer .at-most-rule"
            );
            atMostRules.forEach((ruleDiv) => {
                const count = ruleDiv.querySelector(
                    `input[name="at_most_count"]`
                ).value;
                const selectedPlayers = $(
                    ruleDiv.querySelector(`select[name="at_most_players"]`)
                ).val();

                if (selectedPlayers.length > 0) {
                    if (!config.at_most[count]) {
                        config.at_most[count] = [];
                    }
                    config.at_most[count].push(selectedPlayers);
                }
            });

            // Collect Pair Rules
            const pairRules = document.querySelectorAll(
                "#pairRulesContainer .pair-rule"
            );
            pairRules.forEach((ruleDiv) => {
                const key = ruleDiv.querySelector(
                    `select[name="pair_key"]`
                ).value;

                const positions = Array.from(
                    ruleDiv.querySelectorAll(
                        'input[type="checkbox"][name="pair_positions"]:checked'
                    )
                ).map((checkbox) => checkbox.value);

                const count = ruleDiv.querySelector(
                    `input[name="pair_count"]`
                ).value;
                const type = ruleDiv.querySelector(
                    `select[name="pair_type"]`
                ).value;

                const teamTags = ruleDiv.querySelectorAll(
                    ".team-tags-container .team-tag"
                );
                const excludeTeams = Array.from(teamTags).map((tag) =>
                    tag.querySelector("span").textContent.trim()
                );

                config.stack_rules.pair.push({
                    key: key,
                    positions: positions,
                    count: parseInt(count),
                    type: type,
                    exclude_teams: excludeTeams,
                });
            });

            // Collect Limit Rules
            const limitRules = document.querySelectorAll(
                "#limitRulesContainer .limit-rule"
            );
            limitRules.forEach((ruleDiv) => {
                const positions = Array.from(
                    ruleDiv.querySelectorAll(
                        'input[type="checkbox"][name="limit_positions"]:checked'
                    )
                ).map((checkbox) => checkbox.value);

                const type = ruleDiv.querySelector(
                    `select[name="limit_type"]`
                ).value;
                const count = ruleDiv.querySelector(
                    `input[name="limit_count"]`
                ).value;
                const unlessPositions = Array.from(
                    ruleDiv.querySelector(
                        `select[name="limit_unless_positions"]`
                    ).selectedOptions
                ).map((option) => option.value);

                const unlessType = ruleDiv.querySelector(
                    `select[name="limit_unless_type"]`
                ).value;

                const teamTags = ruleDiv.querySelectorAll(
                    ".team-tags-container .team-tag"
                );
                const excludeTeams = Array.from(teamTags).map((tag) =>
                    tag.querySelector("span").textContent.trim()
                );

                const rule = {
                    positions: positions,
                    type: type,
                    count: parseInt(count),
                    exclude_teams: excludeTeams,
                };

                if (unlessPositions.length > 0) {
                    rule.unless_positions = unlessPositions;
                    rule.unless_type = unlessType;
                }

                config.stack_rules.limit.push(rule);
            });

            // Collect Team Limits
            const teamLimits = document.querySelectorAll(
                "#teamLimitsContainer .team-limit"
            );
            teamLimits.forEach((limitDiv) => {
                const teamName = limitDiv
                    .querySelector(`input[name="team_name"]`)
                    .value.trim()
                    .toUpperCase();
                const teamLimit = parseInt(
                    limitDiv.querySelector(`input[name="team_limit"]`).value
                );

                if (teamName && teamLimit) {
                    config.team_limits[teamName] = teamLimit;
                }
            });

            // Collect Matchup Limits
            const matchupLimits = document.querySelectorAll(
                "#matchupLimitsContainer .matchup-limit"
            );
            matchupLimits.forEach((limitDiv) => {
                const matchupName = limitDiv
                    .querySelector(`input[name="matchup_name"]`)
                    .value.trim();
                const matchupLimit = parseInt(
                    limitDiv.querySelector(`input[name="matchup_limit"]`).value
                );

                if (matchupName && matchupLimit) {
                    config.matchup_limits[matchupName] = matchupLimit;
                }
            });

            // Collect Matchup At Least
            const matchupAtLeastRules = document.querySelectorAll(
                "#matchupAtLeastContainer .matchup-at-least"
            );
            matchupAtLeastRules.forEach((atLeastDiv) => {
                const matchupName = atLeastDiv
                    .querySelector(`input[name="matchup_at_least_name"]`)
                    .value.trim();
                const atLeastCount = parseInt(
                    atLeastDiv.querySelector(
                        `input[name="matchup_at_least_count"]`
                    ).value
                );

                if (matchupName && atLeastCount) {
                    config.matchup_at_least[matchupName] = atLeastCount;
                }
            });

            // Show loading overlay
            document.getElementById("loading-overlay").style.display = "flex";

            fetch("/optimizer_simulator/run_optimizer/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": document.querySelector(
                        "[name=csrfmiddlewaretoken]"
                    ).value,
                },
                body: JSON.stringify(config),
            })
                .then((response) => response.json())
                .then((data) => {
                    // Hide loading overlay
                    document.getElementById("loading-overlay").style.display =
                        "none";

                    if (data.success) {
                        // Show lineups section
                        document.getElementById(
                            "lineups-section"
                        ).style.display = "block";

                        // Update download button
                        const downloadBtn =
                            document.getElementById("download-csv");
                        if (downloadBtn) {
                            downloadBtn.href = data.download_url;
                            downloadBtn.style.display = "inline-block";
                        }

                        // Show stats button and add click handler
                        const statsBtn = document.getElementById("view-stats");
                        if (statsBtn) {
                            statsBtn.style.display = "inline-block";
                            statsBtn.addEventListener("click", function () {
                                window.location.href =
                                    "/optimizer_simulator/optimizer_stats/";
                            });
                        }

                        // Initialize lineup display
                        if (typeof window.initializeLineups === "function") {
                            window.initializeLineups(data.lineups);
                        }
                    } else {
                        alert("Error running optimizer: " + data.error);
                        // Expand the configuration section back if there's an error
                        toggleConfig(false);
                    }
                })
                .catch((error) => {
                    console.error("Error:", error);
                    alert("Error running optimizer: " + error);
                    document.getElementById("loading-overlay").style.display =
                        "none";
                    // Expand the configuration section back if there's an error
                    toggleConfig(false);
                });
        });

    // Toggle configuration section
    const configHeader = document.querySelector(".config-header");
    if (configHeader) {
        configHeader.addEventListener("click", function () {
            toggleConfig();
        });
    }

    const toggleBtn = document.getElementById("toggle-config");
    if (toggleBtn) {
        toggleBtn.addEventListener("click", function (event) {
            event.stopPropagation(); // Prevents the event from bubbling up to the header
            toggleConfig(); // Manually call the toggleConfig function
        });
    }

    // Re-upload button
    document
        .getElementById("reupload-btn")
        ?.addEventListener("click", function () {
            const uploadModal = new bootstrap.Modal(
                document.getElementById("upload-modal")
            );
            uploadModal.show();
        });

    // Show upload modal on initial load if needed
    if (document.body.classList.contains("show-upload-modal")) {
        const uploadModal = new bootstrap.Modal(
            document.getElementById("upload-modal")
        );
        uploadModal.show();
    }

    // Update the player select initialization in addAtLeastRule and addAtMostRule:
    function initializePlayerSelect(selectElement) {
        // Clear any existing options
        selectElement.innerHTML = "";

        // Add empty option
        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        selectElement.appendChild(emptyOption);

        // Add player options with all necessary data
        players.forEach((player) => {
            const option = document.createElement("option");
            option.value = player.Name;
            option.text = `${player.Name} (${player.Team} - ${player.Position})`;
            option.dataset.salary = player.Salary;
            option.dataset.fpts = player.Fpts;
            option.dataset.position = player.Position;
            option.dataset.image = getPlayerImageUrl({
                name: player.Name,
                position: player.Position,
            });
            option.dataset.gameInfo = player.GameInfo || "";
            selectElement.appendChild(option);
        });

        // Initialize Select2 with the same formatting as simulator
        $(selectElement).select2({
            placeholder: "Select players",
            width: "resolve",
            allowClear: true,
            templateResult: formatPlayerOption,
            templateSelection: function (option) {
                if (!option.id) return option.text;
                return option.text; // Just show name and team-position for selected
            },
            escapeMarkup: function (markup) {
                return markup;
            },
        });
    }

    // Add this function for Team/Matchup dropdowns
    function initializeSearchableDropdown(selectElement, options, placeholder) {
        // Add multiple attribute to the select element
        selectElement.setAttribute("multiple", "multiple");

        // Clear existing options
        selectElement.innerHTML = "";

        // Add empty option
        const emptyOption = document.createElement("option");
        emptyOption.value = "";
        selectElement.appendChild(emptyOption);

        // Add all options
        options.forEach((option) => {
            const optElement = document.createElement("option");
            optElement.value = option.value;
            optElement.text = option.label;
            selectElement.appendChild(optElement);
        });

        // Initialize Select2
        $(selectElement).select2({
            placeholder: placeholder,
            allowClear: true,
            width: "resolve",
            multiple: true,
            maximumSelectionLength: 1,
            language: {
                maximumSelected: function () {
                    return "You may only select one option";
                },
            },
        });
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
});
