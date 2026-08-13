/**
 * MoodMelody - Content-Based Similarity Engine
 * Calculates Cosine Similarity over item feature vectors (moods, genres, language, director/artist).
 */

export function cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB) return 0.0;
    const keys = Object.keys({ ...vecA, ...vecB });
    let dotProduct = 0.0;
    let normA = 0.0;
    let normB = 0.0;

    keys.forEach(k => {
        const valA = vecA[k] || 0.0;
        const valB = vecB[k] || 0.0;
        dotProduct += valA * valB;
        normA += valA * valA;
        normB += valB * valB;
    });

    if (normA === 0 || normB === 0) return 0.0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function findSimilarMovies(targetMovie, allMovies, limit = 6) {
    if (!targetMovie || !allMovies || !Array.isArray(allMovies)) return [];

    const scored = allMovies
        .filter(m => m.id !== targetMovie.id)
        .map(m => {
            // Mood Vector Cosine Similarity
            const moodSim = cosineSimilarity(targetMovie.moods, m.moods);

            // Genre Jaccard Similarity
            let genreSim = 0.0;
            if (targetMovie.genres && m.genres) {
                const setA = new Set(targetMovie.genres);
                const setB = new Set(m.genres);
                const intersection = new Set([...setA].filter(x => setB.has(x)));
                const union = new Set([...setA, ...setB]);
                genreSim = intersection.size / union.size;
            }

            // Language match
            const langSim = targetMovie.language === m.language ? 1.0 : 0.2;

            // Director match
            const directorSim = targetMovie.director === m.director ? 1.0 : 0.0;

            const compositeSim = (0.45 * moodSim) + (0.35 * genreSim) + (0.15 * langSim) + (0.05 * directorSim);

            return {
                ...m,
                similarityScore: compositeSim,
                matchPercentage: Math.min(99, Math.max(60, Math.round(compositeSim * 100)))
            };
        });

    return scored.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, limit);
}
