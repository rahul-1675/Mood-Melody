document.addEventListener('DOMContentLoaded', () => {
    const moodInput = document.getElementById('mood-input');
    const searchBtn = document.getElementById('search-btn');
    const songGrid = document.getElementById('song-grid');
    const favoritesGrid = document.getElementById('favorites-grid');
    const playlistsList = document.getElementById('playlists-list');
    const playlistSongsGrid = document.getElementById('playlist-songs-grid');
    const historyList = document.getElementById('history-list');
    
    const detectedMoodName = document.getElementById('detected-mood-name');
    const playerPopup = document.getElementById('player-popup');
    const closePlayer = document.getElementById('close-player');
    const languagePills = document.querySelectorAll('.lang-pill-selector span');
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');
    
    const audioPlayer = document.getElementById('audio-player');
    const playPauseBtn = document.getElementById('play-pause-btn');
    const progressBar = document.getElementById('progress');
    const playerArt = document.getElementById('player-art');
    const playerTitle = document.getElementById('player-title');
    
    let allSongs = [];
    let currentLang = 'all';
    let playlistsData = [];
    let activePlaylistId = null;
    let currentPage = 'home';
    let likedSongTitles = new Set();

    let foryouQueue = [];
    let favoritesQueue = [];
    let playlistQueue = [];
    let recsQueue = [];
    let activePlayQueue = [];
    let currentQueueIndex = -1;

    async function updateLikedSongsSet() {
        try {
            const res = await fetch('/api/favorites');
            if (res.ok) {
                const songs = await res.json();
                likedSongTitles = new Set(songs.map(s => s.title.toLowerCase().trim()));
            }
        } catch(e) {
            console.error("Failed to load favorites cache", e);
        }
    }
    updateLikedSongsSet();


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


    function renderSongs(songs, container, type = 'foryou') {
        const filtered = currentLang === 'all' 
            ? songs 
            : songs.filter(s => s.language === currentLang);
            
        if (!filtered || filtered.length === 0) {
            container.innerHTML = `<p style="color: var(--text-dim); padding: 25px; font-size: 0.95rem; text-align: center;">No tracks found.</p>`;
            return;
        }

        if (type === 'favorites') {
            favoritesQueue = filtered;
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
            <div class="spotify-table" style="width: 100%;">
                <div class="spotify-table-header">
                    <span class="spotify-row-index">#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <span><i class="far fa-clock"></i></span>
                    <span style="text-align: right; padding-right: 15px;">Actions</span>
                </div>
                ${filtered.map((song, idx) => {
                    const safeTitle = song.title.replace(/'/g, "\\'");
                    const safeArt = song.album_art ? song.album_art.replace(/'/g, "\\'") : '';
                    const safeUrl = song.preview_url ? song.preview_url.replace(/'/g, "\\'") : '';
                    const songJson = JSON.stringify(song).replace(/"/g, '&quot;');
                    
                    const isLiked = likedSongTitles.has(song.title.toLowerCase().trim());
                    const heartIcon = isLiked ? 'fas fa-heart' : 'far fa-heart';
                    const heartColor = isLiked ? 'var(--accent)' : 'var(--text-dim)';
                    const heartClass = isLiked ? 'active' : '';
                    const heartText = isLiked ? 'Liked' : 'Like';
                    
                    return `
                        <div class="spotify-table-row">
                            <span class="spotify-row-index">${idx + 1}</span>
                            <div class="spotify-row-title-container" onclick="playTrackFromQueue(${idx}, '${type}')">
                                <img src="${song.album_art || 'https://via.placeholder.com/300'}" alt="${song.title}">
                                <div class="spotify-row-text">
                                    <span class="spotify-row-name">${song.title}</span>
                                    <span class="spotify-row-artist">${song.artist}</span>
                                </div>
                            </div>
                            <span class="spotify-row-album">${song.album || '---'}</span>
                            <span class="spotify-row-duration">${formatDuration(song.duration_ms)}</span>
                            <div class="spotify-row-actions">
                                ${type === 'favorites' ? 
                                    `<button class="action-btn" style="color: #ff476f; background: transparent; border: none; padding: 0 10px;" onclick="deleteFavorite(${song.id})"><i class="fas fa-trash"></i> Remove</button>` : 
                                    `<button class="action-btn ${heartClass}" style="color: ${heartColor}; background: transparent; border: none; padding: 0 10px;" onclick="toggleFavorite(this, ${songJson})"><i class="${heartIcon}"></i> ${heartText}</button>`
                                }
                                ${type === 'playlist-detail' ? 
                                    `<button class="action-btn" style="color: #ff476f; background: transparent; border: none; padding: 0 10px;" onclick="removeSongFromPlaylist(${song.id})"><i class="fas fa-minus-circle"></i> Remove</button>` : 
                                    `<button class="action-btn" style="color: var(--text-dim); background: transparent; border: none; padding: 0 10px;" onclick="showPlaylistPicker(${songJson})"><i class="fas fa-plus"></i> Add to Playlist</button>`
                                }
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }


    window.fetchRecommendations = async (text = '', mood = '') => {
        if (!text && !mood) return;
        searchBtn.disabled = true;
        searchBtn.textContent = "...";
        
        try {
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, mood })
            });
            const data = await response.json();
            allSongs = data.songs;
            detectedMoodName.textContent = data.mood;
            navigateTo('foryou');
            renderSongs(allSongs, songGrid, 'foryou');
        } catch (error) {
            console.error('Fetch Error:', error);
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = "Find my sound";
        }
    }


    async function loadFavorites() {
        const res = await fetch('/api/favorites');
        const songs = await res.json();
        renderSongs(songs, favoritesGrid, 'favorites');
    }

    window.toggleFavorite = async (btn, song) => {
        const titleClean = song.title.toLowerCase().trim();
        const isLiked = likedSongTitles.has(titleClean);
        if (isLiked) {
            const res = await fetch('/api/favorites');
            const favs = await res.json();
            const matchingFav = favs.find(f => f.title.toLowerCase().trim() === titleClean);
            if (matchingFav) {
                await fetch(`/api/favorites/${matchingFav.id}`, { method: 'DELETE' });
                likedSongTitles.delete(titleClean);
                btn.style.color = 'var(--text-dim)';
                btn.classList.remove('active');
                btn.innerHTML = '<i class="far fa-heart"></i> Like';
            }
        } else {
            await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(song)
            });
            likedSongTitles.add(titleClean);
            btn.style.color = 'var(--accent)';
            btn.classList.add('active');
            btn.innerHTML = '<i class="fas fa-heart"></i> Liked';
        }
    };

    window.deleteFavorite = async (fid) => {
        if (confirm("Remove?")) {
            await fetch(`/api/favorites/${fid}`, { method: 'DELETE' });
            loadFavorites();
        }
    };


    window.showPlaylistGrid = async () => {
        document.getElementById('playlist-grid-view').style.display = 'block';
        document.getElementById('playlist-detail-view').style.display = 'none';
        const res = await fetch('/api/playlists');
        playlistsData = await res.json();
        playlistsList.innerHTML = playlistsData.map(p => `
            <div class="playlist-card" onclick="openPlaylist(${p.id})">
                <h3>${p.name}</h3>
                <span>${p.song_count} tracks</span>
            </div>
        `).join('');
    };

    window.createPlaylist = async () => {
        const name = prompt("Playlist Name:");
        if (!name) return;
        const res = await fetch('/api/playlists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        if (res.ok) showPlaylistGrid();
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
                    const safeTitle = song.title.replace(/'/g, "\\'");
                    const safeArt = song.album_art ? song.album_art.replace(/'/g, "\\'") : '';
                    const safeUrl = song.preview_url ? song.preview_url.replace(/'/g, "\\'") : '';
                    
                    return `
                        <div class="spotify-table-row">
                            <span class="spotify-row-index">${idx + 1}</span>
                            <div class="spotify-row-title-container" onclick="playTrackFromQueue(${idx}, 'playlist')">
                                <img src="${song.album_art || 'https://via.placeholder.com/300'}" alt="${song.title}">
                                <div class="spotify-row-text">
                                    <span class="spotify-row-name">${song.title}</span>
                                    <span class="spotify-row-artist">${song.artist}</span>
                                </div>
                            </div>
                            <span class="spotify-row-album">${song.album || '---'}</span>
                            <span class="spotify-row-duration">${formatDuration(song.duration_ms)}</span>
                            <div class="spotify-row-actions">
                                <button class="action-btn" style="color: #ff476f; background: transparent; border: none; padding: 0 10px;" onclick="removeSongFromPlaylist(${song.id})">
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

    window.deleteCurrentPlaylist = async () => {
        if (confirm("Delete this playlist?")) {
            await fetch(`/api/playlists/${activePlaylistId}`, { method: 'DELETE' });
            showPlaylistGrid();
        }
    };

    window.removeSongFromPlaylist = async (sid) => {
        await fetch(`/api/playlists/songs/${sid}`, { method: 'DELETE' });
        const res = await fetch('/api/playlists');
        playlistsData = await res.json();
        openPlaylist(activePlaylistId);
    };

    window.showPlaylistPicker = async (song) => {
        const res = await fetch('/api/playlists');
        playlistsData = await res.json();
        if (playlistsData.length === 0) return alert("Create a playlist first!");
        const pNames = playlistsData.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
        const choice = prompt(`Add to:\n${pNames}`);
        const idx = parseInt(choice) - 1;
        if (playlistsData[idx]) {
            await fetch(`/api/playlists/${playlistsData[idx].id}/songs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(song)
            });
            alert("Added!");
        }
    };


    async function loadHistory() {
        const res = await fetch('/api/history');
        const history = await res.json();
        historyList.innerHTML = history.map(h => `
            <div class="history-item">
                <div class="hist-info"><p>"${h.text}"</p><span class="mood-tag">${h.mood}</span></div>
                <span class="time">${h.time}</span>
            </div>
        `).join('');
    }


    window.playSong = (url, title, art) => {
        activePlayQueue = [{ preview_url: url, title: title, album_art: art }];
        currentQueueIndex = 0;
        playCurrentQueueTrack();
    };

    window.playTrackFromQueue = (idx, queueType) => {
        if (queueType === 'favorites') activePlayQueue = favoritesQueue;
        else if (queueType === 'playlist') activePlayQueue = playlistQueue;
        else if (queueType === 'recs') activePlayQueue = recsQueue;
        else activePlayQueue = foryouQueue;
        
        currentQueueIndex = idx;
        playCurrentQueueTrack();
    };

    window.playCurrentQueueTrack = () => {
        if (currentQueueIndex < 0 || currentQueueIndex >= activePlayQueue.length) return;
        const song = activePlayQueue[currentQueueIndex];
        if (!song) return;
        
        playerPopup.style.display = 'block';
        
        if (!song.preview_url) {
            playerTitle.textContent = "Skipping: " + song.title + " (No preview)";
            playerArt.src = song.album_art || 'https://via.placeholder.com/300';
            setTimeout(() => {
                playNextSong();
            }, 1500);
            return;
        }
        
        audioPlayer.src = song.preview_url;
        audioPlayer.play().catch(err => {
            console.error("Playback error:", err);
        });
        playerTitle.textContent = song.title;
        playerArt.src = song.album_art || 'https://via.placeholder.com/300';
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        updateRowHighlighting();
    };

    window.playNextSong = () => {
        if (activePlayQueue.length === 0) return;
        currentQueueIndex = (currentQueueIndex + 1) % activePlayQueue.length;
        playCurrentQueueTrack();
    };

    window.playPrevSong = () => {
        if (activePlayQueue.length === 0) return;
        currentQueueIndex = (currentQueueIndex - 1 + activePlayQueue.length) % activePlayQueue.length;
        playCurrentQueueTrack();
    };

    function updateRowHighlighting() {
        const rows = document.querySelectorAll('.spotify-table-row');
        rows.forEach(row => {
            row.classList.remove('playing-highlight');
        });
        
        if (currentQueueIndex >= 0 && currentQueueIndex < activePlayQueue.length) {
            const currentSong = activePlayQueue[currentQueueIndex];
            rows.forEach(row => {
                const nameEl = row.querySelector('.spotify-row-name');
                const artistEl = row.querySelector('.spotify-row-artist');
                if (nameEl && artistEl) {
                    if (nameEl.textContent.trim().toLowerCase() === currentSong.title.trim().toLowerCase() &&
                        artistEl.textContent.trim().toLowerCase() === currentSong.artist.trim().toLowerCase()) {
                        row.classList.add('playing-highlight');
                    }
                }
            });
        }
    }

    closePlayer.onclick = () => { playerPopup.style.display = 'none'; audioPlayer.pause(); };
    playPauseBtn.onclick = () => {
        if (audioPlayer.paused) { audioPlayer.play(); playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; }
        else { audioPlayer.pause(); playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; }
    };
    audioPlayer.ontimeupdate = () => {
        progressBar.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
    };
    audioPlayer.onended = () => {
        playNextSong();
    };
    
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    if (prevBtn) prevBtn.onclick = () => playPrevSong();
    if (nextBtn) nextBtn.onclick = () => playNextSong();


    languagePills.forEach(pill => {
        pill.onclick = () => {
            languagePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentLang = pill.dataset.lang;
            if (currentPage === 'foryou') renderSongs(allSongs, songGrid, 'foryou');
        };
    });

    searchBtn.onclick = () => fetchRecommendations(moodInput.value);

    window.loadPlaylistRecommendations = async (playlist) => {
        const recsContainer = document.getElementById('playlist-recs-grid');
        if (!recsContainer) return;
        recsContainer.innerHTML = `<div style="color: var(--text-dim); font-size: 0.9rem; padding: 20px 0;"><i class="fas fa-spinner fa-spin"></i> Finding matching vibes...</div>`;
        
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
            else if (name.includes("love") || name.includes("romance") || name.includes("sweet")) mood = "Love";
            else if (name.includes("gym") || name.includes("workout") || name.includes("run") || name.includes("power")) mood = "Energetic";
            else if (name.includes("party") || name.includes("club") || name.includes("dance")) mood = "Party";
            else if (name.includes("calm") || name.includes("relax") || name.includes("chill") || name.includes("peace")) mood = "Calm";
        }
        
        try {
            const response = await fetch('/api/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mood, text: "" })
            });
            const data = await response.json();
            
            const existingTitles = new Set(playlist.songs.map(s => s.title.toLowerCase()));
            let filteredRecs = data.songs.filter(s => !existingTitles.has(s.title.toLowerCase()));
            
            // Re-shuffle to provide variety on Refresh
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
                        const safeTitle = song.title.replace(/'/g, "\\'");
                        const safeArt = song.album_art ? song.album_art.replace(/'/g, "\\'") : '';
                        const safeUrl = song.preview_url ? song.preview_url.replace(/'/g, "\\'") : '';
                        const songJson = JSON.stringify(song).replace(/"/g, '&quot;');
                        
                        return `
                            <div class="spotify-table-row">
                                <span class="spotify-row-index">${idx + 1}</span>
                                <div class="spotify-row-title-container" onclick="playTrackFromQueue(${idx}, 'recs')">
                                    <img src="${song.album_art || 'https://via.placeholder.com/300'}" alt="${song.title}">
                                    <div class="spotify-row-text">
                                        <span class="spotify-row-name">${song.title}</span>
                                        <span class="spotify-row-artist">${song.artist}</span>
                                    </div>
                                </div>
                                <span class="spotify-row-album">${song.album || '---'}</span>
                                <span class="spotify-row-duration">${formatDuration(song.duration_ms)}</span>
                                <div class="spotify-row-actions">
                                    <button class="submit-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--accent); border: none; border-radius: 500px; font-weight: bold; cursor: pointer;" onclick="addRecommendedSongToPlaylist(${playlist.id}, ${songJson})">
                                        <i class="fas fa-plus"></i> Add
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
            
        } catch (error) {
            console.error(error);
            recsContainer.innerHTML = `<p style="color: #ff476f; font-size: 0.9rem;">Failed to load recommendations.</p>`;
        }
    };

    window.addRecommendedSongToPlaylist = async (pid, song) => {
        await fetch(`/api/playlists/${pid}/songs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(song)
        });
        
        const res = await fetch('/api/playlists');
        playlistsData = await res.json();
        const updatedPlaylist = playlistsData.find(pl => pl.id === pid);
        if (updatedPlaylist) {
            renderPlaylistSongs(updatedPlaylist.songs, playlistSongsGrid, 'playlist-detail');
            loadPlaylistRecommendations(updatedPlaylist);
        }
    };

    window.refreshPlaylistRecommendations = () => {
        const p = playlistsData.find(pl => pl.id === activePlaylistId);
        if (p) {
            loadPlaylistRecommendations(p);
        }
    };


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
            alert("Microphone error: " + event.error);
        };

        voiceBtn.onclick = () => {
            if (isRecording) {
                recognition.stop();
            } else {
                recognition.start();
            }
        };
    } else {
        if (voiceBtn) voiceBtn.style.opacity = '0.3';
        if (voiceBtn) voiceBtn.title = "Speech recognition not supported in this browser";
    }
});
