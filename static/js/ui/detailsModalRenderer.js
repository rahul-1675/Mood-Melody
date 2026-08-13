/**
 * MoodMelody - Interactive Movie Details Modal
 * Renders backdrop hero, overview, mood compatibility meter, streaming providers,
 * Explainable AI breakdown, and "More Like This" recommendations.
 */

import { generateExplanation } from '../recommendations/explainableAI.js';
import { findSimilarMovies } from '../recommendations/similarityEngine.js';
import { StorageManager } from '../utils/storage.js';
import { FALLBACK_BACKDROP, FALLBACK_POSTER } from '../utils/helpers.js';

export function openMovieDetailsModal(movie, allMovies, aiResult, onSelectSimilar) {
    let modalEl = document.getElementById('movie-details-modal');
    if (!modalEl) {
        modalEl = document.createElement('div');
        modalEl.id = 'movie-details-modal';
        modalEl.className = 'modal-backdrop';
        document.body.appendChild(modalEl);
    }

    const userProfile = StorageManager.getUserProfile();
    const explanation = generateExplanation(movie, aiResult, userProfile);
    const similarMovies = findSimilarMovies(movie, allMovies, 4);

    modalEl.innerHTML = `
        <div class="modal-content movie-details-content">
            <button class="modal-close" id="close-movie-modal">&times;</button>

            <div class="movie-modal-hero" style="background-image: linear-gradient(to bottom, rgba(15,15,26,0.4), rgba(15,15,26,0.95)), url('${movie.backdropUrl || FALLBACK_BACKDROP}');">
                <div class="movie-modal-hero-body">
                    <img src="${movie.posterUrl}" alt="${movie.title}" onerror="this.src='${FALLBACK_POSTER}'" class="modal-poster" />
                    <div class="modal-hero-info">
                        <span class="modal-match-tag">${movie.matchPercentage || 92}% Mood Match</span>
                        <h2>${movie.title} <span class="year-text">(${movie.year})</span></h2>
                        <p class="modal-meta">🌐 <strong>Available In:</strong> ${(movie.availableLanguages || [movie.language]).join(', ')} • ${movie.runtime || '2h 15m'} • ⭐ ${movie.rating}/10</p>
                        <div class="modal-genres">
                            ${(movie.genres || []).map(g => `<span class="modal-genre-pill">${g}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <div class="modal-body-scroll">
                <div class="modal-section">
                    <h3><i class="fas fa-align-left" style="color: var(--accent);"></i> Overview</h3>
                    <p class="movie-overview">${movie.overview}</p>
                </div>

                <div class="modal-section">
                    <h3><i class="fas fa-users" style="color: var(--accent);"></i> Cast & Crew</h3>
                    <p><strong>Director:</strong> ${movie.director || 'N/A'}</p>
                    <p><strong>Starring:</strong> ${(movie.cast || []).join(', ')}</p>
                </div>

                <div class="modal-section explainable-section">
                    <h3><i class="fas fa-brain" style="color: var(--accent);"></i> Why AI Recommended This</h3>
                    <ul class="explainable-list">
                        ${explanation.map(exp => `<li>${exp}</li>`).join('')}
                    </ul>
                </div>

                <div class="modal-section">
                    <h3><i class="fas fa-tv" style="color: var(--accent);"></i> Where to Watch</h3>
                    <div class="streaming-platforms">
                        ${(movie.streamingPlatforms || ['Netflix', 'Amazon Prime Video']).map(p => `
                            <span class="platform-pill"><i class="fas fa-play-circle"></i> ${p}</span>
                        `).join('')}
                        <a href="${movie.tmdbUrl || '#'}" target="_blank" class="tmdb-link"><i class="fas fa-external-link-alt"></i> TMDB Details</a>
                    </div>
                </div>

                ${similarMovies.length > 0 ? `
                    <div class="modal-section">
                        <h3><i class="fas fa-film" style="color: var(--accent);"></i> More Like This</h3>
                        <div class="similar-movies-grid">
                            ${similarMovies.map(sim => `
                                <div class="similar-movie-item" data-id="${sim.id}">
                                    <img src="${sim.posterUrl}" alt="${sim.title}" onerror="this.src='${FALLBACK_POSTER}'" class="similar-poster" />
                                    <span class="similar-title">${sim.title}</span>
                                    <span class="similar-match">${sim.matchPercentage}% Match</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        </div>
    `;

    modalEl.classList.add('active');

    document.getElementById('close-movie-modal')?.addEventListener('click', () => {
        modalEl.classList.remove('active');
    });

    modalEl.querySelectorAll('.similar-movie-item').forEach(item => {
        item.addEventListener('click', () => {
            const simId = item.getAttribute('data-id');
            const targetSim = allMovies.find(m => m.id === simId);
            if (targetSim && onSelectSimilar) {
                modalEl.classList.remove('active');
                onSelectSimilar(targetSim);
            }
        });
    });
}
