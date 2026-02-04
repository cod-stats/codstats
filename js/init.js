// ============================================================
// INIT SYSTEM — MAIN ENTRY POINT
// ============================================================

async function initPage() {
    try {
        // ========================================
        // Load all JSON (cache-busted)
        // ========================================
        const scores   = await loadJSON("test1/scores.json");
        const matches  = await loadJSON("test1/matches.json");
        const teams    = await loadJSON("test1/teams.json");
        const modes    = await loadJSON("test1/modes.json");
        const mapVetos = await loadJSON("test1/mapvetos.json");

        // Attach to globals for debugging
        window.DYNAMIC_SCORES   = scores;
        window.DYNAMIC_MATCHES  = matches;
        window.DYNAMIC_TEAMS    = teams;
        window.DYNAMIC_MODEMAPS = modes;

        // ========================================
        // Compute durationSec if missing
        // ========================================
        matches.forEach(m => {
            if (!m.durationSec || m.durationSec <= 0) {
                if (m.start && m.end) {
                    const d = computeDuration(m.start, m.end);
                    if (d) m.durationSec = d;
                }
                if (!m.durationSec) m.durationSec = 300;
            }

            // Enrich matches with full team data
            m.teamA_full = teams[m.teamA] || { name: m.teamA, players: [] };
            m.teamB_full = teams[m.teamB] || { name: m.teamB, players: [] };
        });

        // ========================================
        // BUILD UI TABS
        // ========================================
        buildModeTabs(scores, teams, modes);
        buildLast5Tabs(scores, matches, teams, modes);
        buildMatchesTabs(matches, teams, modes);

        // ========================================
        // Normalize mapVetos keys (all lowercase)
        // ========================================
        const normalizedMapVetos = {};
        Object.entries(mapVetos).forEach(([key, value]) => {
            const [a, b] = key.split(":");
            normalizedMapVetos[`${a.toLowerCase()}:${b.toLowerCase()}`] = value;
        });
        window.DYNAMIC_MAPVETOS = normalizedMapVetos;

        // ========================================
        // Populate team dropdowns for veto tab
        // ========================================
        populateTeamDropdowns(window.DYNAMIC_TEAMS);

        // ========================================
        // Load vetos tab (handles its own button click)
        // ========================================
        loadVetos(
            window.DYNAMIC_MAPVETOS,
            window.DYNAMIC_TEAMS,
            window.DYNAMIC_MATCHES,
            window.DYNAMIC_MODEMAPS
        );

        // ========================================
        // Activate tab underline + tab switching
        // ========================================
        initTabHeaderUI();

        console.log("%c✔ INIT COMPLETE", "color: #33ff33; font-size:16px;");
    }
    catch (err) {
        console.error("INIT ERROR:", err);
        alert("Error loading JSON data. Check console.");
    }
}

// ============================================================
// TAB HEADER UI — underline animation + switching
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
                void c.offsetWidth; // force reflow
            } else {
                c.classList.remove("activeTab");
            }
        });

        const active = document.querySelector(".tab.active");
        if (active) {
            const r = active.getBoundingClientRect();
            const pr = bar.getBoundingClientRect();

            underline.style.width = r.width + "px";
            underline.style.left = (r.left - pr.left) + "px";

            const offset = (r.left - pr.left) - (bar.clientWidth / 2 - r.width / 2);
            bar.scrollBy({ left: offset, behavior: "smooth" });
        }
    }

    tabs.forEach(t => t.addEventListener("click", () => activate(t.dataset.tab)));

    // Initial tab
    activate("modes");
}

function populateTeamDropdowns(teams) {
    const teamASelect = document.getElementById("teamA-select");
    const teamBSelect = document.getElementById("teamB-select");

    if (!teamASelect || !teamBSelect) return;

    Object.entries(teams).forEach(([key, team]) => {
        const optionA = document.createElement("option");
        optionA.value = key.toLowerCase();
        optionA.textContent = team.name;
        teamASelect.appendChild(optionA);

        const optionB = document.createElement("option");
        optionB.value = key.toLowerCase();
        optionB.textContent = team.name;
        teamBSelect.appendChild(optionB);
    });
}
