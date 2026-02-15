// ============================================================
// LAN TAB — MODE → MAP → TEAM ORDER
// OVERALL AVG + AVG VS OPPONENT
// ============================================================

window.lanData = [];

async function loadLanData() {
    try {
        const res = await fetch("test1/lan.json");
        const data = await res.json();
        window.lanData = data;
        console.log("Loaded lanData:", window.lanData.length, "matches");
    } catch (err) {
        console.error("Failed to load lan.json", err);
        window.lanData = [];
    }
}
loadLanData();
function buildLanTab(teams, modeMaps) {

    const ACTIVE_TEAMS = Object.keys(teams).filter(t=>teams[t].active);
    const root = document.getElementById("tab-lan");

    root.innerHTML = `
        <div class="modes-container">
         <h2 class="bp-title">LAN AVG STATS</h2>

            <div class="gm-view-toggle top-view-toggle">
                <button id="lan-view-overall" class="gm-view-btn active">Lan Avg</button>
                <button id="lan-view-vs" class="gm-view-btn">Avg vs Opponent</button>
            </div>

            <label class="bp-label">Game Modes:</label>
            <div class="bp-mode-toggle">
                <button id="lan-hp"  class="bp-toggle-btn active">Hardpoint</button>
                <button id="lan-snd" class="bp-toggle-btn">Search & Destroy</button>
                <button id="lan-over" class="bp-toggle-btn">Overload</button>
            </div>

            <label class="bp-label">Maps:</label>
            <div id="lan-map-grid" class="gm-map-grid"></div>

            <div id="lan-team-toggle-wrapper" class="team-toggle-wrapper"></div>

            <div id="lan-vs-row" class="hidden vs-flex-row">
                <div class="vs-col">
                    <label class="bp-label">Team</label>
                    <select id="lan-team-select-vs" class="team-vs-dropdown"></select>
                </div>

                <div class="vs-col">
                    <label class="bp-label">Opponent</label>
                    <select id="lan-opponent-select" class="team-vs-dropdown"></select>
                </div>
            </div>

            <button id="lan-run-vs" class="bp-run-btn hidden">RUN</button>

            <div id="lan-results"></div>
        </div>
    `;

    // ===================================================================
    // REFERENCES
    // ===================================================================
    const results      = document.getElementById("lan-results");
    const mapGrid      = document.getElementById("lan-map-grid");
    const teamWrapper  = document.getElementById("lan-team-toggle-wrapper");
    const vsRow        = document.getElementById("lan-vs-row");
    const teamSelectVS = document.getElementById("lan-team-select-vs");
    const oppSelect    = document.getElementById("lan-opponent-select");
    const runVSBtn     = document.getElementById("lan-run-vs");

    let LAN_MODE = "hp";
    let LAN_MAP  = null;
    let LAN_TEAM = null;
    let LAN_VIEW = "overall";

    // ===================================================================
    // MODE TOGGLES
    // ===================================================================
    const modeButtons = {
        hp: document.getElementById("lan-hp"),
        snd: document.getElementById("lan-snd"),
        overload: document.getElementById("lan-over"),
    };

    function setLanMode(mode) {
        LAN_MODE = mode;

        Object.values(modeButtons).forEach(b => b.classList.remove("active"));
        modeButtons[mode].classList.add("active");

        loadMapGrid();
        LAN_MAP = null;

        if (LAN_VIEW === "overall") {
            results.innerHTML = `<p>Select map + team.</p>`;
        } else {
            loadTeamDropdownVS();
            results.innerHTML = `<p>Select map, team, opponent, then RUN.</p>`;
        }
    }

    modeButtons.hp.onclick       = () => setLanMode("hp");
    modeButtons.snd.onclick      = () => setLanMode("snd");
    modeButtons.overload.onclick = () => setLanMode("overload");

    // ===================================================================
    // MAP GRID
    // ===================================================================
    function loadMapGrid() {
        mapGrid.innerHTML = "";
        LAN_MAP = null;

        modeMaps[LAN_MODE].forEach(map => {

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
                LAN_MAP = map;

                document.querySelectorAll(".gm-map-card")
                    .forEach(c => c.classList.remove("active"));
                card.classList.add("active");

                if (!LAN_TEAM) {
                    const firstTeam = Object.keys(teams)[0];
                    LAN_TEAM = firstTeam;

                    document.querySelectorAll(".team-toggle-btn").forEach(b => b.classList.remove("active"));
                    const btn = document.querySelector(`.team-toggle-btn[data-team="${firstTeam}"]`);
                    if (btn) btn.classList.add("active");
                }

                if (LAN_VIEW === "vsOpp") {
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
    // TEAM BUTTON GRID
    // ===================================================================
    function loadTeamButtons(){
        teamWrapper.innerHTML="";

        ACTIVE_TEAMS.forEach(team=>{
            const glow=glowColors[team]??"#fff";

            const btn=document.createElement("div");
            btn.className="team-toggle-btn";
            btn.dataset.team=team;

            btn.innerHTML=`
                <img src="test1/logos/${team}.webp"
                     onerror="this.onerror=null;this.src='test1/logos/${team}.png'">
                <div>${teams[team].name}</div>
            `;

            btn.onclick=()=>{
                LAN_TEAM=team;
                document.querySelectorAll(".team-toggle-btn").forEach(b=>b.classList.remove("active"));
                btn.classList.add("active");
                if(LAN_MAP) renderModeMap();
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
            LAN_TEAM = teamSelectVS.value;
            if (LAN_MAP) {
                loadOpponentDropdown();
                results.innerHTML = `<p>Select opponent then RUN.</p>`;
            }
        };

        LAN_TEAM = teamSelectVS.value;
    }

    // ===================================================================
    // VIEW TOGGLES
    // ===================================================================
    const viewBtns = {
        overall: document.getElementById("lan-view-overall"),
        vsOpp: document.getElementById("lan-view-vs"),
    };

    function setLanView(view) {
        LAN_VIEW = view;

        viewBtns.overall.classList.remove("active");
        viewBtns.vsOpp.classList.remove("active");
        viewBtns[view === "overall" ? "overall" : "vsOpp"].classList.add("active");

        if (view === "vsOpp") {
            teamWrapper.classList.add("hidden");
            vsRow.classList.remove("hidden");
            runVSBtn.classList.remove("hidden");

            loadTeamDropdownVS();
            loadOpponentDropdown();

            results.innerHTML = `<p>Select team, map, opponent, then RUN.</p>`;
        } else {
            teamWrapper.classList.remove("hidden");
            vsRow.classList.add("hidden");
            runVSBtn.classList.add("hidden");

            LAN_TEAM = null;
            results.innerHTML = "";
        }
    }

    viewBtns.overall.onclick = () => setLanView("overall");
    viewBtns.vsOpp.onclick   = () => setLanView("vsOpp");

    // ===================================================================
    // OPPONENT DROPDOWN
    // ===================================================================
    function loadOpponentDropdown() {
        oppSelect.innerHTML = "";
        if (!LAN_TEAM || !LAN_MAP) return;

        const opps = new Set();

        window.lanData.forEach(m => {
            if (
                norm(m.team) === norm(LAN_TEAM) &&
                norm(m.mode) === norm(LAN_MODE) &&
                norm(m.map) === norm(LAN_MAP)
            ) {
                opps.add(norm(m.opponent));
            }
        });

        [...opps].sort().forEach(o => {
            oppSelect.innerHTML += `<option value="${o}">${cap(o)}</option>`;
        });

        oppSelect.onchange = () => {
            results.innerHTML = `<p>Press RUN to update results.</p>`;
        };
    }

    runVSBtn.onclick = () => {
        if (!LAN_TEAM) return results.innerHTML = `<p>Please select a team.</p>`;
        if (!LAN_MAP)  return results.innerHTML = `<p>Please select a map.</p>`;
        if (!oppSelect.value)
            return results.innerHTML = `<p>Please select an opponent.</p>`;
        renderModeMap();
    };

    // ===================================================================
    // SUMMARY + PLAYER TABLE
    // ===================================================================
    function computeMatchSummary(team, mode, map) {
        const rows = window.lanData.filter(m =>
            norm(m.team) === norm(team) &&
            norm(m.mode) === norm(mode) &&
            norm(m.map) === norm(map)
        );

        const unique = new Map();
        rows.forEach(m => { if (!unique.has(m.matchID)) unique.set(m.matchID, m); });

        const matches = [...unique.values()];
        if (matches.length === 0) return { count: 0, wins: 0, losses: 0, avgLen: "-", avgRounds: "-" };

        let wins = 0, losses = 0, len = 0, lenCount = 0, rnd = 0, rndCount = 0;

        matches.forEach(m => {
            if (m.teamScore > m.oppScore) wins++;
            else losses++;

            if (m.durationSec) { len += m.durationSec; lenCount++; }
            if (m.duration) { rnd += m.duration; rndCount++; }
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
        const rows = window.lanData.filter(m =>
            norm(m.team) === norm(team) &&
            norm(m.opponent) === norm(opponent) &&
            norm(m.mode) === norm(mode) &&
            norm(m.map) === norm(map)
        );

        const unique = new Map();
        rows.forEach(m => { if (!unique.has(m.matchID)) unique.set(m.matchID, m); });

        const matches = [...unique.values()];
        if (matches.length === 0) return { count: 0, wins: 0, losses: 0, avgLen: "-", avgRounds: "-" };

        let wins = 0, losses = 0, len = 0, lenCount = 0, rnd = 0, rndCount = 0;

        matches.forEach(m => {
            if (m.teamScore > m.oppScore) wins++;
            else losses++;

            if (m.durationSec) { len += m.durationSec; lenCount++; }
            if (m.duration) { rnd += m.duration; rndCount++; }
        });

        return {
            count: matches.length,
            wins,
            losses,
            avgLen: lenCount ? (len / lenCount).toFixed(0) + " sec" : "-",
            avgRounds: rndCount ? (rnd / rndCount).toFixed(1) : "-"
        };
    }

    function renderModeMap() {
        if (!LAN_TEAM || !LAN_MAP) return;

        const team = LAN_TEAM;
        const map  = LAN_MAP;
        const mode = LAN_MODE;
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

    function renderPlayerTable(team, mode, map) {
        const summary = (LAN_VIEW === "overall")
            ? computeMatchSummary(team, mode, map)
            : computeMatchSummaryVS(team, oppSelect.value, mode, map);

        let html = `
            <table class="playerTable">
                <tr>
                    <th>Player</th>
                    <th>Avg Kills</th>
                    <th>Avg Deaths</th>
                    <th>K/D</th>
                    <th>Avg Damage</th>
                </tr>
        `;

        teams[team].players.forEach(player => {
            let filtered = window.lanData.filter(m =>
                norm(m.team) === norm(team) &&
                norm(m.mode) === norm(mode) &&
                norm(m.map) === norm(map) &&
                norm(m.player) === norm(player)
            );

            if (LAN_VIEW !== "overall") {
                filtered = filtered.filter(m => norm(m.opponent) === norm(oppSelect.value));
            }

            if (filtered.length === 0) return;

            const totalKills  = filtered.reduce((a,b) => a+b.kills,0);
            const totalDeaths = filtered.reduce((a,b) => a+b.deaths,0);
            const totalDamage = filtered.reduce((a,b) => a+b.damage,0);
            const updates = filtered.length;

            const avgK = (totalKills/updates).toFixed(1);
            const avgD = (totalDeaths/updates).toFixed(1);
            const kd   = totalDeaths>0 ? (totalKills/totalDeaths).toFixed(2) : totalKills.toFixed(2);
            const avgDmg = totalDamage>0 ? (totalDamage/updates).toFixed(1) : "-";

            html += `
                <tr>
                    <td>${cap(player)}</td>
                    <td>${avgK}</td>
                    <td>${avgD}</td>
                    <td>${kd}</td>
                    <td>${avgDmg}</td>
                </tr>
            `;
        });

        html += `</table>`;

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
window.buildLanTab = buildLanTab;
