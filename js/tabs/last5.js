// ============================================================
// LAST 5 MATCHES — CLEAN FINAL VERSION
// ============================================================

// GLOBAL STATE
let L5_VIEW = "overall";
let L5_MODE = "hp";
let L5_MAP = "";

// ============================================================
// DATE FORMATTER
// ============================================================
function formatMatchDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr + "T00:00:00");
    return isNaN(d)
        ? "—"
        : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ============================================================
// DURATION FORMATTER
// ============================================================
function formatDuration(sec) {
    if (sec == null || isNaN(sec)) return "—";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

// ============================================================
// BUILD TAB (UPDATED — no scores)
// ============================================================
function buildLast5Tabs(matches, teams, modeMaps) {

    const ACTIVE_TEAMS = Object.keys(teams).filter(t => teams[t].active);

    const teamsHtml = ACTIVE_TEAMS
        .map(t => `<option value="${t}">${cap(teams[t].name)}</option>`)
        .join("");

    const firstTeam = ACTIVE_TEAMS[0];
    const root = document.getElementById("tab-last5");

    root.innerHTML = `
        <div class="last5-container">

            <h2 class="bp-title">LAST 10 MATCHES</h2>

            <div class="bp-view-toggle">
                <button id="l5-view-overall" class="bp-toggle-btn active">Overall Last 10</button>
                <button id="l5-view-vs" class="bp-toggle-btn">Last 10 VS</button>
            </div>

            <label class="bp-label" style="margin-top:12px;">Game Modes:</label>

            <div class="bp-mode-toggle" id="l5-mode-row">
                <button id="l5-hp" class="bp-toggle-btn active">Hardpoint</button>
                <button id="l5-snd" class="bp-toggle-btn">Search & Destroy</button>
                <button id="l5-overload" class="bp-toggle-btn">Overload</button>
            </div>

            <label class="bp-label" style="margin-top:14px;">Maps:</label>

            <div id="l5-map-container">
                <div id="l5-map-wrapper"></div>
            </div>

            <div id="l5-filter-panel"></div>

            <button id="l5-run" class="bp-run-btn">RUN</button>

            <div id="l5-output"></div>

        </div>
    `;

    setupLast5Listeners(teams, matches, modeMaps);
    renderLast5Filters(teams, matches, modeMaps);
    renderLast5MapToggles(modeMaps, matches, teams);
}


// ============================================================
// EVENT SETUP
// ============================================================
function setupLast5Listeners(teams, matches, modeMaps) {

    document.getElementById("l5-view-overall").onclick = () => {
        L5_VIEW = "overall";
        swapLast5ViewButtons();
        renderLast5Filters(teams, matches, modeMaps);
    };

    document.getElementById("l5-view-vs").onclick = () => {
        L5_VIEW = "vs";
        swapLast5ViewButtons();
        renderLast5Filters(teams, matches, modeMaps);
    };

    ["hp", "snd", "overload"].forEach(mode => {
        document.getElementById("l5-" + mode).onclick = () => {
            L5_MODE = mode;
            L5_MAP = "";
            swapLast5ModeButtons();
            renderLast5MapToggles(modeMaps, matches, teams);
            renderLast5Filters(teams, matches, modeMaps);
        };
    });

    document.getElementById("l5-run").onclick = () =>
        runLast5(matches, teams, modeMaps);
}

function swapLast5ViewButtons() {
    document.getElementById("l5-view-overall").classList.toggle("active", L5_VIEW === "overall");
    document.getElementById("l5-view-vs").classList.toggle("active", L5_VIEW === "vs");
}

function swapLast5ModeButtons() {
    document.getElementById("l5-hp").classList.toggle("active", L5_MODE === "hp");
    document.getElementById("l5-snd").classList.toggle("active", L5_MODE === "snd");
    document.getElementById("l5-overload").classList.toggle("active", L5_MODE === "overload");
}


// ============================================================
// MAP TOGGLES
// ============================================================
function renderLast5MapToggles(modeMaps, matches, teams) {

    const wrapper = document.getElementById("l5-map-wrapper");
    let html = `<div class="gm-map-grid">`;

    modeMaps[L5_MODE].forEach(mapName => {

        const clean = mapName
            .trim()
            .replace(/\s+/g, "")
            .replace(/[^a-zA-Z0-9]/g, "")
            .toLowerCase();

        const active = (L5_MAP === mapName) ? "active" : "";

        html += `
            <div class="gm-map-card ${active}" data-map="${mapName}">
                <img class="gm-map-thumb"
                     src="maps/${clean}.webp"
                     onerror="this.onerror=null;this.src='maps/${clean}.png'">
                <div class="gm-map-name">${mapName}</div>
            </div>
        `;
    });

    html += `</div>`;
    wrapper.innerHTML = html;

    document.querySelectorAll("#l5-map-wrapper .gm-map-card").forEach(card => {
        card.onclick = () => {
            const clicked = card.dataset.map;

            if (L5_MAP === clicked) {
                L5_MAP = "";
                document.querySelectorAll("#l5-map-wrapper .gm-map-card")
                    .forEach(c => c.classList.remove("active"));
                if (L5_VIEW === "vs") loadL5Opponents(matches, teams);
                return;
            }

            L5_MAP = clicked;
            document.querySelectorAll("#l5-map-wrapper .gm-map-card")
                .forEach(c => c.classList.remove("active"));
            card.classList.add("active");

            if (L5_VIEW === "vs") loadL5Opponents(matches, teams);
        };
    });
}


// ============================================================
// FILTERS
// ============================================================
function renderLast5Filters(teams, matches, modeMaps) {

    const root = document.getElementById("l5-filter-panel");

    const ACTIVE_TEAMS = Object.keys(teams).filter(t => teams[t].active);

const teamsHtml = ACTIVE_TEAMS
    .map(t => `<option value="${t}">${cap(teams[t].name)}</option>`)
    .join("");

const firstTeam = ACTIVE_TEAMS[0];


    const playersHtml = (teams[firstTeam]?.players || [])
        .map(p => `<option value="${p}">${cap(p)}</option>`)
        .join("");

    if (L5_VIEW === "overall") {
        root.innerHTML = `
            <div class="l5-filter-row">
                <label>Team:</label>
                <select id="l5-team">${teamsHtml}</select>

                <label>Players:</label>
                <select id="l5-player">
                    <option value="all">All Players</option>
                    ${playersHtml}
                </select>
            </div>
        `;
    }

    if (L5_VIEW === "vs") {
        root.innerHTML = `
            <div class="l5-filter-row">
                <label>Team:</label>
                <select id="l5-team">${teamsHtml}</select>

                <label>Players:</label>
                <select id="l5-player">
                    <option value="all">All Players</option>
                    ${playersHtml}
                </select>

                <label>Opponent:</label>
                <select id="l5-opponent"></select>
            </div>
        `;
    }

    document.getElementById("l5-team").onchange = e=>{
        const team=e.target.value;
        document.getElementById("l5-player").innerHTML=
            `<option value="all">All Players</option>`+
            (teams[team]?.players||[])
                .map(p=>`<option value="${p}">${cap(p)}</option>`)
                .join("");

    };

    if (L5_VIEW === "vs") loadL5Opponents(matches, teams);
}


// ============================================================
// VS OPPONENTS
// ============================================================
function loadL5Opponents(matches, teams) {
    const oppSelect = document.getElementById("l5-opponent");
    const teamSel   = document.getElementById("l5-team");
    if (!oppSelect || !teamSel) return;

    const team = teamSel.value;
    oppSelect.innerHTML = "";

    const seen = new Set();

    matches.forEach(m => {
        if (
            m.team === team &&
            m.mode === L5_MODE &&
            (L5_MAP === "" || m.map === L5_MAP)
        ) {
            const oppKey = m.opponent?.trim();

            // ✅ ACTIVE FILTER HERE
            if (
                oppKey &&
                teams[oppKey]?.active &&
                !seen.has(oppKey)
            ) {
                seen.add(oppKey);
                oppSelect.innerHTML +=
                    `<option value="${oppKey}">${cap(teams[oppKey].name)}</option>`;
            }
        }
    });

    if (seen.size === 0) {
        oppSelect.innerHTML = `<option value="">No active opponents</option>`;
    }
}

// ============================================================
// RUN
// ============================================================
function runLast5(matches, teams, modeMaps) {

    const out = document.getElementById("l5-output");
    out.innerHTML = "";

    const team = document.getElementById("l5-team")?.value;
    const selectedPlayer = document.getElementById("l5-player")?.value;
    if (!team) return;

    let playersToShow = selectedPlayer === "all"
        ? (teams[team]?.players || [])
        : [selectedPlayer];

    const MODE_MAX = { hp: 50, snd: 12, overload: 40 };
    let scaleMax = MODE_MAX[L5_MODE] || 50;

    let fullHTML = "";

    playersToShow.forEach(playerName => {

        let filtered = matches.filter(m =>
            m.team === team &&
            m.player === playerName &&
            m.mode === L5_MODE
        );

        if (L5_MAP !== "") filtered = filtered.filter(m => m.map === L5_MAP);
        if (L5_VIEW === "vs") {
            const opp = document.getElementById("l5-opponent")?.value;
            filtered = filtered.filter(m => m.opponent === opp);
        }

        const last10 = filtered
            .sort((a, b) => b.matchID - a.matchID)
            .slice(0, 10)
            .reverse();

        if (last10.length === 0) {
            fullHTML += `<div class="noData">No matches found.</div>`;
            return;
        }

        // **BIG PLAYER IMAGE**
        const imgPath = `players/${playerName}.webp`;
        const playerImageHTML = `
            <div class="l10-player-big">
                <img src="${imgPath}" onerror="this.onerror=null;this.src='players/${playerName}.png'">
            </div>
        `;

        // BUILD BARS
        let barsHTML = `
        <div class="l10-chart-container">
            ${playerImageHTML} <!-- big image on the left -->
            <div class="l10-chart-content">
                <h3 class="mapHeader" style="margin-top:25px;">
                    ${teams[team].name} — ${playerName} (Last 10)
                </h3>
                <div class="l10-chart">
                    <div class="l10-bars">
        `;

        last10.forEach(m => {
            const height = (m.kills / scaleMax) * 160;
            let barColor = "#888";
            barsHTML += `
                <div class="l10-bar-slot">
                    <div class="l10-bar" style="height:${height}px; background:${barColor}"></div>
                </div>
            `;
        });

        barsHTML += `
                    </div>
                    <div class="l10-info">
        `;

        last10.forEach(m => {
            const kd = m.deaths > 0 ? (m.kills / m.deaths).toFixed(2) : m.kills.toFixed(2);
            const oppName = teams[m.opponent]?.name ?? m.opponent;
            const damage = m.damage ?? "—";
            let timeDisplay, timeLabel;
            if (L5_MODE === "snd") { 
                timeDisplay = m.duration ?? "—"; 
                timeLabel = "Rounds"; 
            } else { 
                timeDisplay = m.durationSec != null ? formatDuration(m.durationSec) : "—"; 
                timeLabel = "Time"; 
            }
            let scoreHTML = (m.teamScore != null && m.oppScore != null) ? `Score:<br>${m.teamScore} - ${m.oppScore}` : "Score: —";
        
            // Format date
            const matchDate = formatMatchDate(m.date);
        
            barsHTML += `
                <div class="l10-info-slot">
                    <div class="l10-kills">${m.kills} / ${m.deaths}</div>
                    <div class="l10-kd">${kd} KD</div>
                    <div class="l10-damage">DMG: ${damage}</div>
                    <div class="l10-score">${scoreHTML}</div>
                    <div class="l10-time">${timeLabel}: ${timeDisplay}</div>
                    <div class="l10-opp">vs ${oppName}</div>
                    <div class="l10-date">${matchDate}</div> <!-- new line for date -->
                </div>
            `;
        });

        barsHTML += `
                    </div>
                </div>
            </div>
        </div>
        `;

        fullHTML += barsHTML;
    });

    out.innerHTML = fullHTML;
}