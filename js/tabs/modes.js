// ============================================================
// GAME MODES TAB — HIJACK VERSION
// OVERALL AVG + AVG VS OPPONENT
// ONLINE / LAN / ONLINE+LAN DATA SOURCE
// MAP 1-3 AVG
// ============================================================

function buildModeTabs(teams, modeMaps) {

    const ACTIVE_TEAMS = Object.keys(teams).filter(t => teams[t].active);
    const root = document.getElementById("tab-modes");

    // ============================================================
    // HTML
    // ============================================================

    root.innerHTML = `
    <div class="modes-container">

        <h2 class="bp-title">AVG STATS</h2>

        <div class="gm-view-toggle top-view-toggle">
            <button id="gm-view-overall" class="gm-view-btn active">
                Overall Avg
            </button>

            <button id="gm-view-vs" class="gm-view-btn">
                Avg vs Opponent
            </button>

            <button id="gm-view-map13" class="gm-view-btn">
                Map 1 - 3 AVG
            </button>
        </div>

        <div class="gm-view-toggle data-view-toggle">
            <button id="gm-data-online" class="gm-view-btn">
                Online
            </button>

            <button id="gm-data-lan" class="gm-view-btn">
                LAN
            </button>

            <button id="gm-data-both" class="gm-view-btn active">
                Online + LAN
            </button>
        </div>

        <div id="mode-map-wrapper">

            <label class="bp-label">Game Mode:</label>

            <div class="bp-mode-toggle" id="mode-toggle-container">
                <button id="gm-hp" class="bp-toggle-btn active">
                    Hardpoint
                </button>

                <button id="gm-snd" class="bp-toggle-btn">
                    Search & Destroy
                </button>

                <button id="gm-hijack" class="bp-toggle-btn">
                    Hijack
                </button>
            </div>

            <label class="bp-label">Maps:</label>

            <div id="gm-map-grid" class="gm-map-grid"></div>

        </div>

        <div id="team-toggle-wrapper" class="team-toggle-wrapper"></div>

        <div id="vs-row" class="hidden vs-flex-row">

            <div class="vs-col">
                <label class="bp-label">Team</label>
                <select id="team-select-vs"
                        class="team-vs-dropdown"></select>
            </div>

            <div class="vs-col">
                <label class="bp-label">Opponent</label>
                <select id="opponent-select"
                        class="team-vs-dropdown"></select>
            </div>

        </div>

        <div id="map13-container" class="hidden"></div>

        <button id="gm-run-vs" class="bp-run-btn hidden">
            RUN
        </button>

        <div id="gm-results"></div>

    </div>
    `;

    // ============================================================
    // STATE
    // ============================================================

    let GM_MODE = "hp";
    let GM_MAP = null;
    let GM_TEAM = null;

    let GM_VIEW = "overall";
    let GM_DATA_VIEW = "both";

    let ONLINE_MATCHES = [];
    let LAN_MATCHES = [];

    let MAP13 = {
        hp: null,
        snd: null,
        hijack: null,
        team: null
    };

    // ============================================================
    // REFERENCES
    // ============================================================

    const results =
        document.getElementById("gm-results");

    const mapGrid =
        document.getElementById("gm-map-grid");

    const teamWrapper =
        document.getElementById("team-toggle-wrapper");

    const vsRow =
        document.getElementById("vs-row");

    const teamSelectVS =
        document.getElementById("team-select-vs");

    const oppSelect =
        document.getElementById("opponent-select");

    const runVSBtn =
        document.getElementById("gm-run-vs");

    const map13Container =
        document.getElementById("map13-container");

    // ============================================================
    // LOAD MATCH DATA
    // ============================================================

    async function loadMatchDataSources() {

        try {

            const matchesRes = await fetch("json/matches.json");

            if (!matchesRes.ok) {
                throw new Error("Could not load json/matches.json");
            }

            const allMatches = await matchesRes.json();

            ONLINE_MATCHES = allMatches.filter(m =>
                (m.matchType || "").toLowerCase() === "online"
            );

            LAN_MATCHES = allMatches.filter(m =>
                (m.matchType || "").toLowerCase() === "lan"
            );

            applyDataFilter();

        } catch (error) {

            console.error("Error loading match data:", error);

            ONLINE_MATCHES = [];
            LAN_MATCHES = [];

            window.matchData = [];

            results.innerHTML = `
                <p>Could not load match data.</p>
            `;
        }
    }

    // ============================================================
    // APPLY ONLINE / LAN FILTER
    // ============================================================

    function applyDataFilter() {

        if (GM_DATA_VIEW === "lan") {

            window.matchData = [...LAN_MATCHES];

        } else if (GM_DATA_VIEW === "both") {

            window.matchData = [
                ...ONLINE_MATCHES,
                ...LAN_MATCHES
            ];

        } else {

            window.matchData = [...ONLINE_MATCHES];

        }
    }

    // ============================================================
    // DATA SOURCE TOGGLES
    // ============================================================

    const dataBtns = {
        online: document.getElementById("gm-data-online"),
        lan: document.getElementById("gm-data-lan"),
        both: document.getElementById("gm-data-both")
    };

    function setGMDataView(view) {

        GM_DATA_VIEW = view;

        Object.values(dataBtns).forEach(btn =>
            btn.classList.remove("active")
        );

        dataBtns[view].classList.add("active");

        applyDataFilter();

        GM_TEAM = null;
        GM_MAP = null;

        teamSelectVS.innerHTML = "";
        oppSelect.innerHTML = "";

        document.querySelectorAll(".gm-map-card").forEach(card => {
            card.classList.remove("active");
        });

        document.querySelectorAll(".team-toggle-btn").forEach(btn => {
            btn.classList.remove("active");
            btn.style.setProperty("--teamGlow", "transparent");
        });

        MAP13 = {
            hp: null,
            snd: null,
            hijack: null,
            team: null
        };

        results.innerHTML = `<p>Select a team and map.</p>`;

        if (GM_VIEW === "vsOpp") {
            loadTeamDropdownVS();
        }
    }

    dataBtns.online.onclick = () => setGMDataView("online");
    dataBtns.lan.onclick = () => setGMDataView("lan");
    dataBtns.both.onclick = () => setGMDataView("both");

    // ============================================================
    // GAME MODE BUTTONS — HIJACK REPLACES OVERLOAD
    // ============================================================

    const modeButtons = {
        hp: document.getElementById("gm-hp"),
        snd: document.getElementById("gm-snd"),
        hijack: document.getElementById("gm-hijack")
    };

    function setGMMode(mode) {

        if (!modeMaps[mode]) {
            console.error("Unknown game mode:", mode);
            return;
        }

        GM_MODE = mode;

        Object.values(modeButtons).forEach(btn =>
            btn.classList.remove("active")
        );

        modeButtons[mode].classList.add("active");

        GM_TEAM = null;
        GM_MAP = null;

        document.querySelectorAll(".gm-map-card").forEach(card => {
            card.classList.remove("active");
        });

        document.querySelectorAll(".team-toggle-btn").forEach(btn => {
            btn.classList.remove("active");
            btn.style.setProperty("--teamGlow", "transparent");
        });

        results.innerHTML = `<p>Select a team and map.</p>`;

        loadMapGrid();
    }

    modeButtons.hp.onclick =
        () => setGMMode("hp");

    modeButtons.snd.onclick =
        () => setGMMode("snd");

    modeButtons.hijack.onclick =
        () => setGMMode("hijack");

    // ============================================================
    // MAP GRID
    // ============================================================

    function loadMapGrid() {

        mapGrid.innerHTML = "";

        const maps = modeMaps[GM_MODE] || [];

        maps.forEach(map => {

            const cleanMap = map
                .trim()
                .replace(/\s+/g, "")
                .replace(/[^a-zA-Z0-9]/g, "")
                .toLowerCase();

            const card = document.createElement("div");

            card.className = "gm-map-card";

            card.innerHTML = `
                <img class="gm-map-thumb"
                     src="maps/${cleanMap}.webp"
                     onerror="this.onerror=null;this.src='maps/${cleanMap}.png'">

                <div class="gm-map-name">${map}</div>
            `;

            card.onclick = () => {

                GM_MAP = map;

                document.querySelectorAll(".gm-map-card").forEach(c =>
                    c.classList.remove("active")
                );

                card.classList.add("active");

                if (GM_VIEW === "vsOpp") {
                    loadOpponentDropdown();
                }

                if (GM_TEAM && GM_MAP) {
                    renderModeMap();
                }
            };

            mapGrid.appendChild(card);
        });
    }

    // ============================================================
    // INITIALIZE
    // ============================================================

    loadMapGrid();
        // ============================================================
    // TEAM BUTTON GRID
    // ============================================================

    function loadTeamButtons() {

        teamWrapper.innerHTML = "";

        ACTIVE_TEAMS.forEach(team => {

            const btn = document.createElement("div");

            btn.className = "team-toggle-btn";

            btn.innerHTML = `
                <img src="logos/${team}.webp"
                     onerror="this.onerror=null;this.src='logos/${team}.png'">

                <div>${teams[team].name}</div>
            `;

            btn.onclick = () => {

                GM_TEAM = team;

                document.querySelectorAll(".team-toggle-btn").forEach(b => {
                    b.classList.remove("active");
                    b.style.setProperty("--teamGlow", "transparent");
                });

                btn.classList.add("active");

                btn.style.setProperty(
                    "--teamGlow",
                    glowColors[team] || "#ffffff"
                );

                if (GM_VIEW === "vsOpp") {

                    teamSelectVS.value = team;

                    if (GM_MAP) {
                        loadOpponentDropdown();
                        renderModeMap();
                    }

                } else if (GM_MAP) {

                    renderModeMap();

                }
            };

            teamWrapper.appendChild(btn);
        });
    }

    loadTeamButtons();

    // ============================================================
    // VIEW TOGGLES
    // ============================================================

    const viewBtns = {
        overall: document.getElementById("gm-view-overall"),
        vsOpp: document.getElementById("gm-view-vs"),
        map13: document.getElementById("gm-view-map13")
    };

    function setGMView(view) {

        GM_VIEW = view;

        Object.values(viewBtns).forEach(btn =>
            btn.classList.remove("active")
        );

        viewBtns[view].classList.add("active");

        GM_TEAM = null;
        GM_MAP = null;

        runVSBtn.classList.add("hidden");

        results.innerHTML = "";

        document.querySelectorAll(".gm-map-card").forEach(card => {
            card.classList.remove("active");
        });

        document.querySelectorAll(".team-toggle-btn").forEach(btn => {
            btn.classList.remove("active");
            btn.style.setProperty("--teamGlow", "transparent");
        });

        if (view === "overall") {

            document
                .getElementById("mode-map-wrapper")
                .classList.remove("hidden");

            teamWrapper.classList.remove("hidden");
            vsRow.classList.add("hidden");
            map13Container.classList.add("hidden");

        } else if (view === "vsOpp") {

            document
                .getElementById("mode-map-wrapper")
                .classList.remove("hidden");

            teamWrapper.classList.add("hidden");
            vsRow.classList.remove("hidden");
            map13Container.classList.add("hidden");

            loadTeamDropdownVS();

        } else if (view === "map13") {

            document
                .getElementById("mode-map-wrapper")
                .classList.add("hidden");

            teamWrapper.classList.add("hidden");
            vsRow.classList.add("hidden");
            map13Container.classList.remove("hidden");

            buildMap13UI();
        }
    }

    viewBtns.overall.onclick =
        () => setGMView("overall");

    viewBtns.vsOpp.onclick =
        () => setGMView("vsOpp");

    viewBtns.map13.onclick =
        () => setGMView("map13");

    // ============================================================
    // TEAM DROPDOWN — VS OPPONENT
    // ============================================================

    function loadTeamDropdownVS() {

        teamSelectVS.innerHTML = "";

        ACTIVE_TEAMS.forEach(team => {

            const option = document.createElement("option");

            option.value = team;
            option.textContent = teams[team].name;

            teamSelectVS.appendChild(option);
        });

        if (!ACTIVE_TEAMS.length) {
            oppSelect.innerHTML = "";
            results.innerHTML = "<p>No active teams found.</p>";
            return;
        }

        if (!GM_TEAM || !ACTIVE_TEAMS.includes(GM_TEAM)) {
            GM_TEAM = ACTIVE_TEAMS[0];
        }

        teamSelectVS.value = GM_TEAM;

        teamSelectVS.onchange = () => {

            GM_TEAM = teamSelectVS.value;

            if (GM_MAP) {

                loadOpponentDropdown();
                renderModeMap();

            } else {

                oppSelect.innerHTML = "";

                results.innerHTML =
                    "<p>Select a map to see vs stats.</p>";
            }
        };

        if (GM_MAP) {
            loadOpponentDropdown();
        }
    }

    // ============================================================
    // OPPONENT DROPDOWN
    // ============================================================

    function loadOpponentDropdown() {

        oppSelect.innerHTML = "";

        if (!GM_TEAM || !GM_MAP) {
            return;
        }

        const opponents = new Map();

        (window.matchData || []).forEach(match => {

            if (
                norm(match.team) === norm(GM_TEAM) &&
                norm(match.mode) === norm(GM_MODE) &&
                norm(match.map) === norm(GM_MAP)
            ) {

                const opponent = norm(match.opponent);

                if (opponent) {
                    opponents.set(opponent, cap(opponent));
                }
            }
        });

        if (!opponents.size) {

            const option = document.createElement("option");

            option.value = "";
            option.textContent = "— No Opponents —";

            oppSelect.appendChild(option);

            results.innerHTML = `
                <p>No opponents found for ${teams[GM_TEAM].name}
                on ${GM_MAP} (${modeNames[GM_MODE]}).</p>
            `;

            return;
        }

        [...opponents.entries()]
            .sort((a, b) => a[1].localeCompare(b[1]))
            .forEach(([value, label]) => {

                const option = document.createElement("option");

                option.value = value;
                option.textContent = label;

                oppSelect.appendChild(option);
            });

        oppSelect.selectedIndex = 0;

        oppSelect.onchange = () => {
            renderModeMap();
        };
    }

    // ============================================================
    // RUN BUTTON — VS OPPONENT
    // ============================================================

    runVSBtn.onclick = () => {
        renderModeMap();
    };

    // ============================================================
    // MAIN STATS TABLE
    // ============================================================

    function renderModeMap() {

        if (!GM_TEAM || !GM_MAP) {
            return;
        }

        const team = GM_TEAM;
        const map = GM_MAP;
        const mode = GM_MODE;

        const glow = glowColors[team] || "#ffffff";

        let filteredMatches = (window.matchData || []).filter(match =>
            norm(match.team) === norm(team) &&
            norm(match.mode) === norm(mode) &&
            norm(match.map) === norm(map)
        );

        // ========================================================
        // VS OPPONENT FILTER
        // ========================================================

        if (GM_VIEW === "vsOpp" && oppSelect.value) {

            filteredMatches = filteredMatches.filter(match =>
                norm(match.opponent) === norm(oppSelect.value)
            );
        }

        // ========================================================
        // REMOVE DUPLICATE MATCHES
        // Each matchID represents one match per team/player row.
        // ========================================================

        const matchMap = new Map();

        filteredMatches.forEach(match => {

            if (!matchMap.has(match.matchID)) {
                matchMap.set(match.matchID, match);
            }
        });

        const matches = [...matchMap.values()];

        // ========================================================
        // NO DATA
        // ========================================================

        if (!matches.length) {

            results.innerHTML = `
                <p>
                    No matches found for
                    ${teams[team].name} —
                    ${map}
                    (${modeNames[mode] || mode})
                </p>
            `;

            return;
        }

        // ========================================================
        // TEAM STATS
        // ========================================================

        const totalMatches = matches.length;

        const wins = matches.filter(match =>
            match.teamScore > match.oppScore
        ).length;

        const losses = matches.filter(match =>
            match.teamScore < match.oppScore
        ).length;

        // ========================================================
        // AVERAGE MATCH LENGTH
        // Hijack uses durationSec in matches.json.
        // SND uses duration (round count).
        // ========================================================

        let avgLength = "0";

        if (mode === "hp" || mode === "hijack") {

            const totalSec = matches.reduce(
                (sum, match) =>
                    sum + (Number(match.durationSec) || 0),
                0
            );

            avgLength = totalMatches
                ? Math.round(totalSec / totalMatches) + " sec"
                : "0 sec";

        } else if (mode === "snd") {

            const totalRounds = matches.reduce(
                (sum, match) =>
                    sum + (Number(match.duration) || 0),
                0
            );

            avgLength = totalMatches
                ? (totalRounds / totalMatches).toFixed(1) + " rounds"
                : "0 rounds";
        }

        // ========================================================
        // RENDER RESULTS
        // ========================================================

        results.innerHTML = `
            <h3 class="mapHeader">
                ${teams[team].name} —
                ${map}
                (${modeNames[mode] || mode})
            </h3>

            <div class="teamBox" style="--glow:${glow}">

                <img src="./logos/${team}.webp"
                     onerror="this.onerror=null;this.src='./logos/${team}.png'">

                <div class="teamTitle">
                    ${teams[team].name}
                </div>

                <div class="team-player-wrapper">
                    ${renderPlayerTable(
                        team,
                        mode,
                        map,
                        GM_VIEW === "vsOpp" ? oppSelect.value : null
                    )}
                </div>

                <div class="team-footer-stats">

                    <div>Total Matches: ${totalMatches}</div>

                    <div>W / L: ${wins} - ${losses}</div>

                    <div>
                        ${mode === "snd" ? "Avg Rounds: " : "Avg Length: "}
                        ${avgLength}
                    </div>

                </div>
            </div>
        `;
    }
        // ============================================================
    // PLAYER TABLE
    // ============================================================

    function renderPlayerTable(team, mode, map = null, opponent = null) {

        let html = `
            <table class="playerTable">
                <tr>
                    <th>Player</th>
                    <th>Matches</th>
                    <th>Avg Kills</th>
                    <th>Avg Deaths</th>
                    <th>Avg K/D</th>
                    <th>Avg Damage</th>
                    ${mode === "snd" ? "<th>Avg First Blood</th>" : ""}
                </tr>
        `;

        teams[team].players.forEach(player => {

            let filtered = (window.matchData || []).filter(match =>
                norm(match.team) === norm(team) &&
                norm(match.mode) === norm(mode) &&
                (map ? norm(match.map) === norm(map) : true) &&
                norm(match.player) === norm(player) &&
                (opponent
                    ? norm(match.opponent) === norm(opponent)
                    : true)
            );

            if (!filtered.length) {
                return;
            }

            // Count each match once for this player's row.
            const uniqueMatches = new Set(
                filtered.map(match => match.matchID)
            );

            const totalKills = filtered.reduce(
                (sum, match) => sum + (Number(match.kills) || 0),
                0
            );

            const totalDeaths = filtered.reduce(
                (sum, match) => sum + (Number(match.deaths) || 0),
                0
            );

            const totalDamage = filtered.reduce(
                (sum, match) => sum + (Number(match.damage) || 0),
                0
            );

            const totalFB = filtered.reduce(
                (sum, match) =>
                    sum + (Number(match.firstBloods) || 0),
                0
            );

            const avgKills =
                totalKills / filtered.length;

            const avgDeaths =
                totalDeaths / filtered.length;

            const avgKD =
                totalDeaths > 0
                    ? totalKills / totalDeaths
                    : 0;

            const avgDamage =
                totalDamage / filtered.length;

            const avgFirstBloods =
                totalFB / filtered.length;

            html += `
                <tr>
                    <td>${cap(player)}</td>

                    <td>${uniqueMatches.size}</td>

                    <td>${avgKills.toFixed(1)}</td>

                    <td>${avgDeaths.toFixed(1)}</td>

                    <td>${avgKD.toFixed(2)}</td>

                    <td>${avgDamage.toFixed(1)}</td>

                    ${
                        mode === "snd"
                            ? `<td>${avgFirstBloods.toFixed(2)}</td>`
                            : ""
                    }
                </tr>
            `;
        });

        html += `</table>`;

        return html;
    }

    // ============================================================
    // MAP 1-3 UI
    // HARDPOINT / SND / HIJACK
    // ============================================================

    function buildMap13UI() {

        const map13Wrap = map13Container;

        map13Wrap.innerHTML = "";

        // Reset selections whenever the interface is rebuilt.
        MAP13.hp = null;
        MAP13.snd = null;
        MAP13.hijack = null;

        const modes = [
            {
                key: "hp",
                label: "Hardpoint",
                limit: 5
            },
            {
                key: "snd",
                label: "Search & Destroy",
                limit: 5
            },
            {
                key: "hijack",
                label: "Hijack",
                limit: 3
            }
        ];

        const MAP13_SELECTED = {
            hp: false,
            snd: false,
            hijack: false
        };

        // ========================================================
        // CREATE MAP GRIDS
        // ========================================================

        modes.forEach(({ key, label }) => {

            const row = document.createElement("div");

            row.className = "map13-mode-row";

            row.innerHTML = `
                <label class="bp-label">${label}</label>
            `;

            const grid = document.createElement("div");

            grid.className = "gm-map-grid";

            const maps = modeMaps[key] || [];

            maps.forEach(map => {

                const cleanMap = map
                    .trim()
                    .replace(/\s+/g, "")
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toLowerCase();

                const btn = document.createElement("div");

                btn.className = "gm-map-card";

                btn.innerHTML = `
                    <img class="gm-map-thumb"
                         src="maps/${cleanMap}.webp"
                         onerror="this.onerror=null;this.src='maps/${cleanMap}.png'">

                    <div class="gm-map-name">${map}</div>
                `;

                btn.onclick = () => {

                    MAP13[key] = map;

                    MAP13_SELECTED[key] = true;

                    // Only one selected map per game mode.
                    [...grid.children].forEach(card =>
                        card.classList.remove("active")
                    );

                    btn.classList.add("active");

                    const runBtn =
                        map13Wrap.querySelector("#map13-run");

                    const allSelected =
                        Object.values(MAP13_SELECTED).every(Boolean);

                    runBtn.disabled = !allSelected;
                };

                grid.appendChild(btn);
            });

            row.appendChild(grid);

            map13Wrap.appendChild(row);
        });

        // ========================================================
        // TEAM SELECTOR AND RUN BUTTON
        // ========================================================

        const teamRow = document.createElement("div");

        teamRow.className = "map13-team-row";

        teamRow.innerHTML = `
            <label class="bp-label">Team</label>

            <select id="map13-team"
                    class="team-vs-dropdown"></select>

            <button id="map13-run"
                    class="bp-run-btn"
                    disabled>
                RUN
            </button>

            <div style="color:red; margin-top:8px; font-size:0.9em;">
                Select one map per game mode to see stats.
            </div>
        `;

        map13Wrap.appendChild(teamRow);

        const teamDD =
            map13Wrap.querySelector("#map13-team");

        ACTIVE_TEAMS.forEach(team => {

            const option = document.createElement("option");

            option.value = team;
            option.textContent = teams[team].name;

            teamDD.appendChild(option);
        });

        MAP13.team = teamDD.options[0]?.value || null;

        teamDD.value = MAP13.team || "";

        teamDD.onchange = () => {
            MAP13.team = teamDD.value;
        };

        map13Wrap.querySelector("#map13-run").onclick =
            renderMap13;
    }
        // ============================================================
    // RENDER MAP 1-3 AVERAGES
    // HARDPOINT / SND / HIJACK
    // ============================================================

    function renderMap13() {

        if (!MAP13.team) {
            return;
        }

        const team = MAP13.team;

        const players = teams[team].players;

        const modes = ["hp", "snd", "hijack"];

        const modeLabels = {
            hp: "Hardpoint",
            snd: "Search & Destroy",
            hijack: "Hijack"
        };

        // ========================================================
        // VALIDATE MAP SELECTIONS
        // ========================================================

        const missingSelections = modes.filter(mode =>
            !MAP13[mode]
        );

        if (missingSelections.length) {

            results.innerHTML = `
                <p>Please select one map for each game mode.</p>
            `;

            return;
        }

        // ========================================================
        // HEADER
        // ========================================================

        let html = `
            <div class="map13-team-header"
                 style="text-align:center; margin-top:20px; margin-bottom:20px;">

                <img src="./logos/${team}.webp"
                     onerror="this.onerror=null;this.src='./logos/${team}.png'"
                     style="width:100px; height:auto; margin-bottom:10px;">

                <div style="font-weight:bold; font-size:1.2em;">
                    ${teams[team].name}
                </div>

                <div style="margin-top:8px;">
                    Hardpoint: ${MAP13.hp}
                    |
                    SND: ${MAP13.snd}
                    |
                    Hijack: ${MAP13.hijack}
                </div>

            </div>

            <table class="playerTable map13Table">

                <tr>
                    <th>Player</th>
                    <th>1-3 Avg Kills</th>
                    <th>1-3 Avg Deaths</th>
                    <th>1-3 Avg K/D</th>
                    <th>1-3 Avg Damage</th>
                    <th>Missing</th>
                </tr>
        `;

        // ========================================================
        // PLAYER AVERAGES
        // ========================================================

        players.forEach(player => {

            let sumAvgKills = 0;
            let sumAvgDeaths = 0;
            let sumAvgDamage = 0;

            const missingModes = [];

            modes.forEach(mode => {

                const selectedMap = MAP13[mode];

                let filtered = (window.matchData || []).filter(match =>
                    norm(match.team) === norm(team) &&
                    norm(match.mode) === norm(mode) &&
                    norm(match.map) === norm(selectedMap) &&
                    norm(match.player) === norm(player)
                );

                // =================================================
                // NO DATA FOR THIS MODE
                // =================================================

                if (!filtered.length) {

                    missingModes.push(modeLabels[mode]);

                    return;
                }

                // =================================================
                // REMOVE DUPLICATE MATCH ROWS
                // =================================================

                const uniqueMatches = new Map();

                filtered.forEach(match => {

                    if (!uniqueMatches.has(match.matchID)) {
                        uniqueMatches.set(match.matchID, match);
                    }
                });

                filtered = [...uniqueMatches.values()];

                // =================================================
                // CALCULATE MODE AVERAGES
                // =================================================

                const totalKills = filtered.reduce(
                    (sum, match) =>
                        sum + (Number(match.kills) || 0),
                    0
                );

                const totalDeaths = filtered.reduce(
                    (sum, match) =>
                        sum + (Number(match.deaths) || 0),
                    0
                );

                const totalDamage = filtered.reduce(
                    (sum, match) =>
                        sum + (Number(match.damage) || 0),
                    0
                );

                const avgKills =
                    totalKills / filtered.length;

                const avgDeaths =
                    totalDeaths / filtered.length;

                const avgDamage =
                    totalDamage / filtered.length;

                // Add the average from each selected mode.
                sumAvgKills += avgKills;
                sumAvgDeaths += avgDeaths;
                sumAvgDamage += avgDamage;
            });

            // ====================================================
            // COMBINED K/D
            // ====================================================

            const kd = sumAvgDeaths > 0
                ? sumAvgKills / sumAvgDeaths
                : 0;

            // ====================================================
            // PLAYER ROW
            // ====================================================

            html += `
                <tr>

                    <td>${cap(player)}</td>

                    <td>
                        ${sumAvgKills > 0
                            ? sumAvgKills.toFixed(1)
                            : "0.0"}
                    </td>

                    <td>
                        ${sumAvgDeaths > 0
                            ? sumAvgDeaths.toFixed(1)
                            : "0.0"}
                    </td>

                    <td>
                        ${kd.toFixed(2)}
                    </td>

                    <td>
                        ${sumAvgDamage > 0
                            ? sumAvgDamage.toFixed(1)
                            : "0.0"}
                    </td>

                    <td>
                        ${missingModes.length
                            ? missingModes.join(", ")
                            : "-"}
                    </td>

                </tr>
            `;
        });

        html += `
            </table>
        `;

        results.innerHTML = html;
    }

    // ============================================================
    // INITIALIZE MATCH DATA
    // ============================================================

    loadMatchDataSources();

}