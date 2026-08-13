/**
 * MoodMelody - Recommendation Diversity Engine
 * Implements Maximal Marginal Relevance (MMR) to prevent genre/artist clustering.
 * Strictly prevents duplicate movie titles.
 */

import { cosineSimilarity } from './similarityEngine.js';

export function applyMMR(rankedItems, limit = 16, lambda = 0.80) {
    if (!rankedItems || !Array.isArray(rankedItems)) return [];

    // Deduplicate candidate pool by title upfront
    const seenTitles = new Set();
    const uniqueCandidates = [];

    for (const item of rankedItems) {
        const normTitle = (item.title || item.name || '').toLowerCase().trim();
        if (!seenTitles.has(normTitle)) {
            seenTitles.add(normTitle);
            uniqueCandidates.push(item);
        }
    }

    if (uniqueCandidates.length <= limit) return uniqueCandidates;

    const selected = [];
    const candidates = [...uniqueCandidates];

    // Pick the #1 highest ranked item first
    selected.push(candidates.shift());

    while (selected.length < limit && candidates.length > 0) {
        let bestCandidateIdx = 0;
        let maxMMRScore = -Infinity;

        candidates.forEach((cand, i) => {
            // Relevance score from hybrid ranker
            const relScore = cand.hybridScore || 0.5;

            // Compute maximum similarity to any already selected item
            let maxSim = 0.0;
            selected.forEach(sel => {
                let sim = 0.0;
                if (cand.moods && sel.moods) {
                    sim = cosineSimilarity(cand.moods, sel.moods);
                } else if (cand.genres && sel.genres) {
                    const setA = new Set(cand.genres);
                    const setB = new Set(sel.genres);
                    const inter = [...setA].filter(x => setB.has(x));
                    sim = inter.length / Math.max(1, setA.size);
                }
                if (sim > maxSim) maxSim = sim;
            });

            // MMR formula: lambda * Relevance - (1 - lambda) * MaxSimilarity
            const mmrScore = (lambda * relScore) - ((1 - lambda) * maxSim);

            if (mmrScore > maxMMRScore) {
                maxMMRScore = mmrScore;
                bestCandidateIdx = i;
            }
        });

        selected.push(candidates.splice(bestCandidateIdx, 1)[0]);
    }

    return selected;
}
