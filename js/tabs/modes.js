// ============================================================
// GAME MODES TAB — MODE → MAP → TEAM ORDER
// OVERALL AVG + AVG VS OPPONENT
// ONLINE / LAN / ONLINE+LAN DATA SOURCE
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

        <!-- VIEW TOGGLES -->
        <div class="gm-view-toggle top-view-toggle">
            <button id="gm-view-overall" class="gm-view-btn active">Overall Avg</button>
            <button id="gm-view-vs" class="gm-view-btn">Avg vs Opponent</button>
            <button id="gm-view-map13" class="gm-view-btn">Map 1 - 3 AVG</button>
        </div>

        <!-- DATA SOURCE TOGGLES -->
        <div class="gm-view-toggle data-view-toggle">
            <button id="gm-data-online" class="gm-view-btn active">Online</button>
            <button id="gm-data-lan" class="gm-view-btn">LAN</button>
            <button id="gm-data-both" class="gm-view-btn">Online + LAN</button>
        </div>

        <div id="mode-map-wrapper">
            <label class="bp-label">Game Mode:</label>
            <div class="bp-mode-toggle" id="mode-toggle-container">
                <button id="gm-hp"  class="bp-toggle-btn active">Hardpoint</button>
                <button id="gm-snd" class="bp-toggle-btn">Search & Destroy</button>
                <button id="gm-over" class="bp-toggle-btn">Overload</button>
            </div>

            <label class="bp-label">Maps:</label>
            <div id="gm-map-grid" class="gm-map-grid"></div>
        </div>

        <div id="team-toggle-wrapper" class="team-toggle-wrapper"></div>

        <div id="vs-row" class="hidden vs-flex-row">
            <div class="vs-col">
                <label class="bp-label">Team</label>
                <select id="team-select-vs" class="team-vs-dropdown"></select>
            </div>

            <div class="vs-col">
                <label class="bp-label">Opponent</label>
                <select id="opponent-select" class="team-vs-dropdown"></select>
            </div>
        </div>

        <div id="map13-container" class="hidden"></div>

        <button id="gm-run-vs" class="bp-run-btn hidden">RUN</button>

        <div id="gm-results"></div>
    </div>
    `;

    // ============================================================
    // STATE
    // ============================================================

    let GM_MODE = "hp";
    let GM_MAP  = null;
    let GM_TEAM = null;
    let GM_VIEW = "overall";
    let GM_DATA_VIEW = "online";

    let ONLINE_MATCHES = [];
    let LAN_MATCHES    = [];

    let MAP13 = { hp: null, snd: null, overload: null, team: null };

    // ============================================================
    // REFERENCES
    // ============================================================

    const results        = document.getElementById("gm-results");
    const mapGrid        = document.getElementById("gm-map-grid");
    const teamWrapper    = document.getElementById("team-toggle-wrapper");
    const vsRow          = document.getElementById("vs-row");
    const teamSelectVS   = document.getElementById("team-select-vs");
    const oppSelect      = document.getElementById("opponent-select");
    const runVSBtn       = document.getElementById("gm-run-vs");
    const map13Container = document.getElementById("map13-container");

    // ============================================================
    // LOAD MATCH DATA
    // ============================================================

    async function loadMatchDataSources() {
        const onlineRes = await fetch("json/matches.json");
        const lanRes    = await fetch("json/lan.json");

        ONLINE_MATCHES = await onlineRes.json();
        LAN_MATCHES    = await lanRes.json();

        applyDataFilter();
    }

    function applyDataFilter() {

        // LAN = only LAN file
        if (GM_DATA_VIEW === "lan") {
            window.matchData = [...LAN_MATCHES];
            return;
        }
    
        // BOTH = full matches.json
        if (GM_DATA_VIEW === "both") {
            window.matchData = [...ONLINE_MATCHES];
            return;
        }
    
        // ONLINE = matches.json minus LAN matches
        if (GM_DATA_VIEW === "online") {
            const lanIDs = new Set(LAN_MATCHES.map(m => m.matchID));
            window.matchData = ONLINE_MATCHES.filter(m => !lanIDs.has(m.matchID));
            return;
        }
    }

    loadMatchDataSources();

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
        Object.values(dataBtns).forEach(b => b.classList.remove("active"));
        dataBtns[view].classList.add("active");
        applyDataFilter();
        results.innerHTML = `<p>Data source switched. Re-select map/team.</p>`;
    }

    dataBtns.online.onclick = () => setGMDataView("online");
    dataBtns.lan.onclick    = () => setGMDataView("lan");
    dataBtns.both.onclick   = () => setGMDataView("both");

    // ============================================================
    // MODE TOGGLES
    // ============================================================

    const modeButtons = {
        hp: document.getElementById("gm-hp"),
        snd: document.getElementById("gm-snd"),
        overload: document.getElementById("gm-over"),
    };

    function setGMMode(mode) {
        GM_MODE = mode;
        Object.values(modeButtons).forEach(b => b.classList.remove("active"));
        modeButtons[mode].classList.add("active");
        loadMapGrid();
        GM_MAP = null;
    }

    modeButtons.hp.onclick       = () => setGMMode("hp");
    modeButtons.snd.onclick      = () => setGMMode("snd");
    modeButtons.overload.onclick = () => setGMMode("overload");

    // ============================================================
    // MAP GRID — with VS auto-selection
    // ============================================================

    function loadMapGrid() {
        mapGrid.innerHTML = "";

        modeMaps[GM_MODE].forEach(map => {
            const cleanMap = map.replace(/\s+/g,"").toLowerCase();
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
                document.querySelectorAll(".gm-map-card").forEach(c => c.classList.remove("active"));
                card.classList.add("active");

                if (GM_VIEW === "vsOpp") {
                    GM_TEAM = ACTIVE_TEAMS[0];
                    teamSelectVS.value = GM_TEAM;
                    loadOpponentDropdown();
                    if (oppSelect.options.length > 0) oppSelect.selectedIndex = 0;
                    renderModeMap();
                } else {
                    if (GM_TEAM) renderModeMap();
                }
            };

            mapGrid.appendChild(card);
        });
    }

    loadMapGrid();

    // ============================================================
    // TEAM BUTTON GRID
    // ============================================================

    function loadTeamButtons() {
        teamWrapper.innerHTML="";
        ACTIVE_TEAMS.forEach(team=>{
            const btn=document.createElement("div");
            btn.className="team-toggle-btn";
            btn.innerHTML=`
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
                btn.style.setProperty("--teamGlow", glowColors[team] || "#ffffff");

                if (GM_MAP) renderModeMap();
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
        map13: document.getElementById("gm-view-map13"),
    };

    function setGMView(view) {
        GM_VIEW = view;
        Object.values(viewBtns).forEach(b => b.classList.remove("active"));
        viewBtns[view].classList.add("active");
    
        GM_TEAM = null;
        GM_MAP  = null;
        runVSBtn.classList.add("hidden");
    
        // Clear results on every view switch
        results.innerHTML = "";
    
        if (view === "overall") {
            document.getElementById("mode-map-wrapper").classList.remove("hidden");
            teamWrapper.classList.remove("hidden");
            vsRow.classList.add("hidden");
            map13Container.classList.add("hidden");
            results.innerHTML = "<p>Select a team and map to see stats.</p>";
        } 
        else if (view === "vsOpp") {
            document.getElementById("mode-map-wrapper").classList.remove("hidden");
            teamWrapper.classList.add("hidden");
            vsRow.classList.remove("hidden");
            map13Container.classList.add("hidden");
            loadTeamDropdownVS();
            results.innerHTML = "<p>Select a map to see vs stats.</p>";
        } 
        else if (view === "map13") {
            document.getElementById("mode-map-wrapper").classList.add("hidden");
            teamWrapper.classList.add("hidden");
            vsRow.classList.add("hidden");
            runVSBtn.classList.add("hidden");
            map13Container.classList.remove("hidden");
            buildMap13UI();
            // ensure old overall table is cleared
            results.innerHTML = "";
        }
    }

    viewBtns.overall.onclick = () => setGMView("overall");
    viewBtns.vsOpp.onclick   = () => setGMView("vsOpp");
    viewBtns.map13.onclick   = () => setGMView("map13");

    // ============================================================
    // TEAM DROPDOWN VS
    // ============================================================

    function loadTeamDropdownVS() {
        teamSelectVS.innerHTML = "";
        ACTIVE_TEAMS.forEach(team=>{
            teamSelectVS.innerHTML += `<option value="${team}">${teams[team].name}</option>`;
        });

        if (!GM_TEAM) GM_TEAM = teamSelectVS.value;

        teamSelectVS.onchange = () => {
            GM_TEAM = teamSelectVS.value;
            if (GM_MAP) {
                loadOpponentDropdown();
                renderModeMap();
            } else {
                oppSelect.innerHTML = "";
                results.innerHTML = "<p>Select a map to see vs stats.</p>";
            }
        };
    }

    // ============================================================
    // OPPONENT DROPDOWN
    // ============================================================

    function loadOpponentDropdown() {
        oppSelect.innerHTML = "";
        if (!GM_TEAM || !GM_MAP) return;

        const opps = new Set();
        window.matchData.forEach(m => {
            if (
                norm(m.team) === norm(GM_TEAM) &&
                norm(m.mode) === norm(GM_MODE) &&
                norm(m.map) === norm(GM_MAP)
            ) opps.add(norm(m.opponent));
        });

        if (!opps.size) {
            oppSelect.innerHTML = `<option value="">— No Opponents —</option>`;
            return;
        }

        [...opps].forEach(o => {
            oppSelect.innerHTML += `<option value="${o}">${cap(o)}</option>`;
        });

        oppSelect.selectedIndex = 0;
        oppSelect.onchange = () => renderModeMap();
    }

    // ============================================================
    // RUN VS BUTTON
    // ============================================================

    runVSBtn.onclick = () => renderModeMap();

    // ============================================================
    // RENDER MAIN TABLE
    // ============================================================

    function renderModeMap() {
        if (!GM_TEAM || !GM_MAP) return;

        const team = GM_TEAM;
        const map  = GM_MAP;
        const mode = GM_MODE;
        const glow = glowColors[team] ?? "#fff";

        let filteredMatches = window.matchData.filter(m =>
            norm(m.team) === norm(team) &&
            norm(m.mode) === norm(mode) &&
            (norm(m.map) === norm(map))
        );

        if (GM_VIEW === "vsOpp" && oppSelect.value) {
            filteredMatches = filteredMatches.filter(m =>
                norm(m.opponent) === norm(oppSelect.value)
            );
        }

        const matchMap = new Map();
        filteredMatches.forEach(m => {
            if (!matchMap.has(m.matchID)) matchMap.set(m.matchID, m);
        });
        const matches = [...matchMap.values()];

        if (!matches.length) {
            results.innerHTML = `<p>No matches found for ${teams[team].name} — ${map} (${modeNames[mode]})</p>`;
            return;
        }

        const totalMatches = matches.length;
        const wins = matches.filter(m => m.teamScore > m.oppScore).length;
        const losses = matches.filter(m => m.teamScore < m.oppScore).length;

        let avgLength;
        if (mode === "hp" || mode === "overload") {
            const totalSec = matches.reduce((a,b)=>a+b.durationSec,0);
            avgLength = Math.round(totalSec / totalMatches) + " sec";
        } else if (mode === "snd") {
            const totalRounds = matches.reduce((a,b)=>a+b.duration,0);
            avgLength = (totalRounds / totalMatches).toFixed(1) + " rounds";
        }

        const html = `
            <h3 class="mapHeader">${teams[team].name} — ${map} (${modeNames[mode]})</h3>

            <div class="teamBox" style="--glow:${glow}">
                <img src="./logos/${team}.webp"
                     onerror="this.onerror=null;this.src='./logos/${team}.png'">

                <div class="teamTitle">${teams[team].name}</div>

                <div class="team-player-wrapper">
                    ${renderPlayerTable(team, mode, map)}
                </div>

                <div class="team-footer-stats">
                    <div>Total Matches: ${totalMatches}</div>
                    <div>W / L: ${wins} - ${losses}</div>
                    <div>${mode === "snd" ? "Avg Rounds: " : "Avg Length: "}${avgLength}</div>
                </div>
            </div>
        `;

        results.innerHTML = html;
    }

    // ============================================================
    // PLAYER TABLE
    // ============================================================

    function renderPlayerTable(team, mode, map=null) {
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
            let filtered = window.matchData.filter(m =>
                norm(m.team) === norm(team) &&
                norm(m.mode) === norm(mode) &&
                (map ? norm(m.map) === norm(map) : true) &&
                norm(m.player) === norm(player)
            );

            if (!filtered.length) return;

            const uniqueMatches = new Set(filtered.map(m => m.matchID));
            const totalKills  = filtered.reduce((a,b)=>a+b.kills,0);
            const totalDeaths = filtered.reduce((a,b)=>a+b.deaths,0);
            const totalDamage = filtered.reduce((a,b)=>a+b.damage,0);
            const totalFB     = filtered.reduce((a,b)=>a + (b.firstBloods || 0), 0);

            html += `
                <tr>
                    <td>${cap(player)}</td>
                    <td>${uniqueMatches.size}</td>
                    <td>${(totalKills/filtered.length).toFixed(1)}</td>
                    <td>${(totalDeaths/filtered.length).toFixed(1)}</td>
                    <td>${(totalKills/totalDeaths).toFixed(2)}</td>
                    <td>${(totalDamage/filtered.length).toFixed(1)}</td>
                    ${mode === "snd" ? `<td>${(totalFB/filtered.length).toFixed(2)}</td>` : ""}
                </tr>
            `;
        });

        html += `</table>`;
        return html;
    }

    // ============================================================
    // MAP1-3 UI
    // ============================================================

    function buildMap13UI() {
        const map13Wrap = map13Container;
        map13Wrap.innerHTML = "";
    
        const modes = [
            { key: "hp", label: "Hardpoint", limit: 5 },
            { key: "snd", label: "Search & Destroy", limit: 5 },
            { key: "overload", label: "Overload", limit: 3 },
        ];
    
        // Track selected maps per mode
        const MAP13_SELECTED = { hp: null, snd: null, overload: null };
    
        // Create map grids per mode
        modes.forEach(({key, label, limit}) => {
            const row = document.createElement("div");
            row.className = "map13-mode-row";
            row.innerHTML = `<label class="bp-label">${label}</label>`;
            const grid = document.createElement("div");
            grid.className = "gm-map-grid";
    
            modeMaps[key].forEach(map => {
                const cleanMap = map.trim().replace(/\s+/g,"").replace(/[^a-zA-Z0-9]/g,"").toLowerCase();
                const btn = document.createElement("div");
                btn.className = "gm-map-card";
                btn.innerHTML = `
                    <img class="gm-map-thumb" src="maps/${cleanMap}.webp" 
                         onerror="this.onerror=null;this.src='maps/${cleanMap}.png'">
                    <div class="gm-map-name">${map}</div>
                `;
    
                btn.onclick = () => {
                    MAP13[key] = map;
                    MAP13_SELECTED[key] = true;
    
                    // Mark active visually
                    [...grid.children].forEach(c => c.classList.remove("active"));
                    btn.classList.add("active");
    
                    // Enable RUN only if every mode has a selected map
                    const runBtn = document.getElementById("map13-run");
                    const allSelected = Object.values(MAP13_SELECTED).every(v => v);
                    runBtn.disabled = !allSelected;
                };
    
                grid.appendChild(btn);
            });
    
            row.appendChild(grid);
            map13Wrap.appendChild(row);
        });
    
        // Team row + run button
        const teamRow = document.createElement("div");
        teamRow.className = "map13-team-row";
        teamRow.innerHTML = `
            <label class="bp-label">Team</label>
            <select id="map13-team" class="team-vs-dropdown"></select>
            <button id="map13-run" class="bp-run-btn" disabled>RUN</button>
            <div style="color:red; margin-top:8px; font-size:0.9em;">
        Select 1 map per game mode to see stats
    </div>
        `;
        map13Wrap.appendChild(teamRow);
    
        const teamDD = document.getElementById("map13-team");
        ACTIVE_TEAMS.forEach(t => teamDD.innerHTML += `<option value="${t}">${teams[t].name}</option>`);
        MAP13.team = teamDD.options[0]?.value || null;
        teamDD.value = MAP13.team;
    
        teamDD.onchange = () => MAP13.team = teamDD.value;
        document.getElementById("map13-run").onclick = renderMap13;
    }

    function renderMap13() {
        if (!MAP13.team) return;

        GM_TEAM = MAP13.team;

        const modes = ["hp","snd","overload"];
        let mapHTML = "";

        modes.forEach(mode=>{
            const map = MAP13[mode];
            if (!map) return;
            GM_MODE = mode;
            GM_MAP = map;
            mapHTML += `<h4>${modeNames[mode]} — ${map}</h4>`;
            mapHTML += renderPlayerTable(MAP13.team, mode, map);
        });

        results.innerHTML = mapHTML;
    }

    function renderMap13() {
        if (!MAP13.team) return;
    
        const team = MAP13.team;
        const players = teams[team].players;
        const modes = ["hp", "snd", "overload"];
        const modeLabels = { hp: "HP", snd: "SND", overload: "Overload" };
    
        let html = `
        <div class="map13-team-header" 
     style="text-align:center; margin-top:20px; margin-bottom:20px;">
    <img src="./logos/${team}.webp" 
         onerror="this.onerror=null;this.src='./logos/${team}.png'" 
         style="width:100px; height:auto; margin-bottom:10px;">
    <div style="font-weight:bold; font-size:1.2em;">${teams[team].name}</div>
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
    
        players.forEach(player => {
    
            let sumAvgKills = 0;
            let sumAvgDeaths = 0;
            let sumAvgDamage = 0;
            let missingModes = [];
    
            modes.forEach(mode => {
    
                const selectedMap = MAP13[mode];
                if (!selectedMap) {
                    missingModes.push(modeLabels[mode]);
                    return;
                }
    
                const filtered = window.matchData.filter(m =>
                    norm(m.team) === norm(team) &&
                    norm(m.mode) === norm(mode) &&
                    norm(m.map) === norm(selectedMap) &&
                    norm(m.player) === norm(player)
                );
    
                if (!filtered.length) {
                    missingModes.push(modeLabels[mode]);
                    return;
                }
    
                const totalKills  = filtered.reduce((a,b)=>a+b.kills,0);
                const totalDeaths = filtered.reduce((a,b)=>a+b.deaths,0);
                const totalDamage = filtered.reduce((a,b)=>a+b.damage,0);
    
                const avgKills  = totalKills / filtered.length;
                const avgDeaths = totalDeaths / filtered.length;
                const avgDamage = totalDamage / filtered.length;
    
                sumAvgKills  += avgKills;
                sumAvgDeaths += avgDeaths;
                sumAvgDamage += avgDamage;
            });
    
            const kd = sumAvgDeaths ? (sumAvgKills / sumAvgDeaths) : 0;
    
            html += `
                <tr>
                    <td>${cap(player)}</td>
                    <td>${sumAvgKills ? sumAvgKills.toFixed(1) : "-"}</td>
                    <td>${sumAvgDeaths ? sumAvgDeaths.toFixed(1) : "-"}</td>
                    <td>${kd ? kd.toFixed(2) : "-"}</td>
                    <td>${sumAvgDamage ? sumAvgDamage.toFixed(1) : "-"}</td>
                    <td>${missingModes.length ? missingModes.join(", ") : "-"}</td>
                </tr>
            `;
        });
    
        html += "</table>";
        results.innerHTML = html;
    }
}