async function initPage() {
    try {
        // ========================================
        // Load all JSON (cache-busted)
        // ========================================
        const scores   = await loadJSON("test1/scores.json");
        const matches  = await loadJSON("test1/matches.json");
        const config   = await loadJSON("test1/TeamModes.json"); // <-- combined teams+modes
        const mapVetos = await loadJSON("test1/mapvetos.json");

        // Attach to globals for debugging
        window.DYNAMIC_SCORES   = scores;
        window.DYNAMIC_MATCHES  = matches;
        window.DYNAMIC_TEAMS    = config.teams;
        window.DYNAMIC_MODEMAPS = config.modes;

        // ========================================
        // Compute durationSec if missing
        // ========================================
        matches.forEach(m => {
            if (!m.durationSec || m.durationSec <= 0) {
                if (m.start && m.end) {
                    const d = computeDuration(m.start, m.end);
                    m.durationSec = d || 300;
                } else {
                    m.durationSec = 300;
                }
            }

            // Enrich matches with full team data
            m.teamA_full = config.teams[m.teamA] || { name: m.teamA, players: [] };
            m.teamB_full = config.teams[m.teamB] || { name: m.teamB, players: [] };
        });

        // ========================================
        // BUILD UI TABS
        // ========================================
        buildModeTabs(scores, config.teams, config.modes);
        buildLast5Tabs(scores, matches, config.teams, config.modes);
        buildMatchesTabs(matches, config.teams, config.modes);

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
        populateTeamDropdowns(config.teams);

        // ========================================
        // Load vetos tab (handles its own button click)
        // ========================================
        loadVetos(
            window.DYNAMIC_MAPVETOS,
            config.teams,
            matches,
            config.modes
        );

        // ========================================
        // Activate tab underline + tab switching
        // ========================================
        initTabHeaderUI();

        console.log("%c✔ INIT COMPLETE", "color: #33ff33; font-size:16px;");
    } catch (err) {
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
