// ============================================================
// HARDPOINT (HP) — TRUE EV ENGINE V5A (Realistic & Accurate)
// ============================================================

// ----------------------------
// Safe division
// ----------------------------
function safeDiv(a, b) {
    return b === 0 ? 0 : (a / b);
}

// ============================================================
// RECENCY WEIGHTING (Exponential Decay)
// ============================================================
function weightedRecentAverage(values) {
    if (values.length === 0) return 0;

    const decay = 0.70;  // smooth but recency-biased
    let total = 0;
    let weightSum = 0;
    let w = 1;

    for (let i = 0; i < values.length; i++) {
        total += values[i] * w;
        weightSum += w;
        w *= decay;
    }
    return total / weightSum;
}

// ============================================================
// FILTER HELPERS
// ============================================================
function getPlayerHP(matches, team, player, map, opponent = null) {
    return matches.filter(m =>
        m.mode === "hp" &&
        m.team === team &&
        m.player === player &&
        m.map === map &&
        (!opponent || m.opponent === opponent)
    ).sort((a, b) => b.matchID - a.matchID);
}

function getSeasonHP(matches, team, player, map) {
    return matches.filter(m =>
        m.mode === "hp" &&
        m.team === team &&
        m.player === player &&
        m.map === map
    );
}

function getLeagueHP(matches, map) {
    return matches.filter(m =>
        m.mode === "hp" &&
        m.map === map
    );
}

function getOpponentHP(matches, opponent, map) {
    return matches.filter(m =>
        m.mode === "hp" &&
        m.team === opponent &&
        m.map === map
    ).sort((a, b) => b.matchID - a.matchID);
}

// ============================================================
// MAP TEMPO (Kills/sec for that map)
// ============================================================
function mapTempo(matches, map) {
    const mm = getLeagueHP(matches, map);
    let k = 0, s = 0;
    mm.forEach(m => { k += m.kills; s += m.durationSec; });
    return safeDiv(k, s);
}

// ============================================================
// LEAGUE TEMPO
// ============================================================
function leagueTempo(matches) {
    let k = 0, s = 0;
    matches.forEach(m => {
        if (m.mode === "hp") {
            k += m.kills;
            s += m.durationSec;
        }
    });
    return safeDiv(k, s);
}

// ============================================================
// TEAM PACE
// ============================================================
function teamPace(matches, team) {
    const mm = matches.filter(m => m.mode === "hp" && m.team === team);
    if (mm.length === 0) return 1;

    let k = 0, s = 0;
    mm.forEach(m => { k += m.kills; s += m.durationSec; });

    return safeDiv(k, s) / leagueTempo(matches);
}

// ============================================================
// OPPONENT DEFENSE (allowed KPS)
// ============================================================
function opponentDefense(matches, opponent, map) {
    const opp = getOpponentHP(matches, opponent, map).slice(0, 3);
    if (opp.length === 0) return 1.0;

    const vals = opp.map(m =>
        safeDiv(m.deaths / 4, m.durationSec)
    );

    return weightedRecentAverage(vals);
}

// ============================================================
// ROLE FACTOR (Hill Time)
// ============================================================
function roleFactorV5(matches, team, player, map, opponent) {
    const pm = getPlayerHP(matches, team, player, map, opponent);
    if (pm.length === 0) return 1.00;

    let hill = 0;
    pm.forEach(m => hill += m.hillTime || 0);
    const avg = hill / pm.length;

    if (avg <= 20) return 1.07;  // Sub-slayer
    if (avg <= 60) return 1.00;  // Flex
    return 0.96;                 // OBJ
}

// ============================================================
// TRUE MATCHUP DURATION
// ============================================================
function trueDurationV5(matches, team, player, map, opponent) {
    const pm = getPlayerHP(matches, team, player, map, opponent);
    if (pm.length === 0) return 360;

    return pm.reduce((a, m) => a + (m.durationSec || 0), 0) / pm.length;
}

// ============================================================
// PLAYER RECENCY KPS
// ============================================================
function playerKPSWeighted(matches, team, player, map, opponent) {
    const pm = getPlayerHP(matches, team, player, map, opponent);
    const values = pm.map(m => safeDiv(m.kills, m.durationSec));
    return weightedRecentAverage(values);
}

// ============================================================
// SEASON BASELINE KPS
// ============================================================
function playerSeasonKPS(matches, team, player, map) {
    const pm = getSeasonHP(matches, team, player, map);
    const k = pm.reduce((a, m) => a + m.kills, 0);
    const s = pm.reduce((a, m) => a + m.durationSec, 0);
    return safeDiv(k, s);
}

// ============================================================
// MAIN ENGINE — EXPECTED KILLS (V5A)
// ============================================================
function expectedHPKills(matches, team, player, map, opponent) {

    const leagueKPS = leagueTempo(matches);
    const mapKPS = mapTempo(matches, map);
    const pace = teamPace(matches, team);

    let defense = opponentDefense(matches, opponent, map);
    if (!isFinite(defense) || defense <= 0) defense = 1;
    const defenseClamped = Math.max(defense, 0.85); // prevents inflation

    const kps_recent = playerKPSWeighted(matches, team, player, map, opponent);
    const kps_season = playerSeasonKPS(matches, team, player, map);

    const roleF = roleFactorV5(matches, team, player, map, opponent);
    const duration = trueDurationV5(matches, team, player, map, opponent);

    // ---------------------------------------------------------
    // ⭐ V5A BLENDED KPS (realistic, recency-driven, stable)
    // ---------------------------------------------------------
    const blendedKPS =
        0.70 * kps_recent +
        0.20 * kps_season +
        0.07 * mapKPS +
        0.03 * leagueKPS;

    // ---------------------------------------------------------
    // Controlled multipliers — avoid inflation
    // ---------------------------------------------------------
    let expKPS = blendedKPS;

    expKPS *= Math.pow(pace, 0.35);      // soft pace
    expKPS *= 1 / defenseClamped;        // soft defense
    expKPS *= roleF;                     // role modifier

    const expectedKills = expKPS * duration;

    // Variance boost (small & stable)
    const varBoost =
        1 + Math.min(0.12, Math.abs(kps_recent - kps_season) * 3);

    return {
        raw: expectedKills,
        expKPS,
        duration,
        varBoost
    };
}

// ============================================================
// POISSON OVER
// ============================================================
function factorial(n) {
    if (n < 2) return 1;
    let out = 1;
    for (let i = 2; i <= n; i++) out *= i;
    return out;
}

function poissonOver(lambda, line, varBoost = 1.0) {
    const adj = lambda * varBoost;
    const threshold = Math.floor(line) + 1;

    let p = 0;
    for (let k = threshold; k <= adj + 40; k++) {
        p += Math.exp(-adj) * Math.pow(adj, k) / factorial(k);
    }
    return p;
}

// ============================================================
// Wrapper for Best Picks
// ============================================================
function probOverHP(matches, team, player, map, opponent, line) {
    const exp = expectedHPKills(matches, team, player, map, opponent);
    return poissonOver(exp.raw, line, exp.varBoost);
}
