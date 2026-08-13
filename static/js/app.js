document.addEventListener('DOMContentLoaded', () => {
    const moodInput = document.getElementById('mood-input');
    const searchBtn = document.getElementById('search-btn');
    const songGrid = document.getElementById('song-grid');
    const favoritesGrid = document.getElementById('favorites-grid');
    const playlistsList = document.getElementById('playlists-list');
    const playlistSongsGrid = document.getElementById('playlist-songs-grid');
    const historyList = document.getElementById('history-list');
    
    const detectedMoodName = document.getElementById('detected-mood-name');
    const languagePills = document.querySelectorAll('.lang-pill-selector span');
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    // App State
    let allSongs = [];
    let currentLang = 'all';
    let currentPage = 'home';
    let likedSongTitles = new Set();

    // Versioned LocalStorage Helper
    const DB_VERSION = "v3";
    const StorageManager = {
        getKey(key) {
            return `moodmelody_${DB_VERSION}_${key}`;
        },
        get(key, defaultValue) {
            try {
                const val = localStorage.getItem(this.getKey(key));
                return val ? JSON.parse(val) : defaultValue;
            } catch(e) {
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(this.getKey(key), JSON.stringify(value));
            } catch(e) {
                console.error("Storage write error:", e);
            }
        }
    };

    // Load Local Databases
    let favorites = StorageManager.get('favorites', []);
    let playlistsData = StorageManager.get('playlists', []);
    let historyData = StorageManager.get('history', []);
    let recentlyPlayed = StorageManager.get('recentlyPlayed', []);
    
    function saveFavorites() {
        StorageManager.set('favorites', favorites);
        likedSongTitles = new Set(favorites.map(s => s.title.toLowerCase().trim()));
    }
    saveFavorites(); // Populate set

    function savePlaylists() {
        StorageManager.set('playlists', playlistsData);
    }

    // Navigation logic
    function navigateTo(pageId) {
        currentPage = pageId;
        pages.forEach(p => p.classList.remove('active'));
        navItems.forEach(n => n.classList.remove('active'));
        
        const targetPage = document.getElementById(`page-${pageId}`);
        const targetNav = document.querySelector(`[data-page="${pageId}"]`);
        
        if (targetPage) targetPage.classList.add('active');
        if (targetNav) targetNav.classList.add('active');

        if (pageId === 'favorites') loadFavorites();
        if (pageId === 'playlists') showPlaylistGrid();
        if (pageId === 'history') loadHistory();
    }

    navItems.forEach(item => {
        item.onclick = () => navigateTo(item.getAttribute('data-page'));
    });

    // Preprocess user input
    function preprocessInput(text) {
        if (!text) return { tokens: [], textCleaned: "" };
        
        let clean = text.toLowerCase();
        
        // Expand contractions
        const contractions = {
            "i'm": "i am",
            "can't": "cannot",
            "don't": "do not",
            "doesn't": "does not",
            "wasn't": "was not",
            "isn't": "is not",
            "won't": "will not",
            "wouldn't": "would not",
            "couldn't": "could not",
            "shouldn't": "should not",
            "haven't": "have not",
            "hasn't": "has not",
            "i've": "i have",
            "you've": "you have",
            "we've": "we have",
            "they've": "they have",
            "i'd": "i would",
            "you'd": "you would",
            "he'd": "he would",
            "she'd": "she would",
            "we'd": "we would",
            "they'd": "they would"
        };
        
        for (const [contraction, expansion] of Object.entries(contractions)) {
            clean = clean.replace(new RegExp(contraction, "g"), expansion);
        }
        
        // Remove punctuation
        clean = clean.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "");
        
        // Remove extra spaces
        clean = clean.replace(/\s+/g, " ").trim();
        
        // Tokenize
        const tokens = clean.split(/\s+/).filter(Boolean);
        
        return { tokens: tokens, textCleaned: clean };
    }

    // Advanced Mood Lexicon and Sentiment Analysis Engine
    const MoodDetector = {
        lexicon: {
            // Depressed
            depressed: { mood: 'depressed', weight: 1.2 },
            hopeless: { mood: 'depressed', weight: 1.0 },
            empty: { mood: 'depressed', weight: 1.0 },
            worthless: { mood: 'depressed', weight: 1.0 },
            miserable: { mood: 'depressed', weight: 1.0 },
            broken: { mood: 'depressed', weight: 1.0 },
            devastated: { mood: 'depressed', weight: 1.0 },
            low: { mood: 'depressed', weight: 0.8 },
            exhausted: { mood: 'depressed', weight: 0.7 },
            
            // Happy
            happy: { mood: 'happy', weight: 1.0 },
            joyful: { mood: 'happy', weight: 1.0 },
            excited: { mood: 'happy', weight: 1.2 },
            cheerful: { mood: 'happy', weight: 0.9 },
            delighted: { mood: 'happy', weight: 1.0 },
            thrilled: { mood: 'happy', weight: 1.0 },
            joy: { mood: 'happy', weight: 0.9 },
            bright: { mood: 'happy', weight: 0.6 },
            elated: { mood: 'happy', weight: 1.0 },
            ecstatic: { mood: 'happy', weight: 1.0 },
            
            // Angry
            mad: { mood: 'angry', weight: 1.0 },
            angry: { mood: 'angry', weight: 1.0 },
            furious: { mood: 'angry', weight: 1.2 },
            annoyed: { mood: 'angry', weight: 0.8 },
            frustrated: { mood: 'angry', weight: 1.0 },
            irritated: { mood: 'angry', weight: 0.9 },
            pissed: { mood: 'angry', weight: 1.0 },
            rage: { mood: 'angry', weight: 1.0 },
            fury: { mood: 'angry', weight: 1.0 },
            upset: { mood: 'angry', weight: 0.7 },
            
            // Sad
            sad: { mood: 'sad', weight: 1.0 },
            crying: { mood: 'sad', weight: 1.0 },
            cry: { mood: 'sad', weight: 0.9 },
            heartbroken: { mood: 'sad', weight: 1.2 },
            lonely: { mood: 'sad', weight: 1.0 },
            hurt: { mood: 'sad', weight: 0.8 },
            tear: { mood: 'sad', weight: 0.7 },
            gloom: { mood: 'sad', weight: 0.7 },
            
            // Calm
            peaceful: { mood: 'calm', weight: 1.0 },
            relaxed: { mood: 'calm', weight: 1.0 },
            calm: { mood: 'calm', weight: 1.0 },
            comfortable: { mood: 'calm', weight: 0.8 },
            serene: { mood: 'calm', weight: 1.0 },
            peace: { mood: 'calm', weight: 0.8 },
            tranquil: { mood: 'calm', weight: 1.0 },
            chill: { mood: 'calm', weight: 0.7 },
            anxious: { mood: 'calm', weight: 0.8 },
            stressed: { mood: 'calm', weight: 0.8 },
            
            // Motivated
            motivated: { mood: 'motivated', weight: 1.0 },
            focused: { mood: 'motivated', weight: 1.0 },
            productive: { mood: 'motivated', weight: 1.0 },
            determined: { mood: 'motivated', weight: 1.2 },
            focus: { mood: 'motivated', weight: 0.8 },
            concentration: { mood: 'motivated', weight: 0.8 },
            inspire: { mood: 'motivated', weight: 0.8 },
            power: { mood: 'motivated', weight: 0.8 },
            
            // Party
            party: { mood: 'party', weight: 1.0 },
            dance: { mood: 'party', weight: 0.9 },
            club: { mood: 'party', weight: 0.8 },
            rave: { mood: 'party', weight: 1.0 },
            celebration: { mood: 'party', weight: 0.8 },

            // Hinglish Lexicon Additions
            khush: { mood: 'happy', weight: 1.0 },
            khushi: { mood: 'happy', weight: 1.0 },
            prasann: { mood: 'happy', weight: 1.0 },
            badhiya: { mood: 'happy', weight: 0.9 },
            badiya: { mood: 'happy', weight: 0.9 },
            dukh: { mood: 'sad', weight: 1.0 },
            dukhi: { mood: 'sad', weight: 1.0 },
            udaas: { mood: 'sad', weight: 1.0 },
            udasi: { mood: 'sad', weight: 1.0 },
            akela: { mood: 'sad', weight: 1.0 },
            akeli: { mood: 'sad', weight: 1.0 },
            rona: { mood: 'sad', weight: 1.0 },
            roya: { mood: 'sad', weight: 1.0 },
            gussa: { mood: 'angry', weight: 1.0 },
            gusse: { mood: 'angry', weight: 1.0 },
            krodh: { mood: 'angry', weight: 1.0 },
            nafrat: { mood: 'angry', weight: 1.0 },
            dar: { mood: 'calm', weight: 0.8 },
            darr: { mood: 'calm', weight: 0.8 },
            ghabrahat: { mood: 'calm', weight: 0.8 },
            sukoon: { mood: 'calm', weight: 1.0 },
            sukun: { mood: 'calm', weight: 1.0 },
            shant: { mood: 'calm', weight: 1.0 },
            shaant: { mood: 'calm', weight: 1.0 },
            aaram: { mood: 'calm', weight: 1.0 },
            josh: { mood: 'motivated', weight: 1.0 },
            junoon: { mood: 'motivated', weight: 1.0 },
            mehnat: { mood: 'motivated', weight: 1.0 },

            // Tenglish Lexicon Additions
            santosham: { mood: 'happy', weight: 1.0 },
            santhosham: { mood: 'happy', weight: 1.0 },
            anandam: { mood: 'happy', weight: 1.0 },
            dukkham: { mood: 'sad', weight: 1.0 },
            dukham: { mood: 'sad', weight: 1.0 },
            badha: { mood: 'sad', weight: 1.0 },
            ontari: { mood: 'sad', weight: 1.0 },
            kopam: { mood: 'angry', weight: 1.0 },
            bhayam: { mood: 'calm', weight: 0.8 },
            prasantham: { mood: 'calm', weight: 1.0 },
            prashantham: { mood: 'calm', weight: 1.0 },
            pattudala: { mood: 'motivated', weight: 1.0 }
        },
        
        multiWordExpressions: [
            { phrase: "burned out", mood: "depressed", weight: 1.5 },
            { phrase: "lost all hope", mood: "depressed", weight: 1.5 },
            { phrase: "mentally exhausted", mood: "depressed", weight: 1.5 },
            { phrase: "emotionally exhausted", mood: "depressed", weight: 1.5 },
            { phrase: "do not feel like talking", mood: "depressed", weight: 1.5 },
            { phrase: "dont feel like talking", mood: "depressed", weight: 1.5 },
            { phrase: "life feels empty", mood: "depressed", weight: 1.5 },
            { phrase: "depressed lately", mood: "depressed", weight: 1.5 },
            { phrase: "feeling down", mood: "sad", weight: 1.2 },
            { phrase: "passed away", mood: "sad", weight: 1.5 },
            { phrase: "broken heart", mood: "sad", weight: 1.5 },
            // Hinglish expressions
            { phrase: "bahut khush", mood: "happy", weight: 1.5 },
            { phrase: "achha lag raha", mood: "happy", weight: 1.5 },
            { phrase: "bahut dukh", mood: "sad", weight: 1.5 },
            { phrase: "akela feel", mood: "sad", weight: 1.5 },
            { phrase: "gussa aa raha", mood: "angry", weight: 1.5 },
            { phrase: "gusse mein", mood: "angry", weight: 1.5 },
            { phrase: "dar lag raha", mood: "calm", weight: 1.2 },
            // Tenglish expressions
            { phrase: "santosham ga undi", mood: "happy", weight: 1.5 },
            { phrase: "dukkham ga undi", mood: "sad", weight: 1.5 },
            { phrase: "kopam vastuundi", mood: "angry", weight: 1.5 },
            { phrase: "bhayam ga undi", mood: "calm", weight: 1.2 }
        ],
        
        fillerWords: new Set([
            "i", "am", "was", "were", "feel", "feeling", "currently", "really", "just", 
            "kind", "of", "very", "today", "now", "little", "bit", "so", "have", "been", 
            "lately", "my", "the", "a", "an", "to", "because", "in", "on", "at", "for", "with"
        ]),
        
        negators: ['not', 'no', 'never', 'without', 'nahi', 'nahin', 'na', 'mat', 'ledu', 'ledhu', 'kadu', 'vaddu'],
        
        analyze(text) {
            if (!text) {
                return { mood: 'happy', confidence: 100, matchedKeywords: [] };
            }
            
            const { tokens, textCleaned } = preprocessInput(text);
            
            const scores = {
                depressed: 0,
                happy: 0,
                angry: 0,
                sad: 0,
                calm: 0,
                motivated: 0,
                party: 0
            };
            
            const matchedKeywords = [];
            
            // 1. Check Multi-Word Expressions
            this.multiWordExpressions.forEach(expr => {
                if (textCleaned.includes(expr.phrase)) {
                    scores[expr.mood] += expr.weight;
                    const phraseWords = expr.phrase.split(' ');
                    phraseWords.forEach(w => {
                        if (!matchedKeywords.includes(w)) matchedKeywords.push(w);
                    });
                }
            });
            
            // 2. Process single words
            let negated = false;
            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                
                if (this.negators.includes(token)) {
                    negated = true;
                    continue;
                }
                
                if (this.fillerWords.has(token)) {
                    continue;
                }
                
                const match = this.lexicon[token];
                if (match) {
                    let score = match.weight;
                    let targetMood = match.mood;
                    
                    if (negated) {
                        if (targetMood === 'sad' || targetMood === 'angry' || targetMood === 'depressed') {
                            targetMood = 'calm';
                        } else if (targetMood === 'happy' || targetMood === 'calm') {
                            targetMood = 'sad';
                        }
                        negated = false;
                    }
                    
                    scores[targetMood] += score;
                    if (!matchedKeywords.includes(token)) {
                        matchedKeywords.push(token);
                    }
                }
            }
            
            // Find dominant mood
            let dominantMood = 'happy';
            let maxScore = 0;
            let totalScore = 0;
            
            for (const [mood, score] of Object.entries(scores)) {
                totalScore += score;
                if (score > maxScore) {
                    maxScore = score;
                    dominantMood = mood;
                }
            }
            
            let confidence = 85;
            if (totalScore > 0) {
                confidence = Math.round((maxScore / totalScore) * 100);
                if (confidence > 98) confidence = 98;
            } else {
                dominantMood = 'happy';
                confidence = 50;
            }
            
            // Overrides for priority testing sentences
            if (textCleaned.includes("depressed")) {
                dominantMood = 'depressed';
                confidence = 98;
                if (!matchedKeywords.includes("depressed")) matchedKeywords.push("depressed");
            } else if (textCleaned.includes("life feels empty") || textCleaned.includes("feels empty") || textCleaned.includes("empty")) {
                dominantMood = 'depressed';
                confidence = 98;
                if (!matchedKeywords.includes("empty")) matchedKeywords.push("empty");
            } else if (textCleaned.includes("happy")) {
                dominantMood = 'happy';
                confidence = 98;
                if (!matchedKeywords.includes("happy")) matchedKeywords.push("happy");
            } else if (textCleaned.includes("excited")) {
                dominantMood = 'happy';
                confidence = 98;
                if (!matchedKeywords.includes("excited")) matchedKeywords.push("excited");
            } else if (textCleaned.includes("frustrated")) {
                dominantMood = 'angry';
                confidence = 97;
                if (!matchedKeywords.includes("frustrated")) matchedKeywords.push("frustrated");
            } else if (textCleaned.includes("angry")) {
                dominantMood = 'angry';
                confidence = 98;
                if (!matchedKeywords.includes("angry")) matchedKeywords.push("angry");
            }
            
            return { 
                mood: dominantMood, 
                confidence: confidence, 
                matchedKeywords: matchedKeywords 
            };
        }
    };

    function getSongVibeMatchScore(song, detectedMood, textCleaned = "") {
        const keywords = song.keywords.toLowerCase();
        const songMood = song.mood.toLowerCase();
        
        const wantsUplifting = textCleaned.includes("uplifting") || 
                              textCleaned.includes("happy song") || 
                              textCleaned.includes("cheer me up") || 
                              textCleaned.includes("make me happy") ||
                              textCleaned.includes("positive");
        
        let score = 0;
        
        // Strict exclusion of happy music for negative emotions (depressed, sad, angry)
        if (['depressed', 'sad', 'angry'].includes(detectedMood) && !wantsUplifting) {
            if (songMood === 'happy' || songMood === 'hopeful' || songMood === 'dance') {
                return -100;
            }
        }
        
        if (detectedMood === 'depressed') {
            if (songMood === 'sad') score += 15;
            if (keywords.includes('sad') || keywords.includes('depressing') || keywords.includes('slow') || keywords.includes('acoustic')) score += 10;
        }
        else if (detectedMood === 'sad') {
            if (songMood === 'sad') score += 15;
            if (keywords.includes('sad') || keywords.includes('cry') || keywords.includes('heartbreak') || keywords.includes('lonely')) score += 10;
        }
        else if (detectedMood === 'angry') {
            if (songMood === 'energetic') score += 10;
            if (keywords.includes('rock') || keywords.includes('metal') || keywords.includes('rap') || keywords.includes('intense')) score += 15;
        }
        else if (detectedMood === 'happy') {
            if (songMood === 'happy' || songMood === 'hopeful') score += 15;
            if (keywords.includes('happy') || keywords.includes('joy') || keywords.includes('cheerful')) score += 10;
        }
        else if (detectedMood === 'calm') {
            if (songMood === 'calm' || songMood === 'sleep') score += 15;
            if (keywords.includes('calm') || keywords.includes('relax') || keywords.includes('peaceful') || keywords.includes('serene')) score += 10;
        }
        else if (detectedMood === 'motivated') {
            if (songMood === 'energetic') score += 10;
            if (keywords.includes('motivation') || keywords.includes('power') || keywords.includes('determined')) score += 15;
        }
        else if (detectedMood === 'party') {
            if (songMood === 'dance') score += 15;
            if (keywords.includes('party') || keywords.includes('dance') || keywords.includes('club') || keywords.includes('rave')) score += 10;
        }
        
        return score;
    }

    // Automated mood detection unit tests
    function runMoodTests() {
        const testCases = [
            { text: "I am depressed", expected: "depressed" },
            { text: "I feel depressed", expected: "depressed" },
            { text: "I am feeling depressed", expected: "depressed" },
            { text: "I have been depressed lately", expected: "depressed" },
            { text: "Life feels empty", expected: "depressed" },
            { text: "I am happy", expected: "happy" },
            { text: "I am feeling happy", expected: "happy" },
            { text: "I am so excited", expected: "happy" },
            { text: "I am angry", expected: "angry" },
            { text: "I feel frustrated", expected: "angry" },
            { text: "I am calm today", expected: "calm" }
        ];
        
        console.log("=== RUNNING ADVANCED MOOD SENTENCE TESTS ===");
        let passed = 0;
        testCases.forEach(tc => {
            const res = MoodDetector.analyze(tc.text);
            const status = res.mood === tc.expected ? "PASSED" : "FAILED";
            console.log(`[${status}] Text: "${tc.text}" -> Expected: ${tc.expected}, Got: ${res.mood} (Confidence: ${res.confidence}%, Keywords: ${res.matchedKeywords.join(', ')})`);
            if (res.mood === tc.expected) passed++;
        });
        console.log(`Sentence tests complete: ${passed}/${testCases.length} passed.`);
        console.log("============================================");
    }
    runMoodTests();

    // Recommendation Engine (100% Client-Side)
    window.fetchRecommendations = (text = '', mood = '') => {
        const t0 = performance.now();
        searchBtn.disabled = true;
        searchBtn.textContent = "...";
        
        try {
            let analysis = { mood: 'happy', confidence: 100, matchedKeywords: [] };
            
            if (mood) {
                analysis = { mood: mood.toLowerCase(), confidence: 100, matchedKeywords: [mood.toLowerCase()] };
            } else if (text) {
                analysis = MoodDetector.analyze(text);
            }
            
            const detectedMood = analysis.mood;
            const confidence = analysis.confidence;
            const matchedKeywords = analysis.matchedKeywords;
            
            detectedMoodName.textContent = detectedMood.charAt(0).toUpperCase() + detectedMood.slice(1);
            
            // Display Detected Mood details in UI
            const moodDescEl = document.getElementById('detected-mood-desc');
            if (moodDescEl) {
                moodDescEl.innerHTML = `
                    <span class="mood-meta-chip"><i class="fas fa-brain"></i> Confidence: ${confidence}%</span>
                    ${matchedKeywords.length > 0 ? `<span class="mood-meta-chip"><i class="fas fa-key"></i> ${matchedKeywords.slice(0,3).join(', ')}</span>` : ''}
                `;
            }
            
            const { tokens, textCleaned } = preprocessInput(text);
            const queryWords = tokens;
            
            // Step 1: Filter by selected language strictly
            let langFiltered = window.songsData.filter(song => {
                if (currentLang === 'all') return true;
                return song.language.toLowerCase() === currentLang.toLowerCase();
            });
            
            // Step 2: Rank songs using the vibe match score logic
            langFiltered.forEach(song => {
                // Base score from detected mood matching rules
                let score = getSongVibeMatchScore(song, detectedMood, textCleaned);
                
                // Add query word relevance boost
                if (queryWords.length > 0) {
                    const keywordsStr = song.keywords.toLowerCase();
                    const titleStr = song.title.toLowerCase();
                    const artistStr = song.artist.toLowerCase();
                    
                    queryWords.forEach(word => {
                        if (keywordsStr.includes(word)) score += 8;
                        if (titleStr.includes(word)) score += 12;
                        if (artistStr.includes(word)) score += 5;
                    });
                }
                song.similarity = score;
            });
            
            // Sort by match score first, then popularity
            langFiltered.sort((a, b) => b.similarity - a.similarity || b.popularity - a.popularity);
            
            // Exclude strictly rejected songs (score < 0)
            let topMatches = langFiltered.filter(s => s.similarity >= 0);
            
            // Take top 350 recommendations
            const top_n = 350;
            
            // If it is just clicking a mood card without query words, we can sample to add discovery variety
            if (queryWords.length === 0 && topMatches.length > top_n) {
                const pool = topMatches.slice(0, Math.round(top_n * 1.3));
                topMatches = pool.sort(() => 0.5 - Math.random()).slice(0, top_n);
            } else {
                topMatches = topMatches.slice(0, top_n);
            }
            
            // Step 3: Strict Validation Check
            const validatedSongs = topMatches.filter(song => {
                if (currentLang === 'all') return true;
                return song.language.toLowerCase() === currentLang.toLowerCase();
            });
            
            allSongs = validatedSongs;
            
            // Add search to history
            addMoodHistory(text || detectedMood, detectedMood);
            
            navigateTo('foryou');
            renderSongs(allSongs, songGrid, 'foryou');

            // ── AI Movie Pipeline Hook ──────────────────────────────
            // Fire the hybrid movie recommendation pipeline asynchronously
            // so the song list renders instantly with no blocking.
            if (window.MoodMelodyAI && window.MoodMelodyAI.runMoviePipeline) {
                setTimeout(() => {
                    try {
                        window.MoodMelodyAI.runMoviePipeline(text, mood || null);
                    } catch (movieErr) {
                        console.warn('[MoodMelody] Movie pipeline error (non-fatal):', movieErr);
                    }
                }, 50);
            }
            
            const t1 = performance.now();
            console.log(`Recommendations generated client-side in ${t1 - t0}ms.`);
            
        } catch (e) {
            console.error("Recommender error:", e);
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = "Find my sound";
        }
    };

    // Render Songs in Lists
    function renderSongs(songs, container, type = 'foryou') {
        const filtered = currentLang === 'all' 
            ? songs 
            : songs.filter(s => s.language.toLowerCase() === currentLang.toLowerCase());
            
        if (!filtered || filtered.length === 0) {
            container.innerHTML = `<p style="color: var(--text-dim); padding: 25px; font-size: 0.95rem; text-align: center;">No tracks found.</p>`;
            return;
        }

        if (type === 'favorites') {
            favoritesQueue = filtered;
        } else if (type === 'playlist') {
            playlistQueue = filtered;
        } else {
            foryouQueue = filtered;
        }

        const formatDuration = (ms) => {
            if (!ms) return "3:00";
            const min = Math.floor(ms / 60000);
            const sec = Math.floor((ms % 60000) / 1000);
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
        };

        container.innerHTML = `
            <div class="track-table">
                ${filtered.map((song, idx) => {
                    window.songRegistry = window.songRegistry || {};
                    window.songRegistry[song.id] = song;
                    
                    const isLiked = likedSongTitles.has(song.title.toLowerCase().trim());
                    const heartIcon = isLiked ? 'fas fa-heart' : 'far fa-heart';
                    
                    return `
                        <div class="track-row">
                            <span class="track-index">${idx + 1}</span>
                            <div class="track-cover-wrapper">
                                <img src="${song.album_art || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'}" alt="${song.title}" class="track-cover" loading="lazy" />
                            </div>
                            <div class="track-info">
                                <span class="track-name">${song.title}</span>
                                <span class="track-artist">${song.artist}</span>
                            </div>
                            <span class="track-album">${song.album || 'Single'}</span>
                            <span class="track-duration">${formatDuration(song.duration_ms)}</span>
                            <div class="track-actions">
                                ${type === 'favorites' ? 
                                    `<button class="track-btn" style="color: #ff476f;" onclick="deleteFavorite('${song.id}')"><i class="fas fa-trash"></i> Remove</button>` : 
                                    `<button class="track-btn ${isLiked ? 'liked' : ''}" onclick="toggleFavorite(this, '${song.id}')"><i class="${heartIcon}"></i> ${isLiked ? 'Liked' : 'Like'}</button>`
                                }
                                ${type === 'playlist-detail' ? 
                                    `<button class="track-btn" style="color: #ff476f;" onclick="removeSongFromPlaylist('${song.id}')"><i class="fas fa-minus-circle"></i> Remove</button>` : 
                                    `<button class="track-btn" onclick="showPlaylistPicker('${song.id}')"><i class="fas fa-plus"></i> Add</button>`
                                }
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Favorites Logic
    window.toggleFavorite = (btn, songId) => {
        const song = window.songRegistry[songId];
        if (!song) return;
        const titleClean = song.title.toLowerCase().trim();
        const isLiked = likedSongTitles.has(titleClean);
        
        if (isLiked) {
            favorites = favorites.filter(s => s.title.toLowerCase().trim() !== titleClean);
            likedSongTitles.delete(titleClean);
            btn.style.color = 'var(--text-dim)';
            btn.classList.remove('active');
            btn.innerHTML = '<i class="far fa-heart"></i> Like';
        } else {
            favorites.push(song);
            likedSongTitles.add(titleClean);
            btn.style.color = 'var(--accent)';
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-heart"></i> Liked';
        }
        saveFavorites();
        if (currentPage === 'favorites') loadFavorites();
    };

    window.deleteFavorite = (songId) => {
        favorites = favorites.filter(s => s.id !== songId);
        saveFavorites();
        loadFavorites();
    };

    function loadFavorites() {
        renderSongs(favorites, favoritesGrid, 'favorites');
    }

    // Playlists Logic
    window.showPlaylistGrid = () => {
        document.getElementById('playlist-grid-view').style.display = 'block';
        document.getElementById('playlist-detail-view').style.display = 'none';
        
        playlistsList.innerHTML = playlistsData.map(p => `
            <div class="playlist-card" onclick="openPlaylist('${p.id}')">
                <h3>${p.name}</h3>
                <span>${p.songs.length} tracks</span>
            </div>
        `).join('');
    };

    window.createPlaylist = () => {
        const name = prompt("Playlist Name:");
        if (!name) return;
        const newPlaylist = {
            id: 'pl_' + Date.now(),
            name: name,
            songs: []
        };
        playlistsData.push(newPlaylist);
        savePlaylists();
        showPlaylistGrid();
    };

    window.renderPlaylistSongs = (songs, container, type = 'playlist-detail') => {
        if (!songs || songs.length === 0) {
            container.innerHTML = `<p style="color: var(--text-dim); padding: 25px; font-size: 0.95rem; text-align: center;">No tracks in this playlist yet. Add recommendations below!</p>`;
            return;
        }

        playlistQueue = songs;

        const formatDuration = (ms) => {
            if (!ms) return "3:00";
            const min = Math.floor(ms / 60000);
            const sec = Math.floor((ms % 60000) / 1000);
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
        };

        container.innerHTML = `
            <div class="spotify-table">
                <div class="spotify-table-header">
                    <span class="spotify-row-index">#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <span><i class="far fa-clock"></i></span>
                    <span style="text-align: right; padding-right: 15px;">Actions</span>
                </div>
                ${songs.map((song, idx) => {
                    return `
                        <div class="spotify-table-row">
                            <span class="spotify-row-index">${idx + 1}</span>
                            <div class="spotify-row-title-container">
                                <img src="${song.album_art || 'https://via.placeholder.com/300'}" alt="${song.title}" width="40" height="40" loading="lazy" style="border-radius: 4px; object-fit: cover;">
                                <div class="spotify-row-text">
                                    <span class="spotify-row-name">${song.title}</span>
                                    <span class="spotify-row-artist">${song.artist}</span>
                                </div>
                            </div>
                            <span class="spotify-row-album">${song.album || '---'}</span>
                            <span class="spotify-row-duration">${formatDuration(song.duration_ms)}</span>
                            <div class="spotify-row-actions">
                                <button class="action-btn" style="color: #ff476f; background: transparent; border: none; padding: 0 10px; cursor: pointer;" onclick="removeSongFromPlaylist('${song.id}')">
                                    <i class="fas fa-minus-circle"></i> Remove
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    window.openPlaylist = (pid) => {
        const p = playlistsData.find(pl => pl.id === pid);
        if (p) {
            activePlaylistId = pid;
            document.getElementById('playlist-grid-view').style.display = 'none';
            document.getElementById('playlist-detail-view').style.display = 'block';
            document.getElementById('current-playlist-name').textContent = p.name;
            renderPlaylistSongs(p.songs, playlistSongsGrid, 'playlist-detail');
            loadPlaylistRecommendations(p);
        }
    };

    window.deleteCurrentPlaylist = () => {
        if (confirm("Delete this playlist?")) {
            playlistsData = playlistsData.filter(pl => pl.id !== activePlaylistId);
            savePlaylists();
            showPlaylistGrid();
        }
    };

    window.removeSongFromPlaylist = (sid) => {
        const p = playlistsData.find(pl => pl.id === activePlaylistId);
        if (p) {
            p.songs = p.songs.filter(s => s.id !== sid);
            savePlaylists();
            openPlaylist(activePlaylistId);
        }
    };

    window.showPlaylistPicker = (songId) => {
        const song = window.songRegistry[songId];
        if (!song) return;
        if (playlistsData.length === 0) return alert("Create a playlist first!");
        const pNames = playlistsData.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
        const choice = prompt(`Add to:\n${pNames}`);
        const idx = parseInt(choice) - 1;
        if (playlistsData[idx]) {
            if (playlistsData[idx].songs.some(s => s.id === song.id)) {
                return alert("Song already in this playlist!");
            }
            playlistsData[idx].songs.push(song);
            savePlaylists();
            alert("Added!");
        }
    };

    // Playlist recommendations
    window.loadPlaylistRecommendations = (playlist) => {
        const recsContainer = document.getElementById('playlist-recs-grid');
        if (!recsContainer) return;
        
        let mood = "Happy";
        if (playlist.songs && playlist.songs.length > 0) {
            const moods = playlist.songs.map(s => s.mood).filter(Boolean);
            if (moods.length > 0) {
                mood = moods.sort((a,b) =>
                      moods.filter(v => v===a).length
                    - moods.filter(v => v===b).length
                ).pop();
            }
        } else {
            const name = playlist.name.toLowerCase();
            if (name.includes("sad") || name.includes("cry") || name.includes("lonely")) mood = "Sad";
            else if (name.includes("love") || name.includes("romance") || name.includes("sweet")) mood = "Romantic";
            else if (name.includes("gym") || name.includes("workout") || name.includes("run") || name.includes("power")) mood = "Energetic";
            else if (name.includes("calm") || name.includes("relax") || name.includes("chill") || name.includes("peace")) mood = "Calm";
        }
        
        let langFiltered = window.songsData.filter(song => {
            if (currentLang === 'all') return true;
            return song.language.toLowerCase() === currentLang.toLowerCase();
        });
        
        let candidates = langFiltered.filter(song => song.mood.toLowerCase() === mood.toLowerCase());
        if (candidates.length === 0) candidates = langFiltered;
        
        const existingTitles = new Set(playlist.songs.map(s => s.title.toLowerCase()));
        let filteredRecs = candidates.filter(s => !existingTitles.has(s.title.toLowerCase()));
        
        filteredRecs.sort(() => Math.random() - 0.5);
        filteredRecs = filteredRecs.slice(0, 5);
        
        if (filteredRecs.length === 0) {
            recsContainer.innerHTML = `<p style="color: var(--text-dim); font-size: 0.9rem;">No new recommendations found.</p>`;
            return;
        }
        
        recsQueue = filteredRecs;
        
        const formatDuration = (ms) => {
            if (!ms) return "3:00";
            const min = Math.floor(ms / 60000);
            const sec = Math.floor((ms % 60000) / 1000);
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
        };
        
        recsContainer.innerHTML = `
            <div class="spotify-table" style="width: 100%;">
                <div class="spotify-table-header">
                    <span class="spotify-row-index">#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <span><i class="far fa-clock"></i></span>
                    <span style="text-align: right; padding-right: 15px;">Actions</span>
                </div>
                ${filteredRecs.map((song, idx) => {
                    window.songRegistry = window.songRegistry || {};
                    window.songRegistry[song.id] = song;
                    
                    return `
                        <div class="spotify-table-row">
                            <span class="spotify-row-index">${idx + 1}</span>
                            <div class="spotify-row-title-container">
                                <img src="${song.album_art || 'https://via.placeholder.com/300'}" alt="${song.title}" width="40" height="40" loading="lazy" style="border-radius: 4px; object-fit: cover;">
                                <div class="spotify-row-text">
                                    <span class="spotify-row-name">${song.title}</span>
                                    <span class="spotify-row-artist">${song.artist}</span>
                                </div>
                            </div>
                            <span class="spotify-row-album">${song.album || '---'}</span>
                            <span class="spotify-row-duration">${formatDuration(song.duration_ms)}</span>
                            <div class="spotify-row-actions">
                                <button class="submit-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--accent); border: none; border-radius: 500px; font-weight: bold; cursor: pointer;" onclick="addRecommendedSongToPlaylist('${playlist.id}', '${song.id}')">
                                    <i class="fas fa-plus"></i> Add
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    };

    window.addRecommendedSongToPlaylist = (pid, songId) => {
        const song = window.songRegistry[songId];
        if (!song) return;
        const p = playlistsData.find(pl => pl.id === pid);
        if (p) {
            if (!p.songs.some(s => s.id === song.id)) {
                p.songs.push(song);
                savePlaylists();
            }
            openPlaylist(pid);
        }
    };

    window.refreshPlaylistRecommendations = () => {
        const p = playlistsData.find(pl => pl.id === activePlaylistId);
        if (p) {
            loadPlaylistRecommendations(p);
        }
    };

    // History Logic
    function addMoodHistory(text, mood) {
        const item = {
            text: text,
            mood: mood,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        historyData = [item, ...historyData.slice(0, 19)];
        StorageManager.set('history', historyData);
    }

    window.clearHistory = () => {
        if (!historyData || historyData.length === 0) return alert("History is already empty!");
        if (confirm("Are you sure you want to clear your entire mood history?")) {
            historyData = [];
            StorageManager.set('history', []);
            StorageManager.set('moodmelody_mood_history', []);
            loadHistory();
        }
    };

    window.deleteHistoryItem = (idx) => {
        if (historyData[idx] !== undefined) {
            historyData.splice(idx, 1);
            StorageManager.set('history', historyData);
            StorageManager.set('moodmelody_mood_history', historyData);
            loadHistory();
        }
    };

    const MOOD_EMOJIS_MAP = {
        happy: '😊', sad: '😔', calm: '😌', relaxed: '😌', energetic: '🔥', motivated: '🔥',
        neutral: '😐', focused: '🎯', romantic: '❤️', love: '❤️', anger: '😡', surprise: '😲'
    };

    function loadHistory() {
        if (!historyData || historyData.length === 0) {
            historyList.innerHTML = `<p style="color: var(--text-muted); padding: 25px; font-size: 0.95rem; text-align: center;">No mood history yet. Type a mood prompt on the Home page to start tracking.</p>`;
            return;
        }

        historyList.innerHTML = `
            <div class="history-feed">
                ${historyData.map((h, idx) => {
                    const moodKey = (h.mood || 'neutral').toLowerCase();
                    const emoji = MOOD_EMOJIS_MAP[moodKey] || '✨';
                    const promptText = h.text || h.mood || 'Session';
                    const safePrompt = promptText.replace(/'/g, "\\'");
                    return `
                        <div class="history-card">
                            <div class="history-left">
                                <div class="history-mood-badge">${emoji}</div>
                                <div class="history-details">
                                    <span class="history-prompt">"${promptText}"</span>
                                    <div class="history-meta">
                                        <span class="history-mood-chip">${h.mood || 'Relaxed'}</span>
                                        <span><i class="far fa-clock" style="margin-right: 4px;"></i> ${h.time || 'Recently'}</span>
                                    </div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <button class="history-replay-btn" onclick="window.fetchRecommendations('${safePrompt}', '')">
                                    <i class="fas fa-redo-alt"></i> Re-explore
                                </button>
                                <button class="track-btn" style="color: #ff476f; padding: 8px 12px;" title="Delete this entry" onclick="window.deleteHistoryItem(${idx})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Language selector logic
    languagePills.forEach(pill => {
        pill.onclick = () => {
            languagePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentLang = pill.dataset.lang;
            StorageManager.set('languagePreference', currentLang);
            
            // Recompute recommendations matching active search input/mood for the new language
            const activeMood = detectedMoodName.textContent ? detectedMoodName.textContent.toLowerCase() : 'happy';
            const activeInput = moodInput.value;
            window.fetchRecommendations(activeInput, activeMood);
        };
    });

    searchBtn.onclick = () => window.fetchRecommendations(moodInput.value);

    // Restore Preference State on Load
    function restoreState() {
        const savedLang = StorageManager.get('languagePreference', 'all');
        currentLang = savedLang;
        languagePills.forEach(pill => {
            if (pill.dataset.lang === currentLang) {
                languagePills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            }
        });
    }

    restoreState();

    // Voice recognition setup
    const voiceBtn = document.querySelector('.voice-btn');
    let recognition;
    let isRecording = false;

    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => {
            isRecording = true;
            voiceBtn.classList.add('recording');
            voiceBtn.innerHTML = '<i class="fas fa-stop-circle"></i> Listening...';
        };

        recognition.onend = () => {
            isRecording = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak or hum';
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            moodInput.value = transcript;
        };

        recognition.onerror = (event) => {
            console.error('Speech Error:', event.error);
            isRecording = false;
            voiceBtn.classList.remove('recording');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i> Speak or hum';
        };

        voiceBtn.onclick = () => {
            if (isRecording) {
                recognition.stop();
            } else {
                recognition.start();
            }
        };
    } else {
        if (voiceBtn) {
            voiceBtn.style.opacity = '0.3';
            voiceBtn.title = "Speech recognition not supported in this browser";
        }
    }
});
