// ============================================================
// SND PREDICTION ENGINE — BALANCED VARIANCE VERSION (Option A)
// Realistic probabilities: 15–30% for EXP ~4 on Line 7
// ============================================================

// ----------------------------
// Safe division
// ----------------------------
function safeDiv(a, b) { return b === 0 ? 0 : (a / b); }

// ----------------------------
// Filters
// ----------------------------
function getPlayerSNDMatches(matches, team, player, map, opponent = null) {
    return matches.filter(m =>
        m.mode === "snd" &&
        m.team === team &&
        m.player === player &&
        m.map === map &&
        (!opponent || m.opponent === opponent)
    );
}

// ----------------------------
// Core rates
// ----------------------------
function sndKPR(m)    { return safeDiv(m.reduce((a,x)=>a+x.kills,0),  m.reduce((a,x)=>a+x.duration,0)); }
function sndDPR(m)    { return safeDiv(m.reduce((a,x)=>a+(x.damage||0),0), m.reduce((a,x)=>a+x.duration,0)); }
function sndFBR(m)    { return safeDiv(m.reduce((a,x)=>a+(x.firstBloods||0),0), m.reduce((a,x)=>a+x.duration,0)); }
function sndPlantRate(m){return safeDiv(m.reduce((a,x)=>a+(x.plants||0),0),m.reduce((a,x)=>a+x.duration,0)); }
function sndEngagement(m){return safeDiv(m.reduce((a,x)=>a+(x.kills+x.deaths),0), m.reduce((a,x)=>a+x.duration,0)); }

function sndLeagueDPR(matches) {
    const a = matches.filter(x=>x.mode==="snd");
    return safeDiv(a.reduce((s,x)=>s+(x.damage||0),0), a.reduce((s,x)=>s+x.duration,0));
}

// ----------------------------
// Opponent Defensive Factor
// ----------------------------
function sndOpponentFactor(matches, opponent, map) {
    if (!opponent) return 1.0;

    const arr = matches.filter(m =>
        m.mode === "snd" &&
        m.opponent === opponent &&
        m.map === map
    );

    if (arr.length < 2) return 1.0;

    const dpr = safeDiv(arr.reduce((a,x)=>a+x.deaths,0) / 4,
                        arr.reduce((a,x)=>a+x.duration,0));

    return Math.min(1.20, Math.max(0.80, 1 + (dpr - 0.95) * 0.50));
}

// ----------------------------
// Map Tempo
// ----------------------------
function sndMapTempo(matches, map) {
    const arr = matches.filter(m => m.mode === "snd" && m.map === map);
    if (arr.length === 0) return 1.0;

    let t = 0;
    arr.forEach(m => t += (m.kills + m.deaths) / (m.duration || 1));

    t /= arr.length;
    return Math.min(1.15, Math.max(0.85, t / 1.20));
}

// ----------------------------
// Balanced Map Volatility Scores
// ----------------------------
function sndMapVolatility(map) {
    map = map.toLowerCase();

    if (map === "den") return 0.38;       // slightly volatile
    if (map === "raid") return 0.22;      // structured
    if (map === "express") return 0.20;
    if (map === "colossus") return 0.30;  // mid-high
    if (map === "scar") return 0.26;

    return 0.25;
}

// ----------------------------
// Last 5 boost
// ----------------------------
function sndLast5Boost(matches, team, player, map) {
    const last5 = matches
        .filter(m => m.mode==="snd" && m.team===team && m.player===player && m.map===map)
        .slice(-5);

    if (last5.length === 0) return 1.0;

    let k=0,r=0;
    last5.forEach(m => { k+=m.kills; r+=m.duration; });

    const kpr = safeDiv(k,r);
    return 1 + Math.min(0.12, (kpr - 0.65) * 0.30);
}

// ----------------------------
// Season stability
// ----------------------------
function sndSeasonStability(pm) {
    const n = pm.length;
    if (n <= 3) return 0.58;
    if (n <= 8) return 0.75;
    if (n <= 15) return 0.89;
    return 1.0;
}

// ============================================================
// EXPECTED KILLS (Balanced Version)
// ============================================================
function expectedSNDKills(matches, team, player, map, opponent) {

    const pm = getPlayerSNDMatches(matches, team, player, map, opponent);
    if (pm.length === 0) return { raw: 0, alpha: 1.0 };

    const kpr       = sndKPR(pm);
    const dpr       = sndDPR(pm);
    const fbr       = sndFBR(pm);
    const pr        = sndPlantRate(pm);
    const eng       = sndEngagement(pm);

    const leagueDPR = sndLeagueDPR(matches);
    const tempo     = sndMapTempo(matches, map);
    const oppFactor = sndOpponentFactor(matches, opponent, map);
    const last5     = sndLast5Boost(matches, team, player, map);

    const trust     = sndSeasonStability(pm);
    const mapVol    = sndMapVolatility(map);

    // Base KPR
    const baseKPR =
        (kpr * 0.60) +
        (fbr * 0.25) +
        (pr  * 0.15);

    // Damage-based boost
    const dmgBoost = 0.75 + 0.25 * safeDiv(dpr, leagueDPR);

    // Player avg rounds
    const playerAvgRounds =
        pm.reduce((s,m)=>s+(m.duration||0),0) / pm.length;

    // Hybrid rounds
    const avgRounds = 0.75 * 11 + 0.25 * playerAvgRounds;

    // Expected kills
    let expKills =
        baseKPR *
        tempo *
        oppFactor *
        dmgBoost *
        last5 *
        avgRounds;

    // Trust smoothing
    expKills = expKills * trust + expKills * 0.92 * (1 - trust);

    // ============================================================
    // BALANCED VARIANCE (Option A)
    // α controls tail fatness.
    // Produces realistic 15–30% overs for exp=4, line=7
    // ============================================================
    const alpha =
        0.35 +                // baseline
        0.40 * (1 - trust) +  // early season volatility
        0.55 * eng +          // higher engagement = higher variance
        mapVol * 0.55;        // map volatility

    return {
        raw: expKills,
        alpha: Math.max(0.3, Math.min(alpha, 2.0))
    };
}

// ============================================================
// NEGATIVE BINOMIAL TAIL
// ============================================================
function poissonOverSND(lambda, line, alpha = 1.0) {

    const r = 1 / alpha;
    const threshold = Math.floor(line) + 1;
    let p = 0;

    for (let k = threshold; k <= lambda + 25; k++) {
        const p0 = r / (r + lambda);
        const logCoeff =
            logGamma(k + r) -
            logGamma(k + 1) -
            logGamma(r);

        const logTerm =
            logCoeff +
            r * Math.log(p0) +
            k * Math.log(1 - p0);

        p += Math.exp(logTerm);
    }
    return p;
}

function logGamma(z) {
    return (
        (z - 0.5) * Math.log(z + 4.5) -
        (z + 4.5) +
        0.9189385332046727 +
        (((((( -1/1680 )/(z+4)) + 1/1260)/(z+3) - 1/360)/(z+2) + 1/12)/(z+1))
    );
}
