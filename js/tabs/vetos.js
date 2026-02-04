// ============================================================
// MAP VETOS — PICK/BAN + WIN RATES
// ============================================================

function norm(v) {
    return String(v).toLowerCase().trim();
}

/* ----------------------------------------
   BUILD VETO STATS
---------------------------------------- */
function buildVetoStats(mapVetos) {
    const stats = {};

    Object.values(mapVetos).forEach(matchups => {
        matchups.forEach(set => {

            ["hp","snd","overload"].forEach(mode => {
                const vetos = set[mode];
                if (!vetos) return;

                vetos.forEach(v => {
                    const team = norm(v.team);
                    const map  = v.map;
                    const type = v.type;

                    if (!stats[team]) stats[team] = {};
                    if (!stats[team][mode]) stats[team][mode] = {};
                    if (!stats[team][mode][map]) {
                        stats[team][mode][map] = { pick: 0, ban: 0 };
                    }

                    stats[team][mode][map][type]++;
                });
            });

        });
    });

    return stats;
}

/* ----------------------------------------
   BUILD MAP WIN RATES
---------------------------------------- */
function buildMapWinRates(matches) {
    const stats = {};

    matches.forEach(m => {
        const team = norm(m.team);
        const mode = norm(m.mode);
        const map  = m.map;

        if (!stats[team]) stats[team] = {};
        if (!stats[team][mode]) stats[team][mode] = {};
        if (!stats[team][mode][map]) {
            stats[team][mode][map] = { wins: 0, losses: 0 };
        }

        if (m.teamScore > m.oppScore)
            stats[team][mode][map].wins++;
        else
            stats[team][mode][map].losses++;
    });

    Object.values(stats).forEach(team =>
        Object.values(team).forEach(mode =>
            Object.values(mode).forEach(map => {
                const total = map.wins + map.losses;
                map.winRate = total
                    ? Math.round((map.wins / total) * 100)
                    : 50;
            })
        )
    );

    return stats;
}

/* ----------------------------------------
   MAIN UI
---------------------------------------- */
function loadVetos(mapVetos, teams, matches, modeMaps) {

    const root = document.getElementById("tab-vetos");
    if (!root) return;

    root.innerHTML = `<div id="vetos-number"></div>`;
    const numberDiv = document.getElementById("vetos-number");

    const vetoStats = buildVetoStats(mapVetos);
    const winRates  = buildMapWinRates(matches);

    function render() {
        numberDiv.innerHTML = `
        <div class="vetos-controls">
            <div class="vetos-selectors">
                <div class="vetos-select">
                    <label>Team A</label>
                    <select id="teamA-number"></select>
                </div>
                <div class="vetos-select">
                    <label>Team B</label>
                    <select id="teamB-number"></select>
                </div>
            </div>

            <div class="vetos-mode-toggles">
                <button data-mode="hp" class="active">HP</button>
                <button data-mode="snd">SND</button>
                <button data-mode="overload">OVERLOAD</button>
            </div>
        </div>

        <div id="vetos-number-output"></div>
        `;

        const teamASelect = document.getElementById("teamA-number");
        const teamBSelect = document.getElementById("teamB-number");
        const output = document.getElementById("vetos-number-output");
        const modeButtons = numberDiv.querySelectorAll(".vetos-mode-toggles button");

        // Populate teams
        Object.entries(teams).forEach(([key, team]) => {
            const k = key.toLowerCase();
            teamASelect.innerHTML += `<option value="${k}">${team.name}</option>`;
            teamBSelect.innerHTML += `<option value="${k}">${team.name}</option>`;
        });

        function renderMode(mode) {

            const tA = teamASelect.value;
            const tB = teamBSelect.value;

            if (!tA || !tB || tA === tB) {
                output.innerHTML = `<p>Select two different teams.</p>`;
                return;
            }

            const mapPool = modeMaps[mode];
            if (!mapPool) {
                output.innerHTML = `<p>No maps for ${mode}</p>`;
                return;
            }

            output.innerHTML = "";

            // Header
            const header = document.createElement("div");
            header.className = "veto-row header";
            header.innerHTML = `
                <div class="team-column">
                    <img src="test1/logos/${tA}.png" class="team-logo"
                         onerror="this.src='test1/logos/${tA}.webp'">
                    <span>${teams[tA]?.name || tA}</span>
                </div>
                <div class="map-column">MAP</div>
                <div class="team-column">
                    <img src="test1/logos/${tB}.png" class="team-logo"
                         onerror="this.src='test1/logos/${tB}.webp'">
                    <span>${teams[tB]?.name || tB}</span>
                </div>
            `;
            output.appendChild(header);

            // Rows
            mapPool.forEach(map => {

                const picksA = vetoStats?.[tA]?.[mode]?.[map]?.pick || 0;
                const bansA  = vetoStats?.[tA]?.[mode]?.[map]?.ban  || 0;

                const picksB = vetoStats?.[tB]?.[mode]?.[map]?.pick || 0;
                const bansB  = vetoStats?.[tB]?.[mode]?.[map]?.ban  || 0;

                const wrA = winRates?.[tA]?.[mode]?.[map]?.winRate ?? 50;
                const wrB = winRates?.[tB]?.[mode]?.[map]?.winRate ?? 50;

                const row = document.createElement("div");
                row.className = "veto-row";

                row.innerHTML = `
                    <div class="team-column">
                        PICKED: ${picksA}  
                        <div> BANNED: ${bansA} </div>
                        <div class="wr">WinRate: ${wrA}%</div>
                    </div>

                    <div class="map-column">
                        <img src="test1/maps/${map.toLowerCase().replace(/ /g,"_")}.webp"
                             class="map-image">
                        <span>${map}</span>
                    </div>

                    <div class="team-column">
                        PICKED: ${picksB}  
                        <div> BANNED: ${bansB} </div>
                        <div class="wr">WinRate: ${wrB}%</div>
                    </div>
                `;

                output.appendChild(row);
            });
        }

        // Default render
        renderMode("hp");

        // Mode toggles
        modeButtons.forEach(btn => {
            btn.onclick = () => {
                modeButtons.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                renderMode(btn.dataset.mode);
            };
        });

        // Team changes
        teamASelect.onchange = () =>
            renderMode(numberDiv.querySelector(".active").dataset.mode);

        teamBSelect.onchange = () =>
            renderMode(numberDiv.querySelector(".active").dataset.mode);
    }

    render();
}
