/**
 * MoodMelody - Recommendation Engine Config
 * Configurable weights for the hybrid recommendation formula.
 * Enforces high quality over quantity (Max 20 recommendations per request).
 */

export const RECOMMENDATION_CONFIG = {
    // Hybrid scoring formula weights (Sum ≈ 1.00)
    weights: {
        mood: 0.45,           // Mood vector match — dominant signal
        language: 0.10,       // Language preference alignment
        userPreference: 0.15, // Historical genre & item affinity
        genre: 0.05,          // Context genre affinity
        rating: 0.15,         // Item quality/rating (IMDb / Critics) — emphasized for quality
        popularity: 0.05,     // Item popularity
        context: 0.05,        // Situational energy & activity target
        diversity: 0.00       // Post-ranking MMR handles diversity
    },

    // Diversity / MMR penalty coefficient
    mmrLambda: 0.80,       // High relevance priority (0.80 relevance, 0.20 diversity)

    // Minimum rating quality threshold (Quality over quantity!)
    minRatingThreshold: 7.0,

    // Strictly capped recommendation limit per request (Max 20, default 16)
    defaultLimit: 16,
    maxLimit: 20
};
