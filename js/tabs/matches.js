// ============================================================
// MATCHES TAB — QUERY SYSTEM + FULL CARD (WINNER GLOW)
// MOBILE MODE MATCHES YOUR SCREENSHOT PERFECTLY
// ============================================================

function buildMatchesTabs(matches, teams, modeMaps) {

    const root = document.getElementById("tab-matches");
    if (!root) return;
    root.innerHTML = "";

    // ============================================================
    // TOP UI — MODES → MAPS → TEAM/OPP → RUN
    // ============================================================

    root.innerHTML = `
        <div class="vm-container">

            <h2 class="bp-title">HEAD-TO-HEAD</h2>

            <!-- GAME MODES -->
            <label class="bp-label">Game Modes:</label>
            <div id="vm-mode-toggle" class="bp-mode-toggle"></div>

            <!-- MAPS -->
            <label class="bp-label">Maps:</label>
            <div id="vm-map-toggle" class="bp-mode-toggle"></div>

            <!-- TEAM + OPPONENT SIDE BY SIDE -->
            <div class="vm-flex">
                <div class="vm-col">
                    <label class="bp-label">Team:</label>
                    <select id="vm-team" class="vm-dropdown">
                        <option value="">Select Team</option>
                    </select>
                </div>

                <div class="vm-col">
                    <label class="bp-label">Opponent:</label>
                    <select id="vm-opponent" class="vm-dropdown">
                        <option value="">Select Opponent</option>
                    </select>
                </div>
            </div>

            <!-- RUN BUTTON -->
            <button id="vm-run" class="vm-run-btn">RUN</button>

            <!-- RESULTS -->
            <div id="vm-results"></div>
        </div>
    `;

    const modeBox    = document.getElementById("vm-mode-toggle");
    const mapBox     = document.getElementById("vm-map-toggle");
    const teamDrop   = document.getElementById("vm-team");
    const oppDrop    = document.getElementById("vm-opponent");
    const runBtn     = document.getElementById("vm-run");
    const resultsBox = document.getElementById("vm-results");

    // ============================================================
    // MODE BUTTONS
    // ============================================================

    let VM_MODE = "hp";

    modeBox.innerHTML = `
        <button data-mode="hp" class="bp-toggle-btn active">Hardpoint</button>
        <button data-mode="snd" class="bp-toggle-btn">Search & Destroy</button>
        <button data-mode="overload" class="bp-toggle-btn">Overload</button>
    `;

    modeBox.querySelectorAll("button").forEach(btn => {
        btn.onclick = () => {
            modeBox.querySelectorAll("button").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            VM_MODE = btn.dataset.mode;
            loadMaps();
        };
    });

    // ============================================================
    // MAP BUTTONS
    // ============================================================

    let VM_MAP = "";

    function loadMaps() {
        const maps = modeMaps[VM_MODE] ?? [];

        mapBox.innerHTML = maps
            .map(m => `<button class="bp-toggle-btn map-btn" data-map="${m}">${m}</button>`)
            .join("");

        VM_MAP = "";
        teamDrop.innerHTML = `<option value="">Select Team</option>`;
        oppDrop.innerHTML  = `<option value="">Select Opponent</option>`;

        mapBox.querySelectorAll("button").forEach(btn => {
            btn.onclick = () => {
                mapBox.querySelectorAll("button").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                VM_MAP = btn.dataset.map;
                loadTeams();
            };
        });
    }

    loadMaps();

    // ============================================================
    // LOAD TEAMS BASED ON MODE+MAP
    // ============================================================

    function loadTeams() {
        const filtered = matches.filter(m => m.mode === VM_MODE && m.map === VM_MAP);
        const teamList = [...new Set(filtered.map(m => m.team))];

        teamDrop.innerHTML =
            `<option value="">Select Team</option>` +
            teamList.map(t => `<option value="${t}">${cap(t)}</option>`).join("");

        oppDrop.innerHTML = `<option value="">Select Opponent</option>`;
    }

    // ============================================================
    // LOAD OPPONENTS BASED ON TEAM SELECTION
    // ============================================================

    teamDrop.onchange = () => {
        const team = teamDrop.value;
        if (!team) return;

        const relevant = matches.filter(
            m => m.team === team && m.mode === VM_MODE && m.map === VM_MAP
        );

        const matchIDs = [...new Set(relevant.map(m => m.matchID))];

        let opps = [];
        matchIDs.forEach(mid => {
            const allTeams = matches.filter(m => m.matchID === mid);
            const list = [...new Set(allTeams.map(m => m.team))];
            const opponent = list.find(t => t !== team);
            if (opponent) opps.push(opponent);
        });

        opps = [...new Set(opps)];

        oppDrop.innerHTML =
            `<option value="">Select Opponent</option>` +
            opps.map(t => `<option value="${t}">${cap(t)}</option>`).join("");
    };

    // ============================================================
    // RUN — RENDER MATCH CARDS
    // ============================================================

    runBtn.onclick = () => {
        const team = teamDrop.value;
        const opp  = oppDrop.value;

        if (!team || !opp) {
            resultsBox.innerHTML = `<div class="warnBox">Select team and opponent.</div>`;
            return;
        }

        renderMatches(team, opp);
    };

    // ============================================================
    // RENDER MATCH CARDS — NEWEST → OLDEST
    // ============================================================

    function renderMatches(team, opp) {

        const filtered = matches.filter(
            m => m.team === team && m.mode === VM_MODE && m.map === VM_MAP
        );

        if (filtered.length === 0) {
            resultsBox.innerHTML = `<div class="warnBox">No matches found.</div>`;
            return;
        }

        const matchIDs = [...new Set(filtered.map(m => m.matchID))];
        matchIDs.sort((a, b) => b - a);

        let html = "";

        matchIDs.forEach(mid => {
            const all = matches.filter(m => m.matchID === mid);
            const my  = all.filter(m => m.team === team);
            const op  = all.filter(m => m.team === opp);

            if (!my.length || !op.length) return;

            const date     = my[0].date;
            const myScore  = my[0].teamScore;
            const oppScore = my[0].oppScore;

            const myGlow  = glowColors[team] ?? "#fff";
            const oppGlow = glowColors[opp] ?? "#fff";

            const glow =
                myScore > oppScore ? myGlow :
                oppScore > myScore ? oppGlow : "#666";

            // =====================================================
            // FULL MATCH CARD — DESKTOP + MOBILE LAYOUT
            // =====================================================

            html += `
                <div class="matchCardFull" style="--glow:${glow}">

                    <!-- SCORE -->
                    <div class="mc-score">${myScore} — ${oppScore}</div>

                    <!-- DESKTOP HEADER (HIDDEN ON MOBILE) -->
                    <div class="mc-header">
                        <img class="mc-logo" src="test1/logos/${team}.webp"
                             onerror="this.src='test1/logos/${team}.png'">

                        <div class="mc-vs-text">${cap(team)} VS ${cap(opp)}</div>

                        <img class="mc-logo" src="test1/logos/${opp}.webp"
                             onerror="this.src='test1/logos/${opp}.png'">
                    </div>

                    <!-- MOBILE LOGO + TEAM TITLE -->
                    <img class="mc-mobile-logo" src="test1/logos/${team}.webp"
                         onerror="this.src='test1/logos/${team}.png'">
                    <div class="mc-table-title">${cap(team)}</div>

                    <!-- TABLES STACK -->
                    <div class="mc-tables">

                        <!-- TEAM TABLE -->
                        <table class="mc-table">
                            <tr><th>PLAYER</th><th>K</th><th>D</th><th>K/D</th><th>DMG</th></tr>
                            ${my.map(p => `
                                <tr>
                                    <td>${cap(p.player)}</td>
                                    <td>${p.kills}</td>
                                    <td>${p.deaths}</td>
                                    <td>${p.deaths ? (p.kills/p.deaths).toFixed(2) : p.kills.toFixed(2)}</td>
                                    <td>${p.damage ?? "-"}</td>
                                </tr>
                            `).join("")}
                        </table>

                        <!-- OPP LOGO + NAME FOR MOBILE -->
                        <img class="mc-mobile-logo" src="test1/logos/${opp}.webp"
                             onerror="this.src='test1/logos/${opp}.png'">
                        <div class="mc-table-title">${cap(opp)}</div>

                        <!-- OPP TABLE -->
                        <table class="mc-table">
                            <tr><th>PLAYER</th><th>K</th><th>D</th><th>K/D</th><th>DMG</th></tr>
                            ${op.map(p => `
                                <tr>
                                    <td>${cap(p.player)}</td>
                                    <td>${p.kills}</td>
                                    <td>${p.deaths}</td>
                                    <td>${p.deaths ? (p.kills/p.deaths).toFixed(2) : p.kills.toFixed(2)}</td>
                                    <td>${p.damage ?? "-"}</td>
                                </tr>
                            `).join("")}
                        </table>

                    </div>

                    <!-- DATE -->
                    <div class="mc-date">${date}</div>

                </div>
            `;
        });

        resultsBox.innerHTML = html;
    }
}
