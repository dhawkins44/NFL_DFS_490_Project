document.addEventListener("DOMContentLoaded", function () {
    let players = [];
    let isConfigCollapsed = false;

    // Fetch players from backend
    fetch("/optimizer_simulator/get_players/")
        .then((response) => response.json())
        .then((data) => {
            players = data.players;
            initializeAtLeastRules();
            initializeAtMostRules();
            initializePairRules();
            initializeLimitRules();
            initializeTeamLimits();
            initializeMatchupLimits();
            initializeMatchupAtLeast();
            initializeCustomCorrelations();
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

    // Function to create tooltip icon HTML
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

    // Initialize tooltips on the entire document (for static elements)
    initializeTooltips(document.body);

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
                ${createTooltipIcon(
                    "Minimum number of players to select from this group"
                )}
            </div>
            <div class="input-group">
                <span class="input-group-text">At least</span>
                <input type="number" class="form-control" name="at_least_count" value="1" min="1" style="max-width: 80px;">
                <span class="input-group-text">of</span>
                <select class="form-control select2" name="at_least_players" multiple="multiple" style="flex: 1;">
                    <!-- Options will be populated dynamically -->
                </select>
                <button class="btn btn-danger remove-rule-btn">Remove</button>
            </div>
        `;

        container.appendChild(ruleDiv);
        initializeTooltips(ruleDiv);

        // Populate player options
        const selectElement = ruleDiv.querySelector(
            `select[name="at_least_players"]`
        );
        players.forEach((player) => {
            const option = document.createElement("option");
            option.value = player.Name;
            option.text = player.Name;
            selectElement.appendChild(option);
        });

        // Initialize Select2
        $(selectElement).select2({
            placeholder: "Select players",
            width: "resolve",
            allowClear: true,
        });

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
                ${createTooltipIcon(
                    "Maximum number of players to select from this group"
                )}
            </div>
            <div class="input-group">
                <span class="input-group-text">At most</span>
                <input type="number" class="form-control" name="at_most_count" value="1" min="0" style="max-width: 80px;">
                <span class="input-group-text">of</span>
                <select class="form-control select2" name="at_most_players" multiple="multiple" style="flex: 1;">
                    <!-- Options will be populated dynamically -->
                </select>
                <button class="btn btn-danger remove-rule-btn">Remove</button>
            </div>
        `;

        container.appendChild(ruleDiv);
        initializeTooltips(ruleDiv);

        // Populate player options
        const selectElement = ruleDiv.querySelector(
            `select[name="at_most_players"]`
        );
        players.forEach((player) => {
            const option = document.createElement("option");
            option.value = player.Name;
            option.text = player.Name;
            selectElement.appendChild(option);
        });

        // Initialize Select2
        $(selectElement).select2({
            placeholder: "Select players",
            width: "resolve",
            allowClear: true,
        });

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
                ${createTooltipIcon("Define stacking rules with key positions")}
            </div>
            
            <div class="d-flex align-items-start gap-4 flex-wrap">
                <div class="form-group" style="min-width: 120px;">
                    <label>Key Position</label>
                    <select class="form-control" name="pair_key">
                        <option value="QB">QB</option>
                    </select>
                </div>
                
                <div class="form-group" style="flex: 0 1 auto;">
                    <label>Positions to Pair</label>
                    <div class="position-checkboxes">
                        <!-- Checkbox options -->
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
                    <!-- Reduced width to save space -->
                    <label>Count</label>
                    <input type="number" class="form-control" name="pair_count" value="1" min="1">
                </div>
                
                <div class="form-group" style="min-width: 130px;">
                    <!-- Reduced min-width -->
                    <label>Type</label>
                    <select class="form-control" name="pair_type">
                        <option value="same-team">Same Team</option>
                        <option value="opp-team">Opposing Team</option>
                        <option value="same-game">Same Game</option>
                    </select>
                </div>
                
                <div class="form-group" style="min-width: 150px;">
                    <!-- Adjusted min-width -->
                    <label>Exclude Teams</label>
                    <div class="team-tags-system">
                        <div class="team-tags-input">
                            <input type="text" class="form-control" placeholder="Enter team code">
                            <button class="btn btn-primary btn-sm add-team-btn">Add</button>
                        </div>
                        <div class="team-tags-container">
                            <!-- Team tags will be added here dynamically -->
                        </div>
                    </div>
                </div>
                
                <div class="form-group" style="align-self: center;">
                    <button class="btn btn-danger remove-rule-btn">Remove</button>
                </div>
            </div>
        `;

        // Add team tags functionality
        const addTeamBtn = ruleDiv.querySelector(".add-team-btn");
        const teamInput = ruleDiv.querySelector(".team-tags-input input");
        const tagsContainer = ruleDiv.querySelector(".team-tags-container");

        addTeamBtn.addEventListener("click", () => {
            const teamCode = teamInput.value.trim().toUpperCase();
            if (teamCode) {
                addTeamTag(tagsContainer, teamCode);
                teamInput.value = "";
            }
        });

        // Add remove rule functionality
        ruleDiv
            .querySelector(".remove-rule-btn")
            .addEventListener("click", () => {
                ruleDiv.remove();
                updatePairRuleLabels();
            });

        container.appendChild(ruleDiv);
        initializeTooltips(ruleDiv);
    }

    function addTeamTag(container, teamCode) {
        const tag = document.createElement("div");
        tag.classList.add("team-tag");
        tag.innerHTML = `
            <span>${teamCode}</span>
            <button type="button" class="team-tag-remove" aria-label="Remove team">&times;</button>
        `;

        tag.querySelector(".team-tag-remove").addEventListener("click", () => {
            tag.remove();
        });

        container.appendChild(tag);
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
                ${createTooltipIcon("Limit positions in certain contexts")}
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
                    <button class="btn btn-danger remove-rule-btn">Remove</button>
                </div>
            </div>
        `;

        container.appendChild(ruleDiv);
        initializeTooltips(ruleDiv);

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
                ${createTooltipIcon("Limit players from specific teams")}
            </div>
            <div class="input-group">
                <span class="input-group-text">Team</span>
                <input type="text" class="form-control" name="team_name" placeholder="Team Code" style="max-width: 100px;">
                <span class="input-group-text">Limit</span>
                <input type="number" class="form-control" name="team_limit" value="1" min="1" style="max-width: 80px;">
                <button class="btn btn-danger remove-team-limit-btn">Remove</button>
            </div>
        `;

        container.appendChild(limitDiv);
        initializeTooltips(limitDiv);

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
                ${createTooltipIcon("Limit players from specific matchups")}
            </div>
            <div class="input-group">
                <span class="input-group-text">Matchup</span>
                <input type="text" class="form-control" name="matchup_name" placeholder="Matchup (e.g., DEN@NYG)">
                <span class="input-group-text">Limit</span>
                <input type="number" class="form-control" name="matchup_limit" value="1" min="1" style="max-width: 80px;">
                <button class="btn btn-danger remove-matchup-limit-btn">Remove</button>
            </div>
        `;

        container.appendChild(limitDiv);
        initializeTooltips(limitDiv);

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
                ${createTooltipIcon("Require minimum players from matchups")}
            </div>
            <div class="input-group">
                <span class="input-group-text">Matchup</span>
                <input type="text" class="form-control" name="matchup_at_least_name" placeholder="Matchup (e.g., BUF@NYJ)">
                <span class="input-group-text">At Least</span>
                <input type="number" class="form-control" name="matchup_at_least_count" value="1" min="1" style="max-width: 80px;">
                <button class="btn btn-danger remove-matchup-at-least-btn">Remove</button>
            </div>
        `;

        container.appendChild(atLeastDiv);
        initializeTooltips(atLeastDiv);

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

    // Initialize Custom Correlations
    function initializeCustomCorrelations() {
        document
            .getElementById("addCustomCorrelation")
            .addEventListener("click", function () {
                addCustomCorrelation();
                updateCustomCorrelationLabels();
            });
    }

    function addCustomCorrelation() {
        const container = document.getElementById(
            "customCorrelationsContainer"
        );
        const correlationDiv = document.createElement("div");
        correlationDiv.classList.add("mb-3", "custom-correlation");

        correlationDiv.innerHTML = `
            <div class="form-label-wrapper d-flex align-items-center">
                <label class="me-2"></label>
                ${createTooltipIcon("Define custom correlations for players")}
            </div>
            <div class="row">
                <div class="col-md-4">
                    <label>Player</label>
                    <select class="form-control select2" name="correlation_player">
                        <!-- Player options will be populated dynamically -->
                    </select>
                </div>
                <div class="col-md-6">
                    <label>Correlations</label>
                    <div class="correlation-positions">
                        <!-- Positions and correlation inputs -->
                        <div class="input-group mb-1">
                            <span class="input-group-text">Position</span>
                            <select class="form-control" name="correlation_position">
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
                            <span class="input-group-text">Correlation ${createTooltipIcon(
                                "Set custom correlation values between -1 and 1. Positive values increase likelihood of players appearing together, negative values decrease it. Values closer to -1 or 1 have stronger effects."
                            )}</span>
                            <input type="number" class="form-control" name="correlation_value" placeholder="e.g., 0.5" step="0.01" min="-1" max="1">
                            <button class="btn btn-danger remove-correlation-position-btn">Remove</button>
                        </div>
                    </div>
                    <button class="btn btn-sm btn-secondary add-correlation-position-btn">Add Correlation</button>
                </div>
                <div class="col-md-2 d-flex align-items-center">
                    <button class="btn btn-danger remove-custom-correlation-btn">Remove</button>
                </div>
            </div>
            <hr>
        `;

        container.appendChild(correlationDiv);
        initializeTooltips(correlationDiv);

        // Populate player options
        const playerSelect = correlationDiv.querySelector(
            `select[name="correlation_player"]`
        );
        players.forEach((player) => {
            const option = document.createElement("option");
            option.value = player.Name;
            option.text = player.Name;
            playerSelect.appendChild(option);
        });

        // Initialize Select2 for player selection
        $(playerSelect).select2({
            placeholder: "Select player",
            width: "resolve",
            allowClear: true,
        });

        // Event listener to add correlation positions
        correlationDiv
            .querySelector(".add-correlation-position-btn")
            .addEventListener("click", function () {
                addCorrelationPosition(correlationDiv);
            });

        // Event listener to remove the entire custom correlation
        correlationDiv
            .querySelector(".remove-custom-correlation-btn")
            .addEventListener("click", function () {
                correlationDiv.remove();
                updateCustomCorrelationLabels();
            });

        setTimeout(() => {
            updateCustomCorrelationLabels();
        }, 0);
    }

    function updateCustomCorrelationLabels() {
        const customCorrelations = document.querySelectorAll(
            "#customCorrelationsContainer .custom-correlation"
        );
        customCorrelations.forEach((correlationDiv, index) => {
            const label = correlationDiv.querySelector(
                ".form-label-wrapper label"
            );
            label.textContent = `Custom Correlation ${index + 1}`;
        });
    }

    function addCorrelationPosition(correlationDiv) {
        const positionsContainer = correlationDiv.querySelector(
            ".correlation-positions"
        );
        const positionDiv = document.createElement("div");
        positionDiv.classList.add("input-group", "mb-1");

        positionDiv.innerHTML = `
            <span class="input-group-text">Position</span>
            <select class="form-control" name="correlation_position">
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
            <span class="input-group-text">Correlation${createTooltipIcon(
                "Set custom correlation values between -1 and 1. Positive values increase likelihood of players appearing together, negative values decrease it. Values closer to -1 or 1 have stronger effects."
            )}</span>
            <input type="number" class="form-control" name="correlation_value" placeholder="e.g., 0.5" step="0.01" min="-1" max="1">
            <button class="btn btn-danger remove-correlation-position-btn">Remove</button>
        `;

        positionsContainer.appendChild(positionDiv);
        initializeTooltips(positionDiv);

        // Remove correlation position event
        positionDiv
            .querySelector(".remove-correlation-position-btn")
            .addEventListener("click", function () {
                positionDiv.remove();
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
                custom_correlations: {},
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

            // Collect Custom Correlations
            const customCorrelations = document.querySelectorAll(
                "#customCorrelationsContainer .custom-correlation"
            );
            customCorrelations.forEach((correlationDiv) => {
                const playerName = correlationDiv.querySelector(
                    `select[name="correlation_player"]`
                ).value;
                const correlationPositions = correlationDiv.querySelectorAll(
                    ".correlation-positions .input-group"
                );

                if (playerName) {
                    const correlations = {};
                    correlationPositions.forEach((positionDiv) => {
                        const position = positionDiv.querySelector(
                            `select[name="correlation_position"]`
                        ).value;
                        const value = parseFloat(
                            positionDiv.querySelector(
                                `input[name="correlation_value"]`
                            ).value
                        );
                        if (position && !isNaN(value)) {
                            correlations[position] = value;
                        }
                    });
                    if (Object.keys(correlations).length > 0) {
                        config.custom_correlations[playerName] = correlations;
                    }
                }
            });

            // Now proceed to send config to backend

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

    // Initialize tooltips on the entire document (again, in case of dynamic content)
    initializeTooltips(document.body);

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
});
