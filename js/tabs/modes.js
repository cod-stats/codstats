// ============================================================
// GAME MODES TAB — MODE → MAP → TEAM ORDER
// OVERALL AVG + AVG VS OPPONENT (WITH RUN BUTTON IN VS MODE)
// ============================================================

// Global match list (loaded once)
window.matchData = [];

async function loadMatchData() {
    try {
        const res = await fetch("test1/matches.json");
        const data = await res.json();
        window.matchData = data;
        console.log("Loaded matchData:", window.matchData.length, "matches");
    } catch (err) {
        console.error("Failed to load matches.json", err);
        window.matchData = [];
    }
}
loadMatchData();



function buildModeTabs(scores, teams, modeMaps) {
    const ACTIVE_TEAMS = Object.keys(teams).filter(t => teams[t].active);
    const root = document.getElementById("tab-modes");

    // inside buildModeTabs, replace the root.innerHTML block with:

root.innerHTML = `
<div class="modes-container">
    <h2 class="bp-title">AVG STATS</h2>

    <!-- VIEW TOGGLES -->
    <div class="gm-view-toggle top-view-toggle">
        <button id="gm-view-overall" class="gm-view-btn active">Overall Avg</button>
        <button id="gm-view-vs" class="gm-view-btn">Avg vs Opponent</button>
        <button id="gm-view-map13" class="gm-view-btn">Map 1 - 3 AVG</button>
    </div>

    <div id="mode-map-wrapper">
    <!-- MODE TOGGLES -->
    <label class="bp-label">Game Mode:</label>
    <div class="bp-mode-toggle" id="mode-toggle-container">
        <button id="gm-hp"  class="bp-toggle-btn active">Hardpoint</button>
        <button id="gm-snd" class="bp-toggle-btn">Search & Destroy</button>
        <button id="gm-over" class="bp-toggle-btn">Overload</button>
    </div>

        <!-- MAP GRID -->
        <label class="bp-label">Maps:</label>
        <div id="gm-map-grid" class="gm-map-grid"></div>
    </div>

    <!-- TEAM GRID (Overall Mode) -->
    <div id="team-toggle-wrapper" class="team-toggle-wrapper"></div>

    <!-- TEAM + OPPONENT ROW (VS Mode) -->
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


    <!-- MAP1-3 CONTAINER -->
    <div id="map13-container" class="hidden"></div>

    <!-- RUN BUTTON -->
    <button id="gm-run-vs" class="bp-run-btn hidden">RUN</button>

    <!-- RESULTS -->
    <div id="gm-results"></div>
</div>
`;

    // ===================================================================
    // REFERENCES
    // ===================================================================
    const results      = document.getElementById("gm-results");
    const map13Wrap    = document.getElementById("map13-container");
    const mapGrid      = document.getElementById("gm-map-grid");
    const teamWrapper  = document.getElementById("team-toggle-wrapper");
    const vsRow        = document.getElementById("vs-row");
    const teamSelectVS = document.getElementById("team-select-vs");
    const oppSelect    = document.getElementById("opponent-select");
    const runVSBtn     = document.getElementById("gm-run-vs");

    let GM_MODE = "hp";
    let GM_MAP  = null;
    let GM_TEAM = null;
    let GM_VIEW = "overall";

    // ===================== MAP1-3 STATE ======================
    let MAP13 = {
        hp: null,
        snd: null,
        overload: null,
        team: null
    };
    
    // ===================================================================
    // MODE TOGGLES
    // ===================================================================

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

        if (GM_VIEW === "overall") {
            results.innerHTML = `<p>Select map + team.</p>`;
        } else {
            loadTeamDropdownVS();
            results.innerHTML = `<p>Select map, team, opponent, then RUN.</p>`;
        }
    }

    modeButtons.hp.onclick       = () => setGMMode("hp");
    modeButtons.snd.onclick      = () => setGMMode("snd");
    modeButtons.overload.onclick = () => setGMMode("overload");

    // ===================================================================
    // MAP GRID — IMAGE + TITLE BUTTONS
    // ===================================================================

    function loadMapGrid() {
        mapGrid.innerHTML = "";
        GM_MAP = null;

        modeMaps[GM_MODE].forEach(map => {

            const cleanMap = map
                .trim()
                .replace(/\s+/g, "")
                .replace(/[^a-zA-Z0-9]/g, "")
                .toLowerCase();

            const card = document.createElement("div");
            card.className = "gm-map-card";

            card.innerHTML = `
                <img class="gm-map-thumb"
                     src="test1/maps/${cleanMap}.webp"
                     onerror="this.onerror=null;this.src='test1/maps/${cleanMap}.png'">
                <div class="gm-map-name">${map}</div>
            `;

            card.onclick = () => {
                GM_MAP = map;

                document.querySelectorAll(".gm-map-card")
                    .forEach(c => c.classList.remove("active"));
                card.classList.add("active");

                // AUTO-SELECT FIRST TEAM IF NONE IS PICKED
                if (!GM_TEAM) {
                    const firstTeam = Object.keys(teams)[0];
                    GM_TEAM = firstTeam;

                    document.querySelectorAll(".team-toggle-btn").forEach(b => b.classList.remove("active"));
                    const btn = document.querySelector(`.team-toggle-btn[data-team="${firstTeam}"]`);
                    if (btn) btn.classList.add("active");
                }

                if (GM_VIEW === "vsOpp") {
                    loadOpponentDropdown();
                    results.innerHTML = `<p>Select opponent then RUN.</p>`;
                    return;
                }

                renderModeMap();
            };

            mapGrid.appendChild(card);
        });
    }

    loadMapGrid();

    // ===================================================================
    // TEAM BUTTON GRID (OVERALL)
    // ===================================================================

    function loadTeamButtons() {
        teamWrapper.innerHTML="";

        ACTIVE_TEAMS.forEach(team=>{
            const glow = glowColors[team] ?? "#fff";

            const btn=document.createElement("div");
            btn.className="team-toggle-btn";
            btn.dataset.team=team;
            btn.style.setProperty("--teamGlow",glow);

            btn.innerHTML=`
                <img src="test1/logos/${team}.webp"
                     onerror="this.onerror=null;this.src='test1/logos/${team}.png'">
                <div>${teams[team].name}</div>
            `;

            btn.onclick=()=>{
                GM_TEAM=team;
                document.querySelectorAll(".team-toggle-btn").forEach(b=>b.classList.remove("active"));
                btn.classList.add("active");
                if(GM_MAP) renderModeMap();
            };

            teamWrapper.appendChild(btn);
        });
    }
    loadTeamButtons();

    // ===================================================================
    // TEAM DROPDOWN (VS MODE)
    // ===================================================================

    function loadTeamDropdownVS() {
        teamSelectVS.innerHTML = "";

        ACTIVE_TEAMS.forEach(team=>{
            teamSelectVS.innerHTML+=`<option value="${team}">${teams[team].name}</option>`;
        });

        teamSelectVS.onchange = () => {
            GM_TEAM = teamSelectVS.value;
            if (GM_MAP) {
                loadOpponentDropdown();
                results.innerHTML = `<p>Select opponent then RUN.</p>`;
            }
        };

        GM_TEAM = teamSelectVS.value;
    }

    // ===================================================================
    // VIEW TOGGLES
    // ===================================================================

    const viewBtns = {
        overall: document.getElementById("gm-view-overall"),
        vsOpp: document.getElementById("gm-view-vs"),
        map13: document.getElementById("gm-view-map13"),
    };

    function setGMView(view) {

        GM_VIEW = view;

        Object.values(viewBtns).forEach(b => b.classList.remove("active"));
        viewBtns[view].classList.add("active");

        const modeMapWrap = document.getElementById("mode-map-wrapper");

        if (view === "overall") {
            modeMapWrap.classList.remove("hidden"); // show modes + maps
            teamWrapper.classList.remove("hidden");
            vsRow.classList.add("hidden");
            runVSBtn.classList.add("hidden");
            map13Wrap.classList.add("hidden");
        }
    
        if (view === "vsOpp") {
            modeMapWrap.classList.remove("hidden"); // show modes + maps
            teamWrapper.classList.add("hidden");
            vsRow.classList.remove("hidden");
            runVSBtn.classList.remove("hidden");
            map13Wrap.classList.add("hidden");
            loadTeamDropdownVS();
        }
    
        if (view === "map13") {
            modeMapWrap.classList.add("hidden"); // hide modes + maps
            teamWrapper.classList.add("hidden");
            vsRow.classList.add("hidden");
            runVSBtn.classList.add("hidden");
            map13Wrap.classList.remove("hidden");
            buildMap13UI();
        }

        results.innerHTML = "";
    }

    viewBtns.overall.onclick = () => setGMView("overall");
    viewBtns.vsOpp.onclick   = () => setGMView("vsOpp");
    viewBtns.map13.onclick   = () => setGMView("map13");

    // ===================================================================
    // MAP1-3 UI BUILDER (NEW)
    // ===================================================================

    function buildMap13UI() {
        map13Wrap.innerHTML = "";
    
        function buildRow(mode, label, limit) {
            const row = document.createElement("div");
            row.innerHTML = `<label class="bp-label">${label}</label>`;
            const grid = document.createElement("div");
            grid.className = "gm-map-grid";
    
            modeMaps[mode].slice(0, limit).forEach(map => {
                const cleanMap = map
                    .trim()
                    .replace(/\s+/g, "")
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toLowerCase();
    
                const btn = document.createElement("div");
                btn.className = "gm-map-card";
    
                // add image and name
                btn.innerHTML = `
                    <img class="gm-map-thumb"
                         src="test1/maps/${cleanMap}.webp"
                         onerror="this.onerror=null;this.src='test1/maps/${cleanMap}.png'">
                    <div class="gm-map-name">${map}</div>
                `;
    
                btn.onclick = () => {
                    MAP13[mode] = map;
                    [...grid.children].forEach(c => c.classList.remove("active"));
                    btn.classList.add("active");
                };
    
                grid.appendChild(btn);
            });
    
            row.appendChild(grid);
            map13Wrap.appendChild(row);
        }
    
        buildRow("hp", "Hardpoint", 5);
        buildRow("snd", "Search & Destroy", 5);
        buildRow("overload", "Overload", 3);
    
        // TEAM DROPDOWN
        const teamRow = document.createElement("div");
        teamRow.innerHTML = `
            <label class="bp-label">Team</label>
            <select id="map13-team" class="team-vs-dropdown"></select>
            <button id="map13-run" class="bp-run-btn">RUN</button>
        `;
    
        map13Wrap.appendChild(teamRow);
    
        const teamDD = document.getElementById("map13-team");
        ACTIVE_TEAMS.forEach(t=>{
            teamDD.innerHTML += `<option value="${t}">${teams[t].name}</option>`;
        });
    
        teamDD.onchange = () => MAP13.team = teamDD.value;
        MAP13.team = teamDD.value;
    
        document.getElementById("map13-run").onclick = renderMap13;
    }

    // ===================================================================
    // MAP1-3 RENDER LOGIC (NEW)
    // ===================================================================

    function renderMap13() {
        const team = MAP13.team;
        if (!MAP13.hp || !MAP13.snd || !MAP13.overload)
            return results.innerHTML = `<p>Select 1 map per mode.</p>`;
        if (!team)
            return results.innerHTML = `<p>Select a team.</p>`;
    
        const selectedMaps = [
            { mode: "hp", map: MAP13.hp },
            { mode: "snd", map: MAP13.snd },
            { mode: "overload", map: MAP13.overload }
        ];
    
        const glow = glowColors[team] ?? "#fff";
    
        let html = `
            <div class="map13-header" style="text-align:center;margin-bottom:10px;">
                <img src="test1/logos/${team}.webp" 
                     onerror="this.onerror=null;this.src='test1/logos/${team}.png'" 
                     style="width:80px;height:80px;display:block;margin:0 auto;">
                <div style="font-weight:bold;font-size:16px;margin-top:5px;">${teams[team].name}</div>
            </div>
    
            <table class="playerTable map13-glow" style="box-shadow: 0 0 20px ${glow};">
                <tr>
                    <th>Player</th>
                    <th>Map1-3 Avg Kills</th>
                    <th>Map1-3 Avg Deaths</th>
                    <th>K/D</th>
                    <th>Map1-3 Avg Damage</th>
                </tr>
        `;
    
        teams[team].players.forEach(player => {
            let sumAvgKills = 0, sumAvgDeaths = 0, sumAvgDamage = 0;
            let totalKills = 0, totalDeaths = 0;
            let missingModes = [];
    
            selectedMaps.forEach(sel => {
                const rows = window.matchData.filter(m =>
                    norm(m.team) === norm(team) &&
                    norm(m.mode) === norm(sel.mode) &&
                    norm(m.map) === norm(sel.map) &&
                    norm(m.player) === norm(player)
                );
    
                if (!rows.length) {
                    missingModes.push(modeNames[sel.mode] || sel.mode);
                    return;
                }
    
                const kills  = rows.reduce((a,b)=>a+b.kills,0);
                const deaths = rows.reduce((a,b)=>a+b.deaths,0);
                const damage = rows.reduce((a,b)=>a+b.damage,0);
    
                sumAvgKills  += kills / rows.length;
                sumAvgDeaths += deaths / rows.length;
                sumAvgDamage += damage / rows.length;
    
                totalKills  += kills;
                totalDeaths += deaths;
            });
    
            let rowHTML = "";
            if (missingModes.length) {
                rowHTML = `
                    <tr>
                        <td>${cap(player)}</td>
                        <td colspan="4" style="text-align:center;color:#f55">
                            Missing ${missingModes.join(", ")}
                        </td>
                    </tr>
                `;
            } else {
                const kd = totalDeaths > 0
                    ? (totalKills / totalDeaths).toFixed(2)
                    : totalKills.toFixed(2);
    
                rowHTML = `
                    <tr>
                        <td>${cap(player)}</td>
                        <td>${sumAvgKills.toFixed(1)}</td>
                        <td>${sumAvgDeaths.toFixed(1)}</td>
                        <td>${kd}</td>
                        <td>${sumAvgDamage.toFixed(1)}</td>
                    </tr>
                `;
            }
    
            html += rowHTML;
        });
    
        html += `</table>`;
        results.innerHTML = html;
    }

    // ===================================================================
    // OPPONENT DROPDOWN
    // ===================================================================

    function loadOpponentDropdown() {
        oppSelect.innerHTML = "";
        if (!GM_TEAM || !GM_MAP) return;
    
        const opps = new Set();
    
        window.matchData.forEach(m => {
            if (
                norm(m.team) === norm(GM_TEAM) &&
                norm(m.mode) === norm(GM_MODE) &&
                norm(m.map) === norm(GM_MAP)
            ) {
                const oppKey = norm(m.opponent);
    
                // ✅ only add if opponent exists AND is active
                if (teams[oppKey]?.active) {
                    opps.add(oppKey);
                }
            }
        });
    
        [...opps].sort().forEach(o => {
            oppSelect.innerHTML += `<option value="${o}">${cap(o)}</option>`;
        });
    
        oppSelect.onchange = () => {
            results.innerHTML = `<p>Press RUN to update results.</p>`;
        };
    }
    

    // ===================================================================
    // RUN BUTTON
    // ===================================================================

    runVSBtn.onclick = () => {
        if (!GM_TEAM) return results.innerHTML = `<p>Please select a team.</p>`;
        if (!GM_MAP)  return results.innerHTML = `<p>Please select a map.</p>`;
        if (!oppSelect.value)
            return results.innerHTML = `<p>Please select an opponent.</p>`;
        renderModeMap();
    };

    // ===================================================================
    // SUMMARY CALCULATORS
    // ===================================================================

    function computeMatchSummary(team, mode, map) {
        const rows = window.matchData.filter(m =>
            norm(m.team) === norm(team) &&
            norm(m.mode) === norm(mode) &&
            norm(m.map) === norm(map)
        );

        const unique = new Map();
        rows.forEach(m => {
            if (!unique.has(m.matchID)) {
                unique.set(m.matchID, m);
            }
        });

        const matches = [...unique.values()];
        if (matches.length === 0) {
            return { count: 0, wins: 0, losses: 0, avgLen: "-", avgRounds: "-" };
        }

        let wins = 0, losses = 0, len = 0, lenCount = 0, rnd = 0, rndCount = 0;

        matches.forEach(m => {
            if (m.teamScore > m.oppScore) wins++;
            else losses++;

            if (m.durationSec) {
                len += m.durationSec;
                lenCount++;
            }
            if (m.duration) {
                rnd += m.duration;
                rndCount++;
            }
        });

        return {
            count: matches.length,
            wins,
            losses,
            avgLen: lenCount ? (len / lenCount).toFixed(0) + " sec" : "-",
            avgRounds: rndCount ? (rnd / rndCount).toFixed(1) : "-"
        };
    }

    function computeMatchSummaryVS(team, opponent, mode, map) {
        const rows = window.matchData.filter(m =>
            norm(m.team) === norm(team) &&
            norm(m.opponent) === norm(opponent) &&
            norm(m.mode) === norm(mode) &&
            norm(m.map) === norm(map)
        );

        const unique = new Map();
        rows.forEach(m => {
            if (!unique.has(m.matchID)) unique.set(m.matchID, m);
        });

        const matches = [...unique.values()];
        if (matches.length === 0) {
            return { count: 0, wins: 0, losses: 0, avgLen: "-", avgRounds: "-" };
        }

        let wins = 0, losses = 0, len = 0, lenCount = 0, rnd = 0, rndCount = 0;

        matches.forEach(m => {
            if (m.teamScore > m.oppScore) wins++;
            else losses++;

            if (m.durationSec) {
                len += m.durationSec;
                lenCount++;
            }
            if (m.duration) {
                rnd += m.duration;
                rndCount++;
            }
        });

        return {
            count: matches.length,
            wins,
            losses,
            avgLen: lenCount ? (len / lenCount).toFixed(0) + " sec" : "-",
            avgRounds: rndCount ? (rnd / rndCount).toFixed(1) : "-"
        };
    }

    // ===================================================================
    // MAIN RENDER
    // ===================================================================

    function renderModeMap() {
        if (!GM_TEAM || !GM_MAP) return;
    
        const team = GM_TEAM;
        const map  = GM_MAP;
        const mode = GM_MODE;
        const glow = glowColors[team] ?? "#fff";
    
        let html = `
            <h3 class="mapHeader">${teams[team].name} — ${map} (${modeNames[mode]})</h3>

            <div class="teamBox" style="--glow:${glow}">
                <img src="./test1/logos/${team}.webp"
                     onerror="this.onerror=null;this.src='./test1/logos/${team}.png'">
    
                <div class="teamTitle">${teams[team].name}</div>
    
                <div class="team-player-wrapper">
                    ${renderPlayerTable(team, mode, map)}
                </div>
            </div>
        `;
    
        results.innerHTML = html;
    }
    

    // ===================================================================
    // PLAYER TABLE
    // ===================================================================

    function renderPlayerTable(team, mode, map) {

        const summary = (GM_VIEW === "overall")
            ? computeMatchSummary(team, mode, map)
            : computeMatchSummaryVS(team, oppSelect.value, mode, map);
    
        let html = `
            <table class="playerTable">
                <tr>
                    <th>Player</th>
                    <th>Matches Played</th>
                    <th>Avg Kills</th>
                    <th>Avg Deaths</th>
                    <th>K/D</th>
                    <th>Avg Damage</th>
                </tr>
        `;
    
        teams[team].players.forEach(player => {
    
            let filtered = window.matchData.filter(m =>
                norm(m.team) === norm(team) &&
                norm(m.mode) === norm(mode) &&
                norm(m.map) === norm(map) &&
                norm(m.player) === norm(player)
            );
    
            // VS OPP FILTER
            if (GM_VIEW !== "overall") {
                const opp = oppSelect.value;
                filtered = filtered.filter(m =>
                    norm(m.opponent) === norm(opp)
                );
            }
    
            if (filtered.length === 0) return;
    
            // 🔥 UNIQUE MATCH COUNT (dedupe by matchID)
            const uniqueMatches = new Set(filtered.map(m => m.matchID));
            const matchCount = uniqueMatches.size;
    
            const totalKills  = filtered.reduce((a, b) => a + b.kills, 0);
            const totalDeaths = filtered.reduce((a, b) => a + b.deaths, 0);
            const totalDamage = filtered.reduce((a, b) => a + b.damage, 0);
    
            const avgK = (totalKills / filtered.length).toFixed(1);
            const avgD = (totalDeaths / filtered.length).toFixed(1);
            const kd = totalDeaths > 0
                ? (totalKills / totalDeaths).toFixed(2)
                : totalKills.toFixed(2);
            const avgDmg = totalDamage > 0
                ? (totalDamage / filtered.length).toFixed(1)
                : "-";
    
            html += `
                <tr>
                    <td>${cap(player)}</td>
                    <td>${matchCount}</td>
                    <td>${avgK}</td>
                    <td>${avgD}</td>
                    <td>${kd}</td>
                    <td>${avgDmg}</td>
                </tr>
            `;
        });
    
        html += `</table>`;
    
        // SUMMARY FOOTER (still stays overall team summary)
        const s = summary;
        html += `
            <div class="mode-summary-footer">
                <div><b>Matches:</b> ${s.count}</div>
                <div><b>W / L:</b> ${s.wins} - ${s.losses}</div>
                ${
                    mode === "snd"
                    ? `<div><b>Avg Rounds:</b> ${s.avgRounds}</div>`
                    : `<div><b>Avg Length:</b> ${s.avgLen}</div>`
                }
            </div>
        `;
    
        return html;
    }
}

// Expose globally
window.buildModeTabs = buildModeTabs;