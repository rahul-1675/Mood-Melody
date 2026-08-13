/**
 * MoodMelody - Hybrid Recommendation Engine
 * Computes multi-dimensional vector dot product scoring combining:
 * Mood Vector, Language Alignment, User Preferences, Rating, Popularity, Context, and Keyword Relevance.
 * Enforces strict title deduplication to ensure zero repeated titles.
 */

import { RECOMMENDATION_CONFIG } from './config.js';
import { StorageManager } from '../utils/storage.js';

const CANONICAL_MOOD_MAP = {
    'happy': 'happiness',      'happiness': 'happiness',
    'sad': 'sadness',          'sadness': 'sadness',
    'calm': 'relaxed',         'relaxed': 'relaxed',
    'energetic': 'motivated',  'motivated': 'motivated',
    'romantic': 'love',        'love': 'love',
    'angry': 'anger',          'anger': 'anger',
    'focused': 'motivated',    'scared': 'fear',
    'fear': 'fear',            'disgust': 'disgust',
    'surprise': 'surprise',    'excited': 'happiness'
};

function getCanonicalMood(key) {
    if (!key) return 'happiness';
    const lower = String(key).toLowerCase();
    return CANONICAL_MOOD_MAP[lower] || lower;
}

export class HybridRanker {
    /**
     * Rank movies based on AI mood detection result & user profile memory
     */
    static rankMovies(movies, aiResult, selectedLang = 'all') {
        if (!movies || !Array.isArray(movies)) return [];

        const userProfile = StorageManager.getUserProfile();
        const weights = RECOMMENDATION_CONFIG.weights;

        // Normalise the target mood vector to canonical keys
        const rawMoodVector = aiResult.moodVector || {};
        const targetMoodVector = {};
        for (const [k, v] of Object.entries(rawMoodVector)) {
            const canon = getCanonicalMood(k);
            targetMoodVector[canon] = (targetMoodVector[canon] || 0) + v;
        }

        const canonicalPrimary = getCanonicalMood(aiResult.primaryMood);
        const targetPrimaryVal = targetMoodVector[canonicalPrimary] || 0;

        const queryKeywords = aiResult.keywords || [];
        const rawTextLower = (aiResult.rawText || '').toLowerCase();

        const scoredMovies = movies.map(movie => {
            // 1. Mood Vector Similarity (Dot product with canonical key mapping)
            let moodScore = 0.0;
            if (movie.moods) {
                const itemPrimaryVal = movie.moods[canonicalPrimary] !== undefined
                    ? movie.moods[canonicalPrimary]
                    : 0.0;

                // Calculate vector dot product
                for (const [m, targetVal] of Object.entries(targetMoodVector)) {
                    const itemVal = movie.moods[m] !== undefined ? movie.moods[m] : 0.0;
                    moodScore += targetVal * itemVal;
                }

                // Boost score if item strongly aligns with requested mood
                if (itemPrimaryVal >= 0.45) {
                    moodScore = Math.max(moodScore, Math.min(1.0, itemPrimaryVal + 0.15));
                }
            } else if (movie.mood && getCanonicalMood(movie.mood) === canonicalPrimary) {
                moodScore = 0.92;
            }

            // Clamp moodScore to 1.0 max
            moodScore = Math.min(1.0, Math.max(0.0, moodScore));

            // 2. Language Match Score
            let langScore = 0.6;
            const movieLang = (movie.language || '').toLowerCase();
            const aiLang = (aiResult.language || 'English').toLowerCase();
            const filterLang = selectedLang.toLowerCase();

            if (filterLang !== 'all') {
                langScore = movieLang === filterLang ? 1.0 : 0.0;
            } else if (movieLang === aiLang) {
                langScore = 1.0;
            } else {
                langScore = Math.min(1.0, (userProfile.preferredLanguages?.[movie.language] || 0.50) + 0.35);
            }

            // 3. User Preference Score (Genre Affinity + Previous Likes)
            let userPrefScore = 0.7;
            if (movie.genres && Array.isArray(movie.genres)) {
                let genreSum = 0;
                movie.genres.forEach(g => { genreSum += userProfile.favoriteGenres?.[g] || 0.65; });
                userPrefScore = genreSum / movie.genres.length;
            }
            if (userProfile.likedMovies?.includes(movie.id)) userPrefScore += 0.3;
            if (userProfile.dislikedMovies?.includes(movie.id)) userPrefScore -= 0.5;

            // 4. Rating & Quality Score (normalised to 0–1)
            const ratingScore = Math.min(1.0, (movie.rating || 7.8) / 10.0);

            // 5. Popularity Score
            const popScore = Math.min(1.0, (movie.popularity || 70) / 100.0);

            // 6. Context Energy Target Score
            let contextScore = 0.75;
            if (aiResult.energyTarget === 'high' && movie.energyLevel === 'High') contextScore = 1.0;
            if (aiResult.energyTarget === 'low' && movie.energyLevel === 'Low') contextScore = 1.0;
            if (aiResult.energyTarget === 'steady' && movie.energyLevel === 'Medium') contextScore = 1.0;

            // 7. Keyword & Title Direct Relevance Boost
            let keywordBoost = 0.0;
            if (rawTextLower) {
                const titleLower = (movie.title || '').toLowerCase();
                const overviewLower = (movie.overview || '').toLowerCase();
                const castLower = (movie.cast || []).join(' ').toLowerCase();

                if (titleLower.includes(rawTextLower)) keywordBoost += 0.4;
                queryKeywords.forEach(kw => {
                    if (titleLower.includes(kw)) keywordBoost += 0.2;
                    if (overviewLower.includes(kw)) keywordBoost += 0.1;
                    if (castLower.includes(kw)) keywordBoost += 0.1;
                });
                keywordBoost = Math.min(0.5, keywordBoost);
            }

            // 8. Primary Mood Relevancy Guardrail
            let moodMismatchPenalty = 0.0;
            if (canonicalPrimary && movie.moods) {
                const itemPrimaryVal = movie.moods[canonicalPrimary] !== undefined
                    ? movie.moods[canonicalPrimary] : 0;

                if (targetPrimaryVal > 0.5 && itemPrimaryVal < 0.10) {
                    moodMismatchPenalty = -0.25;
                }
            }

            // Final Composite Score
            const rawFinalScore = (
                weights.mood           * moodScore      +
                weights.language       * langScore      +
                weights.userPreference * userPrefScore  +
                weights.rating         * ratingScore    +
                weights.popularity     * popScore       +
                weights.context        * contextScore   +
                keywordBoost                            +
                moodMismatchPenalty
            );

            // Normalised Final Score
            const finalScore = Math.min(1.0, Math.max(0.0, rawFinalScore));

            // High Precision Match Percentage (scaled strictly to 85%–99%)
            const matchPercentage = Math.min(99, Math.max(85, Math.round(85 + finalScore * 14)));

            return {
                ...movie,
                hybridScore: finalScore,
                matchPercentage,
                scores: { moodScore, langScore, userPrefScore, ratingScore, contextScore }
            };
        });

        const minRating = RECOMMENDATION_CONFIG.minRatingThreshold || 7.0;

        // 1. Quality filter (rating >= 7.0 or score >= 0.25)
        // 2. Sort descending by hybridScore
        const sorted = scoredMovies
            .filter(m => (m.rating >= minRating || m.hybridScore >= 0.25))
            .sort((a, b) => b.hybridScore - a.hybridScore);

        // 3. STRICT DEDUPLICATION by movie title (prevents repeating duplicate movies!)
        const seenTitles = new Set();
        const deduplicated = [];

        for (const movie of sorted) {
            const normTitle = (movie.title || '').toLowerCase().trim();
            if (!seenTitles.has(normTitle)) {
                seenTitles.add(normTitle);
                deduplicated.push(movie);
            }
        }

        // Return top N (capped at max 20)
        return deduplicated.slice(0, RECOMMENDATION_CONFIG.maxLimit || 20);
    }
}
