/**
 * MoodMelody - AI Platform Orchestrator
 * Central entry point that wires together:
 * Mood Detection → Language Detection → Context → Hybrid Ranking → MMR Diversity → Explainable AI → UI
 * 
 * This module is loaded as a module script in index.html and integrates with existing app.js.
 */

import { MoodDetector } from './ai/moodDetector.js';
import { MOVIES_DATA } from './data/movies_data.js';
import { queryBigCatalog, CATALOG_STATS } from './data/bigMovieCatalog.js';
import { HybridRanker } from './recommendations/hybridRanker.js';
import { applyMMR } from './recommendations/diversityEngine.js';
import { findSimilarMovies } from './recommendations/similarityEngine.js';
import { RECOMMENDATION_CONFIG } from './recommendations/config.js';
import { StorageManager } from './utils/storage.js';
import { handleUserFeedback } from './user/preferenceLearning.js';
import { renderMovieCards } from './ui/movieRenderer.js';
import { openMovieDetailsModal } from './ui/detailsModalRenderer.js';
import { renderMoodJourney } from './ui/moodJourneyRenderer.js';
import { renderAnalyticsDashboard } from './ui/analyticsRenderer.js';

// ─── State ───────────────────────────────────────────────────────────────────
let currentAiResult = null;
let currentMovies = [];
let currentMovieLang = 'all';
let activeTab = 'music'; // 'music' | 'movies'

// ─── DOM References ───────────────────────────────────────────────────────────
const movieGrid = document.getElementById('movie-grid');
const moodJourneyContainer = document.getElementById('mood-journey-container');
const analyticsContainer = document.getElementById('analytics-container');
const mediaToggleBtns = document.querySelectorAll('.media-tab-btn');

// ─── Core Pipeline ────────────────────────────────────────────────────────────

/**
 * Main AI pipeline: analyze text → rank movies → apply MMR → render
 */
export function runMoviePipeline(text = '', forcedMood = null) {
    // Step 1: AI Mood & Language Detection
    currentAiResult = text
        ? MoodDetector.analyze(text)
        : (forcedMood ? MoodDetector._getDefaultResult() : MoodDetector._getDefaultResult());

    const MOOD_MAP = {
        happy: 'happiness', sad: 'sadness', calm: 'relaxed', energetic: 'motivated',
        romantic: 'love', angry: 'anger', focused: 'motivated'
    };

    if (forcedMood) {
        const canonical = MOOD_MAP[forcedMood.toLowerCase()] || forcedMood.toLowerCase();
        currentAiResult.primaryMood = canonical;
        const moodVec = currentAiResult.moodVector;
        Object.keys(moodVec).forEach(k => { moodVec[k] = 0.0; });
        moodVec[canonical] = 1.0;
    }

    // Step 2: Log to mood history
    if (text && currentAiResult.primaryMood) {
        StorageManager.addMoodHistoryEntry({
            mood: currentAiResult.primaryMood,
            intensity: currentAiResult.intensity,
            confidence: currentAiResult.confidence,
            language: currentAiResult.language,
            context: currentAiResult.context,
            rawText: text
        });
    }

    // Step 3: Query 500,000 catalog (mood-aware) & apply Hybrid Ranking
    const resolvedMood = currentAiResult.primaryMood || null;
    const catalogPool = queryBigCatalog(50, resolvedMood);
    const ranked = HybridRanker.rankMovies(catalogPool, currentAiResult, 'all');

    // Step 4: MMR Diversity
    const diverse = applyMMR(ranked, RECOMMENDATION_CONFIG.defaultLimit, RECOMMENDATION_CONFIG.mmrLambda);
    currentMovies = diverse;

    // Step 5: Render
    renderMovies();
    updateMoodDisplay();
}

function renderMovies() {
    if (!movieGrid) return;
    if (activeTab !== 'movies') return;

    // Show skeleton loader
    movieGrid.innerHTML = Array(6).fill(`
        <div class="movie-card skeleton-card">
            <div class="skeleton-poster"></div>
            <div class="skeleton-lines">
                <div class="skeleton-line"></div>
                <div class="skeleton-line short"></div>
            </div>
        </div>
    `).join('');

    setTimeout(() => {
        renderMovieCards(
            currentMovies,
            movieGrid,
            currentAiResult,
            (movie) => openMovieDetailsModal(movie, MOVIES_DATA, currentAiResult, (sim) => {
                openMovieDetailsModal(sim, MOVIES_DATA, currentAiResult, null);
            }),
            (item, type, action) => handleUserFeedback(item, type, action)
        );
    }, 300);
}

function updateMoodDisplay() {
    if (!currentAiResult) return;
    const moodLabel = document.getElementById('detected-mood-name');
    const moodDesc = document.getElementById('detected-mood-desc');

    if (moodLabel) {
        moodLabel.textContent = currentAiResult.primaryMood.charAt(0).toUpperCase() + currentAiResult.primaryMood.slice(1);
    }
    if (moodDesc) {
        moodDesc.innerHTML = `
            <span class="mood-meta-chip"><i class="fas fa-brain"></i> ${Math.round(currentAiResult.intensity * 100)}% Intensity</span>
            <span class="mood-meta-chip"><i class="fas fa-check-circle"></i> ${Math.round(currentAiResult.confidence * 100)}% Confidence</span>
            <span class="mood-meta-chip"><i class="fas fa-globe"></i> ${currentAiResult.language}</span>
            ${currentAiResult.context !== 'general' ? `<span class="mood-meta-chip"><i class="fas fa-tag"></i> ${currentAiResult.context}</span>` : ''}
        `;
    }
}

// ─── Media Tab Toggle (Music / Movies) ───────────────────────────────────────
mediaToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        activeTab = tab;

        mediaToggleBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Language filters appear strictly ONLY for Music Soundscape
        const songLangSelector = document.querySelector('.lang-pill-selector');
        if (songLangSelector) {
            songLangSelector.style.display = tab === 'music' ? 'flex' : 'none';
        }

        document.getElementById('song-grid')?.closest('.song-list-section')?.classList.toggle('hidden', tab !== 'music');
        const movieSection = document.getElementById('movie-grid-section');
        if (movieSection) movieSection.classList.toggle('hidden', tab !== 'movies');

        if (tab === 'movies') {
            renderMovies();
        }
    });
});

// ─── Sidebar Navigation for new pages ────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(navItem => {
    navItem.addEventListener('click', () => {
        const page = navItem.getAttribute('data-page');

        if (page === 'journey') {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById('page-journey')?.classList.add('active');
            renderMoodJourney(moodJourneyContainer);
        } else if (page === 'analytics') {
            document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
            document.getElementById('page-analytics')?.classList.add('active');
            renderAnalyticsDashboard(analyticsContainer, currentMovies, currentAiResult);
        }
    });
});

// ─── Expose to global scope for existing app.js integration ──────────────────
window.MoodMelodyAI = {
    runMoviePipeline,
    getCurrentAiResult: () => currentAiResult,
    setActiveTab: (tab) => { activeTab = tab; },
    MOVIES_DATA
};
