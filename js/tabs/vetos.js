// ============================================================
// MAP VETOS — PICK/BAN + WIN RATES
// ============================================================

function norm(v) {
    return String(v).toLowerCase().trim();
}

// ============================================================
// BUILD VETO STATS
// ============================================================
function buildVetoStats(mapVetos) {

    const stats = {};

    Object.values(mapVetos).forEach(matchups => {

        if (!Array.isArray(matchups)) return;

        matchups.forEach(set => {

            ["hp", "snd", "hijack"].forEach(mode => {

                const vetos = set[mode];

                if (!Array.isArray(vetos)) return;

                vetos.forEach(v => {

                    const team = norm(v.team);
                    const map = v.map;
                    const type = norm(v.type);

                    if (!team || !map) return;

                    if (type !== "pick" && type !== "ban") return;

                    if (!stats[team]) {
                        stats[team] = {};
                    }

                    if (!stats[team][mode]) {
                        stats[team][mode] = {};
                    }

                    if (!stats[team][mode][map]) {
                        stats[team][mode][map] = {
                            pick: 0,
                            ban: 0
                        };
                    }

                    stats[team][mode][map][type]++;
                });
            });
        });
    });

    return stats;
}

// ============================================================
// BUILD OVERALL WIN RATES — TEAM PER MATCH
// ============================================================
function buildOverallWinRates(matches) {

    const stats = {};

    // Track processed match + team combinations
    const counted = new Set();

    matches.forEach(m => {

        const team = norm(m.team);
        const mode = norm(m.mode);
        const map = m.map;

        // Unique key per match and team
        const key = `${m.matchID}_${team}`;

        if (counted.has(key)) return;

        counted.add(key);

        if (!stats[team]) {
            stats[team] = {};
        }

        if (!stats[team][mode]) {
            stats[team][mode] = {};
        }

        if (!stats[team][mode][map]) {
            stats[team][mode][map] = {
                wins: 0,
                losses: 0
            };
        }

        if (Number(m.teamScore) > Number(m.oppScore)) {
            stats[team][mode][map].wins++;
        } else {
            stats[team][mode][map].losses++;
        }
    });

    // Calculate win percentage and W/L record
    Object.values(stats).forEach(team => {

        Object.values(team).forEach(mode => {

            Object.entries(mode).forEach(([mapName, map]) => {

                const total = map.wins + map.losses;

                map.winRate = total
                    ? Math.round((map.wins / total) * 100)
                    : 50;

                map.WL = `${map.wins} - ${map.losses}`;
            });
        });
    });

    return stats;
}
// ============================================================
// MAP VETOS UI
// ============================================================
function loadVetos(mapVetos, teams, matches, modeMaps) {

    const root = document.getElementById("tab-vetos");

    if (!root) return;

    root.innerHTML = `<div id="vetos-number"></div>`;

    const numberDiv = document.getElementById("vetos-number");

    const vetoStats = buildVetoStats(mapVetos);
    const winRates = buildOverallWinRates(matches);

    // ================= TEAM SELECTORS =================
    const teamASelect = document.createElement("select");
    teamASelect.id = "teamA-number";

    const teamBSelect = document.createElement("select");
    teamBSelect.id = "teamB-number";

    const ACTIVE_TEAMS = Object.entries(teams)
        .filter(([_, team]) => team.active);

    ACTIVE_TEAMS.forEach(([key, team]) => {

        const k = key.toLowerCase();

        teamASelect.innerHTML +=
            `<option value="${k}">${team.name}</option>`;

        teamBSelect.innerHTML +=
            `<option value="${k}">${team.name}</option>`;
    });

    numberDiv.innerHTML = `
        <div class="vetos-selectors">

            <div class="vetos-select">
                <label>Team A</label>
            </div>

            <div class="vetos-select">
                <label>Team B</label>
            </div>

        </div>

        <div class="vetos-mode-toggles">

            <button data-mode="hp" class="active">
                HP
            </button>

            <button data-mode="snd">
                SND
            </button>

            <button data-mode="hijack">
                HIJACK
            </button>

        </div>

        <div id="vetos-number-output"></div>
    `;

    numberDiv
        .querySelector(
            ".vetos-selectors .vetos-select:nth-child(1)"
        )
        .appendChild(teamASelect);

    numberDiv
        .querySelector(
            ".vetos-selectors .vetos-select:nth-child(2)"
        )
        .appendChild(teamBSelect);

    const output = document.getElementById("vetos-number-output");

    const modeButtons = numberDiv.querySelectorAll(
        ".vetos-mode-toggles button"
    );

    // ================= RENDER MODE =================
    function renderMode(mode) {

        const tA = teamASelect.value;
        const tB = teamBSelect.value;

        if (!tA || !tB || tA === tB) {

            output.innerHTML =
                `<p>Select two different teams.</p>`;

            return;
        }

        const mapPool = modeMaps[mode];

        if (!Array.isArray(mapPool)) {

            output.innerHTML =
                `<p>No maps found for this mode.</p>`;

            return;
        }

        output.innerHTML = "";

        // ============== HEADER ==============
        const header = document.createElement("div");

        header.className = "veto-row header";

        header.innerHTML = `
            <div class="team-column">

                <img src="logos/${tA}.png"
                     class="team-logo"
                     onerror="this.onerror=null;this.src='logos/${tA}.webp'">

                <span>${teams[tA]?.name || tA}</span>

            </div>

            <div class="map-column">
                MAP
            </div>

            <div class="team-column">

                <img src="logos/${tB}.png"
                     class="team-logo"
                     onerror="this.onerror=null;this.src='logos/${tB}.webp'">

                <span>${teams[tB]?.name || tB}</span>

            </div>
        `;

        output.appendChild(header);

        // ============== MAP ROWS ==============
        mapPool.forEach(map => {

            const picksA =
                vetoStats?.[tA]?.[mode]?.[map]?.pick || 0;

            const bansA =
                vetoStats?.[tA]?.[mode]?.[map]?.ban || 0;

            const picksB =
                vetoStats?.[tB]?.[mode]?.[map]?.pick || 0;

            const bansB =
                vetoStats?.[tB]?.[mode]?.[map]?.ban || 0;

            const sA =
                winRates?.[tA]?.[mode]?.[map] ||
                { WL: "0 - 0", winRate: 50 };

            const sB =
                winRates?.[tB]?.[mode]?.[map] ||
                { WL: "0 - 0", winRate: 50 };

            const cleanMap = map
                .toLowerCase()
                .replace(/\s+/g, "");

            const row = document.createElement("div");

            row.className = "veto-row";

            row.innerHTML = `
                <div class="team-column">

                    <div>PICKED: ${picksA}</div>

                    <div>BANNED: ${bansA}</div>

                    <div>W/L: ${sA.WL}</div>

                    <div class="wr">
                        WinRate: ${sA.winRate}%
                    </div>

                </div>

                <div class="map-column">

                    <img src="maps/${cleanMap}.webp"
                         class="map-image"
                         onerror="this.onerror=null;this.src='maps/${cleanMap}.png'">

                    <span>${map}</span>

                </div>

                <div class="team-column">

                    <div>PICKED: ${picksB}</div>

                    <div>BANNED: ${bansB}</div>

                    <div>W/L: ${sB.WL}</div>

                    <div class="wr">
                        WinRate: ${sB.winRate}%
                    </div>

                </div>
            `;

            output.appendChild(row);
        });
    }

    // ================= DEFAULT RENDER =================
    renderMode("hp");

    // ================= MODE TOGGLES =================
    modeButtons.forEach(btn => {

        btn.onclick = () => {

            modeButtons.forEach(b =>
                b.classList.remove("active")
            );

            btn.classList.add("active");

            renderMode(btn.dataset.mode);
        };
    });

    // ================= TEAM DROPDOWNS =================
    const renderSelectedMode = () => {

        const activeButton = numberDiv.querySelector(
            ".vetos-mode-toggles .active"
        );

        renderMode(activeButton?.dataset.mode || "hp");
    };

    teamASelect.onchange = renderSelectedMode;
    teamBSelect.onchange = renderSelectedMode;
}