/**
 * MoodMelody - User Profile Memory Module
 * Manages privacy-first user vector profile stored in browser localStorage.
 */

import { StorageManager } from '../utils/storage.js';

export class UserProfileManager {
    static getProfile() {
        return StorageManager.getUserProfile();
    }

    static updateLanguagePreference(lang, delta = 0.1) {
        const profile = this.getProfile();
        if (!profile.preferredLanguages) profile.preferredLanguages = {};
        const curr = profile.preferredLanguages[lang] || 0.33;
        profile.preferredLanguages[lang] = Math.min(1.0, Math.max(0.1, curr + delta));
        StorageManager.saveUserProfile(profile);
    }

    static updateGenrePreference(genres, delta = 0.15) {
        if (!genres || !Array.isArray(genres)) return;
        const profile = this.getProfile();
        if (!profile.favoriteGenres) profile.favoriteGenres = {};
        genres.forEach(g => {
            const curr = profile.favoriteGenres[g] || 0.5;
            profile.favoriteGenres[g] = Math.min(1.0, Math.max(0.0, curr + delta));
        });
        StorageManager.saveUserProfile(profile);
    }

    static recordMovieInteraction(movie, actionType) {
        const profile = this.getProfile();
        profile.totalInteractions = (profile.totalInteractions || 0) + 1;

        if (actionType === 'like') {
            profile.positiveInteractions = (profile.positiveInteractions || 0) + 1;
            if (!profile.likedMovies.includes(movie.id)) profile.likedMovies.push(movie.id);
            // Remove from disliked if present
            profile.dislikedMovies = profile.dislikedMovies.filter(id => id !== movie.id);

            this.updateLanguagePreference(movie.language, 0.15);
            this.updateGenrePreference(movie.genres, 0.15);
        } else if (actionType === 'dislike') {
            if (!profile.dislikedMovies.includes(movie.id)) profile.dislikedMovies.push(movie.id);
            profile.likedMovies = profile.likedMovies.filter(id => id !== movie.id);

            this.updateGenrePreference(movie.genres, -0.20);
        } else if (actionType === 'save') {
            profile.positiveInteractions = (profile.positiveInteractions || 0) + 1;
            if (!profile.savedMovies.includes(movie.id)) profile.savedMovies.push(movie.id);

            this.updateGenrePreference(movie.genres, 0.10);
        }

        StorageManager.saveUserProfile(profile);
        StorageManager.logInteraction({ itemId: movie.id, title: movie.title, type: 'movie', action: actionType });
    }
}
