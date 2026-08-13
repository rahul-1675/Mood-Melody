/**
 * MoodMelody - UI Movie Card & Grid Renderer
 * Renders responsive movie cards with IMDb rating badges, mood match %, poster fallbacks,
 * Explainable AI tooltips, and feedback action buttons (Like, Save, Details).
 */

import { generateExplanation } from '../recommendations/explainableAI.js';
import { StorageManager } from '../utils/storage.js';
import { FALLBACK_POSTER } from '../utils/helpers.js';

export function renderMovieCards(movies, container, aiResult, onSelectMovie, onFeedback) {
    if (!container) return;
    if (!movies || movies.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">
                <i class="fas fa-film" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                <h3>No movies matched this specific filter.</h3>
                <p>Try switching language filters or typing a broader mood prompt.</p>
            </div>
        `;
        return;
    }

    const userProfile = StorageManager.getUserProfile();
    const favMovies = StorageManager.getFavorites('movies');
    const favIds = new Set(favMovies.map(m => m.id));

    container.innerHTML = movies.map(movie => {
        const isLiked = userProfile.likedMovies?.includes(movie.id) || favIds.has(movie.id);
        const matchPct = movie.matchPercentage || 85;
        const explanation = generateExplanation(movie, aiResult, userProfile);
        const explanationHtml = explanation.map(exp => `<li>${exp}</li>`).join('');

        return `
            <div class="movie-card" data-id="${movie.id}">
                <div class="movie-poster-wrapper">
                    <img src="${movie.posterUrl}" alt="${movie.title}" onerror="this.src='${FALLBACK_POSTER}'" loading="lazy" class="movie-poster" />
                    <span class="match-badge">${matchPct}% Match</span>
                    <span class="rating-badge"><i class="fas fa-star" style="color: #ffd700;"></i> ${movie.rating}</span>
                </div>

                <div class="movie-info">
                    <div class="movie-header-row">
                        <h3 class="movie-title">${movie.title}</h3>
                        <span class="movie-year">${movie.year}</span>
                    </div>

                    <div class="movie-tags">
                        <span class="lang-tag" title="Available Audio Languages"><i class="fas fa-globe" style="font-size: 0.68rem; margin-right: 4px;"></i> ${(movie.availableLanguages || [movie.language]).join(', ')}</span>
                        ${(movie.genres || []).slice(0, 2).map(g => `<span class="genre-tag">${g}</span>`).join('')}
                    </div>

                    <div class="explainable-box" title="Click details for full explanation">
                        <i class="fas fa-brain" style="color: var(--accent); margin-right: 6px;"></i>
                        <span style="font-size: 0.78rem; color: var(--text-dim);">${movie.emotionalTone || movie.genres?.[0]}</span>
                    </div>

                    <div class="movie-card-actions">
                        <button class="btn-movie-action btn-details" data-id="${movie.id}">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                        <button class="btn-movie-action btn-like ${isLiked ? 'active' : ''}" data-id="${movie.id}">
                            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Attach event listeners safely
    container.querySelectorAll('.btn-details').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const target = movies.find(m => m.id === id);
            if (target && onSelectMovie) onSelectMovie(target);
        });
    });

    container.querySelectorAll('.btn-like').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');
            const target = movies.find(m => m.id === id);
            if (target && onFeedback) {
                const isNowLiked = StorageManager.toggleFavoriteItem(target, 'movies');
                btn.classList.toggle('active', isNowLiked);
                btn.querySelector('i').className = isNowLiked ? 'fas fa-heart' : 'far fa-heart';
                onFeedback(target, 'movie', isNowLiked ? 'like' : 'dislike');
            }
        });
    });
}
