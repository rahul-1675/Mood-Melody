/**
 * MoodMelody — Real-Time Preference Learning & Interaction Event Logger
 * Updates user profile vectors and logs a lightweight interaction event
 * so the analytics engine can compute real metrics.
 */

import { UserProfileManager } from './userProfile.js';
import { logEvent } from './analytics.js';

export function handleUserFeedback(item, type = 'movie', action = 'like', aiResult = null) {
    if (!item) return;

    if (type === 'movie') {
        UserProfileManager.recordMovieInteraction(item, action);
    }

    // Log a lightweight interaction event for real analytics computation.
    // Only store the reference ID, not the full item object.
    logEvent({
        itemId:          item.id,
        itemType:        type,
        interactionType: action,
        mood:            aiResult?.primaryMood || null,
        language:        item.language || null,
        position:        null // position can be set by the caller if known
    });

    console.info(`[MoodMelody] ${action.toUpperCase()} on ${type}: "${item.title}"`);
}
