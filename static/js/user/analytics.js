/**
 * MoodMelody — Real Interaction Analytics Engine
 *
 * Tracks lightweight user interaction events and computes honest metrics.
 * NEVER seeds or fabricates values. Metrics are only shown when enough
 * real interaction data exists.
 *
 * Data sufficiency thresholds:
 *   0–19   interactions → "Collecting data…"
 *   20–99  interactions → Like Rate, Your Activity counts
 *   100+   interactions → + Precision@10, Hit Rate@10
 *   500+   interactions → + Catalog Coverage
 */

import { StorageManager } from '../utils/storage.js';

// ─── Thresholds ───────────────────────────────────────────────────────────────
export const ANALYTICS_THRESHOLDS = {
    MIN_FOR_BASIC:    20,   // like rate, activity counts
    MIN_FOR_PRECISION: 100, // Precision@10, Hit Rate@10
    MIN_FOR_COVERAGE:  500  // Catalog Coverage
};

// ─── Event Logger ─────────────────────────────────────────────────────────────
/**
 * Record a single lightweight interaction event.
 * Only stores what is needed — references itemId, not the full item object.
 */
export function logEvent({ itemId, itemType, interactionType, mood, language, position = null }) {
    StorageManager.logInteraction({
        itemId,
        itemType,       // 'movie' | 'song'
        interactionType, // 'like' | 'dislike' | 'save' | 'watch' | 'skip' | 'click' | 'impression'
        mood,
        language,
        position        // recommendation rank position (0-indexed)
    });

    // Also update the lightweight counters on the user profile
    const profile = StorageManager.getUserProfile();
    profile.totalInteractions = (profile.totalInteractions || 0) + 1;
    if (['like', 'save', 'watch'].includes(interactionType)) {
        profile.positiveInteractions = (profile.positiveInteractions || 0) + 1;
    }
    StorageManager.saveUserProfile(profile);
}

// ─── Metric Calculations ──────────────────────────────────────────────────────
/**
 * Calculate real metrics from stored interaction logs.
 * Returns metric objects with { value, status } where status is:
 *   'ready'       → has a real value to display
 *   'collecting'  → not enough data yet
 */
export function calculateMetrics(currentRecommendations = [], catalogSize = 15) {
    const profile    = StorageManager.getUserProfile();
    const allLogs    = StorageManager.getInteractionLog();
    const n          = allLogs.length;

    // ── Like Rate ────────────────────────────────────────────────────────────
    let likeRate;
    if (n >= ANALYTICS_THRESHOLDS.MIN_FOR_BASIC) {
        const likes = allLogs.filter(e => ['like', 'save', 'watch'].includes(e.interactionType)).length;
        likeRate = { value: Math.round((likes / n) * 100) + '%', status: 'ready' };
    } else {
        likeRate = { value: null, status: 'collecting' };
    }

    // ── Precision@10 ─────────────────────────────────────────────────────────
    // Fraction of top-10 recommended items that received a positive interaction.
    let precisionAt10;
    if (n >= ANALYTICS_THRESHOLDS.MIN_FOR_PRECISION) {
        const top10 = currentRecommendations.slice(0, 10);
        const likedIds = new Set(profile.likedMovies || []);
        const savedIds = new Set(profile.savedMovies  || []);
        const hits = top10.filter(m => likedIds.has(m.id) || savedIds.has(m.id)).length;
        const k    = top10.length || 10;
        precisionAt10 = { value: Math.round((hits / k) * 100) + '%', status: 'ready' };
    } else {
        precisionAt10 = { value: null, status: 'collecting' };
    }

    // ── Hit Rate@10 ───────────────────────────────────────────────────────────
    // % of recommendation sessions where at least one top-10 item got a positive action.
    let hitRateAt10;
    if (n >= ANALYTICS_THRESHOLDS.MIN_FOR_PRECISION) {
        // Group logs by mood/session (use mood as session key since we have no session ID)
        const sessionMap = {};
        allLogs.forEach(e => {
            const key = e.mood || 'unknown';
            if (!sessionMap[key]) sessionMap[key] = { total: 0, hit: false };
            sessionMap[key].total++;
            if (['like', 'save', 'watch'].includes(e.interactionType)) {
                sessionMap[key].hit = true;
            }
        });
        const sessions  = Object.values(sessionMap);
        const hitSessions = sessions.filter(s => s.hit).length;
        hitRateAt10 = { value: Math.round((hitSessions / Math.max(1, sessions.length)) * 100) + '%', status: 'ready' };
    } else {
        hitRateAt10 = { value: null, status: 'collecting' };
    }

    // ── Catalog Coverage ──────────────────────────────────────────────────────
    let catalogCoverage;
    if (n >= ANALYTICS_THRESHOLDS.MIN_FOR_COVERAGE) {
        const uniqueSeen = new Set(allLogs.map(e => e.itemId)).size;
        catalogCoverage = { value: Math.min(100, Math.round((uniqueSeen / Math.max(1, catalogSize)) * 100)) + '%', status: 'ready' };
    } else {
        catalogCoverage = { value: null, status: 'collecting' };
    }

    // ── User Activity Counts (always real) ────────────────────────────────────
    const activity = {
        totalRecommendations: n,
        liked:    allLogs.filter(e => e.interactionType === 'like').length,
        saved:    allLogs.filter(e => e.interactionType === 'save').length,
        watched:  allLogs.filter(e => e.interactionType === 'watch').length,
        skipped:  allLogs.filter(e => e.interactionType === 'skip').length,
        dominantMood: _dominantValue(allLogs, 'mood'),
        dominantLang: _dominantValue(allLogs, 'language')
    };

    return { likeRate, precisionAt10, hitRateAt10, catalogCoverage, activity, totalInteractions: n };
}

function _dominantValue(logs, field) {
    const freq = {};
    logs.forEach(l => { if (l[field]) freq[l[field]] = (freq[l[field]] || 0) + 1; });
    const entries = Object.entries(freq);
    if (!entries.length) return null;
    return entries.sort((a, b) => b[1] - a[1])[0][0];
}
