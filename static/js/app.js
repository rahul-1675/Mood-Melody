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
        
        container.innerHTML = filtered.map(song => `
            <div class="song-card">
                <div onclick="playSong('${song.preview_url}', '${song.title}', '${song.album_art}')">
                    <img src="${song.album_art || 'https://via.placeholder.com/300'}" alt="${song.title}">
                    <h3>${song.title}</h3>
                    <p>${song.artist} • ${song.language || 'English'}</p>
                </div>
                <div class="song-actions">
                    ${type === 'favorites' ? 
                        `<button class="action-btn" onclick="deleteFavorite(${song.id})"><i class="fas fa-trash"></i></button>` : 
                        `<button class="action-btn" onclick="toggleFavorite(this, ${JSON.stringify(song).replace(/"/g, '&quot;')})"><i class="fas fa-heart"></i></button>`
                    }
                    ${type === 'playlist-detail' ? 
                        `<button class="action-btn" onclick="removeSongFromPlaylist(${song.id})"><i class="fas fa-minus-circle"></i></button>` : 
                        `<button class="action-btn" onclick="showPlaylistPicker(${JSON.stringify(song).replace(/"/g, '&quot;')})"><i class="fas fa-plus"></i></button>`
                    }
                </div>
            </div>
        `).join('');
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
        await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(song)
        });
        btn.classList.add('active');
        alert("Liked!");
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

    window.openPlaylist = (pid) => {
        const p = playlistsData.find(pl => pl.id === pid);
        if (p) {
            activePlaylistId = pid;
            document.getElementById('playlist-grid-view').style.display = 'none';
            document.getElementById('playlist-detail-view').style.display = 'block';
            document.getElementById('current-playlist-name').textContent = p.name;
            renderSongs(p.songs, playlistSongsGrid, 'playlist-detail');
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
        if (!url) return alert("No preview");
        playerPopup.style.display = 'block';
        audioPlayer.src = url;
        audioPlayer.play();
        playerTitle.textContent = title;
        playerArt.src = art || '';
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
    };

    closePlayer.onclick = () => { playerPopup.style.display = 'none'; audioPlayer.pause(); };
    playPauseBtn.onclick = () => {
        if (audioPlayer.paused) { audioPlayer.play(); playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>'; }
        else { audioPlayer.pause(); playPauseBtn.innerHTML = '<i class="fas fa-play"></i>'; }
    };
    audioPlayer.ontimeupdate = () => {
        progressBar.style.width = `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`;
    };


    languagePills.forEach(pill => {
        pill.onclick = () => {
            languagePills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            currentLang = pill.dataset.lang;
            if (currentPage === 'foryou') renderSongs(allSongs, songGrid, 'foryou');
        };
    });

    searchBtn.onclick = () => fetchRecommendations(moodInput.value);


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
