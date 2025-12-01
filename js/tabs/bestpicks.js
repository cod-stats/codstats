// ============================================================
// BEST PICKS TAB — HP ENGINE V5A + SND ENGINE
// ============================================================

let BP_MODE = "hp";

// ------------------------------------------------------------
// Switch HP/SND mode + repopulate maps
// ------------------------------------------------------------
function setBPMODE(mode, modeMaps) {
    BP_MODE = mode;

    const mapSelect = document.getElementById("bp-map");
    mapSelect.innerHTML = modeMaps[mode]
        .map(m => `<option value="${m}">${m}</option>`)
        .join("");
}

// ============================================================
// BUILD BEST PICKS UI
// ============================================================
function buildBestPicksTabs(matches, teams, modeMaps) {
    const root = document.getElementById("tab-bestpicks");
    root.innerHTML = `
    <div class="bp-container">

        <h2 class="bp-title">BEST PICKS</h2>

        <div class="bp-mode-toggle">
            <button id="bp-hp"  class="bp-toggle-btn active">Hardpoint</button>
            <button id="bp-snd" class="bp-toggle-btn">Search & Destroy</button>
        </div>

        <label class="bp-label">Team</label>
        <select id="bp-team">
            <option value="">Any</option>
            ${Object.keys(teams)
                .map(t => `<option value="${t}">${cap(t)}</option>`)
                .join("")}
        </select>

        <label class="bp-label">Opponent</label>
        <select id="bp-opp">
            <option value="">Any</option>
            ${Object.keys(teams)
                .map(t => `<option value="${t}">${cap(t)}</option>`)
                .join("")}
        </select>

        <label class="bp-label">Map</label>
        <select id="bp-map">
            ${modeMaps["hp"]
                .map(m => `<option value="${m}">${m}</option>`)
                .join("")}
        </select>

        <label class="bp-label">Kill Line</label>
        <input id="bp-line" type="number" placeholder="Ex: 24">

        <button id="bp-run" class="bp-run-btn">RUN</button>

        <div id="bp-results" class="bp-results"></div>

    </div>`;

    // Mode toggles
    document.getElementById("bp-hp").onclick = () => {
        document.getElementById("bp-hp").classList.add("active");
        document.getElementById("bp-snd").classList.remove("active");
        setBPMODE("hp", modeMaps);
    };
    document.getElementById("bp-snd").onclick = () => {
        document.getElementById("bp-snd").classList.add("active");
        document.getElementById("bp-hp").classList.remove("active");
        setBPMODE("snd", modeMaps);
    };

    // Run Best Picks
    document.getElementById("bp-run").onclick = () => {
        const team = document.getElementById("bp-team").value.trim();
        const opp  = document.getElementById("bp-opp").value.trim();
        const map  = document.getElementById("bp-map").value.trim();
        const line = Number(document.getElementById("bp-line").value || 0);

        document.getElementById("bp-results").innerHTML =
            runBestPicks(matches, teams, { team, opp, map, line });
    };
}

// ============================================================
// MAIN BEST PICKS ENGINE (HP V5A + SND)
// ============================================================
function runBestPicks(matches, teams, q) {

    const { team, opp, map, line } = q;
    let rows = [];

    Object.keys(teams).forEach(t => {

        if (team && t !== team) return;

        teams[t].forEach(player => {

            // ---------------------------------------
            // Filter matches belonging to this player
            // ---------------------------------------
            const pm = matches.filter(m =>
                m.team === t &&
                m.player === player &&
                m.map === map &&
                m.mode === BP_MODE &&
                (opp === "" || m.opponent === opp)
            );

            if (pm.length === 0) return;

            // Auto-detect opponent if "Any"
            const opponent =
                opp ||
                pm[pm.length - 1].opponent ||
                "";

            if (!opponent) return;

            let exp, prob;

            // =======================================================
            // ⭐ HARDPOINT ENGINE V5A — RECENCY + DEFENSE-CONTROLLED
            // =======================================================
            if (BP_MODE === "hp") {

                exp = expectedHPKills(matches, t, player, map, opponent);

                prob = probOverHP(matches, t, player, map, opponent, line);

            } else {

                // =======================================================
                // ⭐ SND ENGINE (Unchanged)
                // =======================================================
                exp = expectedSNDKills(matches, t, player, map, opponent);

                prob = poissonOverSND(
                    exp.raw,
                    line,
                    exp.alpha
                );
            }

            const expected = exp.raw;
            const probPct = prob * 100;

            rows.push({
                player,
                team: t,
                expected,
                diff: expected - line,
                prob: probPct
            });
        });
    });

    if (rows.length === 0)
        return `<p>No matching matches found for these filters.</p>`;

    // Sort by probability descending
    rows.sort((a, b) => b.prob - a.prob);

    // ------------------------------------------------------------
    // Build results table
    // ------------------------------------------------------------
    let html = `
    <table class="bp-table">
        <tr>
            <th>PLAYER</th>
            <th>EXPECTED</th>
            <th>LINE</th>
            <th>DIFF</th>
            <th>PROB OVER</th>
        </tr>`;

    rows.forEach(r => {
        const color =
            r.prob >= 60 ? "#2ecc71" :
            r.prob >= 40 ? "#f1c40f" :
            "#e74c3c";

        html += `
        <tr>
            <td>${cap(r.player)} (${cap(r.team)})</td>
            <td>${r.expected.toFixed(2)}</td>
            <td>${line.toFixed(1)}</td>
            <td>${r.diff.toFixed(2)}</td>
            <td style="color:${color}">${r.prob.toFixed(1)}%</td>
        </tr>`;
    });

    html += `</table>`;
    return html;
}
