/**
 * MoodMelody - Local Storage Manager
 * Handles privacy-first persistence for user profiles, interaction logs, mood history, and metrics.
 */

const STORAGE_KEYS = {
    USER_PROFILE: 'mm_user_profile',
    MOOD_HISTORY: 'mm_mood_history',
    INTERACTION_LOG: 'mm_interaction_log',
    FAVORITE_SONGS: 'mm_favorite_songs',
    FAVORITE_MOVIES: 'mm_favorite_movies',
    SAVED_PLAYLISTS: 'mm_saved_playlists',
    METRICS: 'mm_analytics_metrics'
};

const DEFAULT_PROFILE = {
    preferredLanguages: { English: 0.33, Hindi: 0.33, Telugu: 0.34 },
    favoriteGenres: {
        Action: 0.5, Drama: 0.5, Comedy: 0.5, Romance: 0.5,
        Thriller: 0.5, SciFi: 0.5, Animation: 0.5, FeelGood: 0.5
    },
    likedMovies: [],
    dislikedMovies: [],
    savedMovies: [],
    watchedMovies: [],
    likedSongs: [],
    dislikedSongs: [],
    totalInteractions: 0,
    positiveInteractions: 0
};

export const StorageManager = {
    getUserProfile() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
            if (!data) return { ...DEFAULT_PROFILE };
            const parsed = JSON.parse(data);
            return { ...DEFAULT_PROFILE, ...parsed };
        } catch (e) {
            console.warn("StorageManager: Failed to read user profile, returning default.", e);
            return { ...DEFAULT_PROFILE };
        }
    },

    saveUserProfile(profile) {
        try {
            localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
        } catch (e) {
            console.error("StorageManager: Error saving user profile", e);
        }
    },

    getMoodHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.MOOD_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    addMoodHistoryEntry(entry) {
        try {
            const history = this.getMoodHistory();
            history.unshift({
                id: 'mh_' + Date.now(),
                timestamp: new Date().toISOString(),
                ...entry
            });
            // Keep top 100 entries
            const trimmed = history.slice(0, 100);
            localStorage.setItem(STORAGE_KEYS.MOOD_HISTORY, JSON.stringify(trimmed));
        } catch (e) {
            console.error("StorageManager: Error adding mood history", e);
        }
    },

    getInteractionLog() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.INTERACTION_LOG);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    logInteraction(interaction) {
        try {
            const logs = this.getInteractionLog();
            logs.unshift({
                id: 'int_' + Date.now(),
                timestamp: new Date().toISOString(),
                ...interaction
            });
            localStorage.setItem(STORAGE_KEYS.INTERACTION_LOG, JSON.stringify(logs.slice(0, 300)));
        } catch (e) {
            console.error("StorageManager: Error logging interaction", e);
        }
    },

    getFavorites(type = 'movies') {
        const key = type === 'songs' ? STORAGE_KEYS.FAVORITE_SONGS : STORAGE_KEYS.FAVORITE_MOVIES;
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    toggleFavoriteItem(item, type = 'movies') {
        const key = type === 'songs' ? STORAGE_KEYS.FAVORITE_SONGS : STORAGE_KEYS.FAVORITE_MOVIES;
        const favs = this.getFavorites(type);
        const index = favs.findIndex(f => f.id === item.id);
        let isSaved = false;
        if (index >= 0) {
            favs.splice(index, 1);
            isSaved = false;
        } else {
            favs.unshift(item);
            isSaved = true;
        }
        localStorage.setItem(key, JSON.stringify(favs));
        return isSaved;
    }
};
