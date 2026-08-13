/**
 * MoodMelody - Mood Journey UI Renderer
 * Visualizes user mood history timeline, dominant mood distribution, and engagement stats.
 */

import { StorageManager } from '../utils/storage.js';
import { formatTimeAgo } from '../utils/helpers.js';

const MOOD_EMOJIS = {
    happiness: '😊', sadness: '😔', relaxed: '😌', motivated: '🔥',
    love: '❤️', anger: '😡', fear: '😨', disgust: '🤢', surprise: '😲', neutral: '😐'
};

const MOOD_COLORS = {
    happiness: '#FFD700', sadness: '#5B8DEF', relaxed: '#5BCFA2', motivated: '#FF6B35',
    love: '#FF4B6E', anger: '#FF3B30', fear: '#9B59B6', disgust: '#8BC34A', surprise: '#FF9800'
};

export function renderMoodJourney(container) {
    if (!container) return;

    const history = StorageManager.getMoodHistory();
    const interactions = StorageManager.getInteractionLog();
    const profile = StorageManager.getUserProfile();

    // Compute mood frequency distribution
    const moodFreq = {};
    history.forEach(entry => {
        if (entry.mood) {
            moodFreq[entry.mood] = (moodFreq[entry.mood] || 0) + 1;
        }
    });

    const totalEntries = history.length;
    const dominantMood = Object.entries(moodFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || 'relaxed';

    // Top genres from user profile
    const topGenres = Object.entries(profile.favoriteGenres || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4);

    // Top languages
    const topLangs = Object.entries(profile.preferredLanguages || {})
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    container.innerHTML = `
        <div class="journey-page">
            <div class="journey-hero">
                <p class="eyebrow">• AI MOOD ANALYTICS</p>
                <h2 class="journey-title">Your Mood <span class="accent-font" style="color: var(--accent);">Journey</span></h2>
                <p style="color: var(--text-dim); font-size: 0.9rem; margin-top: 6px;">
                    AI-tracked emotional patterns & personalized insights across ${totalEntries} mood sessions.
                </p>
            </div>

            <div class="journey-stats-grid">
                <div class="journey-stat-card">
                    <span class="stat-icon">${MOOD_EMOJIS[dominantMood] || '😊'}</span>
                    <div>
                        <div class="stat-label">Dominant Mood</div>
                        <div class="stat-value">${dominantMood.charAt(0).toUpperCase() + dominantMood.slice(1)}</div>
                    </div>
                </div>
                <div class="journey-stat-card">
                    <span class="stat-icon">📊</span>
                    <div>
                        <div class="stat-label">Mood Sessions</div>
                        <div class="stat-value">${totalEntries}</div>
                    </div>
                </div>
                <div class="journey-stat-card">
                    <span class="stat-icon">🎬</span>
                    <div>
                        <div class="stat-label">Interactions</div>
                        <div class="stat-value">${profile.totalInteractions || 0}</div>
                    </div>
                </div>
                <div class="journey-stat-card">
                    <span class="stat-icon">❤️</span>
                    <div>
                        <div class="stat-label">Liked Items</div>
                        <div class="stat-value">${(profile.likedMovies?.length || 0) + (profile.likedSongs?.length || 0)}</div>
                    </div>
                </div>
            </div>

            ${Object.keys(moodFreq).length > 0 ? `
            <div class="journey-section">
                <h3 class="section-heading">Mood Distribution</h3>
                <div class="mood-bars">
                    ${Object.entries(moodFreq)
                        .sort((a, b) => b[1] - a[1])
                        .map(([mood, count]) => {
                            const pct = Math.round((count / totalEntries) * 100);
                            const color = MOOD_COLORS[mood] || '#888';
                            return `
                            <div class="mood-bar-row">
                                <span class="mood-bar-label">${MOOD_EMOJIS[mood] || '•'} ${mood.charAt(0).toUpperCase() + mood.slice(1)}</span>
                                <div class="mood-bar-track">
                                    <div class="mood-bar-fill" style="width: ${pct}%; background: ${color};"></div>
                                </div>
                                <span class="mood-bar-pct">${pct}%</span>
                            </div>`;
                        }).join('')}
                </div>
            </div>
            ` : ''}

            ${topGenres.length > 0 ? `
            <div class="journey-section">
                <h3 class="section-heading">Your Genre Preferences</h3>
                <div class="pref-pills">
                    ${topGenres.map(([genre, weight]) => `
                        <span class="pref-pill" style="--pct: ${Math.round(weight * 100)}%">
                            ${genre} <em>${Math.round(weight * 100)}%</em>
                        </span>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            ${topLangs.length > 0 ? `
            <div class="journey-section">
                <h3 class="section-heading">Language Preferences</h3>
                <div class="pref-pills">
                    ${topLangs.map(([lang, weight]) => `
                        <span class="pref-pill lang" style="--pct: ${Math.round(weight * 100)}%">
                            🌐 ${lang} <em>${Math.round(weight * 100)}%</em>
                        </span>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="journey-section">
                <h3 class="section-heading">Recent Mood Timeline</h3>
                ${history.length === 0 ? `
                    <p style="color: var(--text-dim); font-size: 0.9rem;">
                        No mood sessions yet. Type how you feel on the Home page to begin tracking.
                    </p>
                ` : `
                    <div class="mood-timeline">
                        ${history.slice(0, 10).map(entry => `
                            <div class="timeline-entry">
                                <span class="timeline-emoji">${MOOD_EMOJIS[entry.mood] || '•'}</span>
                                <div class="timeline-content">
                                    <span class="timeline-mood">${(entry.mood || 'neutral').charAt(0).toUpperCase() + (entry.mood || 'neutral').slice(1)}</span>
                                    <span class="timeline-meta">${entry.intensity ? Math.round(entry.intensity * 100) + '% intensity' : ''} • ${entry.language || 'English'}</span>
                                    ${entry.rawText ? `<span class="timeline-text">"${entry.rawText.slice(0, 60)}${entry.rawText.length > 60 ? '...' : ''}"</span>` : ''}
                                </div>
                                <span class="timeline-time">${formatTimeAgo(entry.timestamp)}</span>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}
