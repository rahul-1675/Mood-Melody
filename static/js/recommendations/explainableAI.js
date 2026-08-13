/**
 * MoodMelody - Explainable AI Module
 * Generates dynamic, transparent explanations for why each movie or song was recommended.
 */

export function generateExplanation(item, aiResult, userProfile) {
    if (!item) return [];

    const explanations = [];
    const scores = item.scores || {};
    const primaryMood = (aiResult?.primaryMood || 'relaxed').toUpperCase();
    const detectedLang = aiResult?.language || 'English';

    // 1. Mood Vector Match Explanation
    if (item.matchPercentage && item.matchPercentage >= 80) {
        explanations.push(`✨ <strong>${item.matchPercentage}% Mood Compatibility:</strong> Strongly aligns with your ${primaryMood} emotional frequency.`);
    } else {
        explanations.push(`✨ <strong>Mood Resonance:</strong> Fits your current ${primaryMood} emotional vibe.`);
    }

    // 2. Language Preference Explanation
    if (item.language === detectedLang) {
        explanations.push(`🌐 <strong>Language Alignment:</strong> Matches detected prompt language (<strong>${item.language}</strong>).`);
    } else if (userProfile?.preferredLanguages?.[item.language] > 0.4) {
        explanations.push(`🌐 <strong>Language Preference:</strong> Recommended based on your frequent <strong>${item.language}</strong> interactions.`);
    }

    // 3. Genre Affinity Explanation
    if (item.genres && Array.isArray(item.genres) && userProfile?.favoriteGenres) {
        const topFavGenre = item.genres.find(g => (userProfile.favoriteGenres[g] || 0) > 0.6);
        if (topFavGenre) {
            explanations.push(`🎬 <strong>Genre Affinity:</strong> You frequently enjoy <strong>${topFavGenre}</strong> movies.`);
        }
    }

    // 4. Rating & Quality Explanation
    if (item.rating && item.rating >= 8.0) {
        explanations.push(`⭐ <strong>Critically Acclaimed:</strong> High rating of <strong>${item.rating}/10</strong> on IMDb.`);
    }

    // 5. Context / Energy Target
    if (aiResult?.energyTarget === 'high' && item.energyLevel === 'High') {
        explanations.push(`🔥 <strong>High Energy:</strong> Perfect match for your high-intensity energy prompt.`);
    } else if (aiResult?.energyTarget === 'low' && item.energyLevel === 'Low') {
        explanations.push(`🌿 <strong>Calming Pace:</strong> Curated for a relaxed, low-energy atmosphere.`);
    }

    return explanations;
}
