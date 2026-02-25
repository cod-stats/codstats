// ============================================================
// HELPER: LOAD JSON FILE
// ============================================================
async function loadJSON(path) {
    try {
        const res = await fetch(path, { cache: "no-cache" });
        if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error("loadJSON ERROR:", err);
        return null;
    }
}

// ============================================================
// HELPER: COMPUTE MATCH DURATION (in seconds)
// ============================================================
function computeDuration(start, end) {
    try {
        const s = new Date(start);
        const e = new Date(end);
        if (isNaN(s) || isNaN(e)) return null;
        return Math.floor((e - s) / 1000);
    } catch {
        return null;
    }
}

// ============================================================
// FIND TEAM KEY BY NAME
// ============================================================
function getTeamKeyByName(name, teams) {
    for (const key in teams) {
        if (teams[key].name.toLowerCase() === name.toLowerCase()) {
            return key;
        }
    }
    return null;
}

// ============================================================
// INSERT NEXT MATCHES SECTION
// ============================================================
function insertNextMatchesContainer() {

    if (document.getElementById("next-matches")) return;

    const container = document.createElement("div");
    container.id = "next-matches";
    container.className = "next-matches";

    container.innerHTML = `
        <h2 class="next-matches-title">Next Matches:</h2>
        <div id="next-matches-grid" class="next-matches-grid"></div>
    `;

    const firstTabContent = document.querySelector(".tab-content");
    if (firstTabContent) {
        firstTabContent.parentNode.insertBefore(container, firstTabContent);
    }
}

// ============================================================
// BUILD NEXT MATCHES
// ============================================================
function buildNextMatches(upcomingMatches, teams) {
    const grid = document.getElementById("next-matches-grid");
    if (!grid) return;

    grid.innerHTML = "";

    if (!upcomingMatches || !upcomingMatches.length) {
        grid.innerHTML = `<div style="color:#aaa;">No upcoming matches</div>`;
        return;
    }

    upcomingMatches.slice(0, 8).forEach(match => {

        const nameA = match.teamA;
        const nameB = match.teamB;

        let keyA = null, keyB = null;
        for (const key in teams) {
            if (teams[key].name.toLowerCase() === nameA.toLowerCase()) keyA = key;
            if (teams[key].name.toLowerCase() === nameB.toLowerCase()) keyB = key;
        }

        keyA = keyA || nameA.toLowerCase().replace(/\s+/g, "");
        keyB = keyB || nameB.toLowerCase().replace(/\s+/g, "");

        const logoA_webp = `test1/logos/${keyA}.webp`;
        const logoA_png  = `test1/logos/${keyA}.png`;
        const logoB_webp = `test1/logos/${keyB}.webp`;
        const logoB_png  = `test1/logos/${keyB}.png`;

        const card = document.createElement("div");
        card.className = "next-match-card";

        card.innerHTML = `
            <div class="next-team-wrapper">
                <div class="next-team">
                    <img src="${logoA_webp}" 
                         onerror="this.onerror=null;this.src='${logoA_png}'" 
                         alt="${nameA}" />
                    <span>${nameA}</span>
                </div>

                <div class="next-vs">VS</div>

                <div class="next-team">
                    <img src="${logoB_webp}" 
                         onerror="this.onerror=null;this.src='${logoB_png}'" 
                         alt="${nameB}" />
                    <span>${nameB}</span>
                </div>
            </div>
        `;

        grid.appendChild(card);
    });
}

// ============================================================
// POPULATE TEAM DROPDOWNS
// ============================================================
function populateTeamDropdowns(teams) {
    const teamASelect = document.getElementById("teamA-select");
    const teamBSelect = document.getElementById("teamB-select");

    if (!teamASelect || !teamBSelect) return;

    Object.entries(teams).forEach(([key, team]) => {
        const k = key.toLowerCase();

        const optionA = document.createElement("option");
        optionA.value = k;
        optionA.textContent = team.name;
        teamASelect.appendChild(optionA);

        const optionB = document.createElement("option");
        optionB.value = k;
        optionB.textContent = team.name;
        teamBSelect.appendChild(optionB);
    });
}

// ============================================================
// TAB HEADER UI
// ============================================================
function initTabHeaderUI() {
    const tabs = document.querySelectorAll(".tab");
    const contents = document.querySelectorAll(".tab-content");
    const underline = document.getElementById("tab-underline");
    const bar = document.querySelector(".tab-bar");

    function activate(name) {
        tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === name));

        contents.forEach(c => {
            if (c.id === "tab-" + name) {
                c.classList.add("activeTab");
                void c.offsetWidth;
            } else {
                c.classList.remove("activeTab");
            }
        });

        const active = document.querySelector(".tab.active");
        if (active && underline) {
            const r = active.getBoundingClientRect();
            const pr = bar.getBoundingClientRect();
            underline.style.width = r.width + "px";
            underline.style.left = (r.left - pr.left) + "px";

            const offset = (r.left - pr.left) - (bar.clientWidth / 2 - r.width / 2);
            bar.scrollBy({ left: offset, behavior: "smooth" });
        }
    }

    tabs.forEach(t => t.addEventListener("click", () => activate(t.dataset.tab)));

    if (tabs.length) activate(tabs[0].dataset.tab);
}

// ============================================================
// INIT SYSTEM — UPDATED (NO scores.json)
// ============================================================
async function initPage() {
    try {

        const matches  = await loadJSON("test1/matches.json");
        const config   = await loadJSON("test1/TeamModes.json");
        const mapVetos = await loadJSON("test1/mapvetos.json");

        if (!matches || !config || !mapVetos) {
            throw new Error("Failed to load required JSON files.");
        }

        window.DYNAMIC_MATCHES  = matches;
        window.DYNAMIC_TEAMS    = config.teams;
        window.DYNAMIC_MODEMAPS = config.modes;
        window.matchData        = matches;

        // Compute duration if missing
        matches.forEach(m => {
            if (!m.durationSec || m.durationSec <= 0) {
                if (m.start && m.end) {
                    const d = computeDuration(m.start, m.end);
                    m.durationSec = d || 300;
                } else {
                    m.durationSec = 300;
                }
            }

            m.teamA_full = config.teams[m.teamA] || { name: m.teamA, players: [] };
            m.teamB_full = config.teams[m.teamB] || { name: m.teamB, players: [] };
        });

        // BUILD TABS (no scores passed anymore)
        buildModeTabs(config.teams, config.modes, matches);
        buildLast5Tabs(matches, config.teams, config.modes);
        buildMatchesTabs(matches, config.teams, config.modes);

        // Normalize mapVetos
        const normalizedMapVetos = {};
        Object.entries(mapVetos).forEach(([key, value]) => {
            const [a, b] = key.split(":");
            normalizedMapVetos[`${a.toLowerCase()}:${b.toLowerCase()}`] = value;
        });

        window.DYNAMIC_MAPVETOS = normalizedMapVetos;

        populateTeamDropdowns(config.teams);

        loadVetos(
            window.DYNAMIC_MAPVETOS,
            config.teams,
            matches,
            config.modes
        );

        insertNextMatchesContainer();
        buildNextMatches(config.upcomingMatches || [], config.teams);

        initTabHeaderUI();

        console.log("%c✔ INIT COMPLETE", "color: #33ff33; font-size:16px;");

    } catch (err) {
        console.error("INIT ERROR:", err);
        alert("Error loading JSON data. Check console.");
    }
}

// ============================================================
// START INIT
// ============================================================
window.addEventListener("DOMContentLoaded", initPage);