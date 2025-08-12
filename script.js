document.addEventListener('DOMContentLoaded', () => {
    const cdPlayerWindow = document.getElementById('cdPlayerWindow');
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');
    const nextButton = document.getElementById('nextTrackButton');
    const previousButton = document.getElementById('previousTrackButton');
    
    const rewindButton = document.getElementById('rewindButton');
    const forwardButton = document.getElementById('forwardButton');
    const queueButton = document.getElementById('queueButton');
    const playlistContainer = document.getElementById('playlistContainer');
    const playlistView = document.getElementById('playlistView');
    
    // REMOVIDO: O botão de voltar não é mais necessário
    // const backButton = document.getElementById('backButton');
    const windowBody = document.querySelector('.window-body');

    const timeDisplay = document.getElementById('text2');
    const totalPlayDisplay = document.querySelector('.status-bar-field:first-child');
    const trackTimeDisplay = document.querySelector('.status-bar-field:last-child');
    const volumeControl = document.querySelector('.volume-control');
    const volumeSlider = document.getElementById('volumeSlider');
    const fileInput = document.getElementById('fileInput');
    const menuAddMusic = document.getElementById('menuAddMusic');
    const menuEject = document.getElementById('menuEject');

    let playlist = [];
    
    const audio = new Audio();
    let currentTrackIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    let isContinuous = true;
    let lastKnownTime = 0;

    let db;
    const request = indexedDB.open("JeronimoPlayerDB", 1);

    request.onerror = function(event) {
        console.error("IndexedDB error:", event.target.errorCode);
    };

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        db.createObjectStore("playlistStore", { keyPath: "id", autoIncrement: true });
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        loadSavedPlaylist();
    };

    function savePlaylist() {
        localStorage.setItem('currentTrackIndex', currentTrackIndex);
        localStorage.setItem('lastKnownTime', audio.currentTime);
        localStorage.setItem('isPlaying', isPlaying);
    }

    function loadSavedPlaylist() {
        const transaction = db.transaction(["playlistStore"], "readonly");
        const objectStore = transaction.objectStore("playlistStore");
        const getRequest = objectStore.getAll();

        getRequest.onsuccess = function(event) {
            playlist = event.target.result;
            const savedIndex = localStorage.getItem('currentTrackIndex');
            currentTrackIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
            const savedTime = localStorage.getItem('lastKnownTime');
            lastKnownTime = savedTime ? parseFloat(savedTime) : 0;
            
            if (playlist.length > 0) {
                const currentTrack = playlist[currentTrackIndex];
                if (currentTrack && currentTrack.audioFile) {
                    const blobUrl = URL.createObjectURL(currentTrack.audioFile);
                    audio.src = blobUrl;
                }
                updateDisplay();
                updatePlaylistView();
            }
        };
    }

    document.body.addEventListener('click', () => {
        if (!isPlaying && playlist.length > 0) {
            const savedIsPlaying = localStorage.getItem('isPlaying');
            if (savedIsPlaying === 'true') {
                audio.currentTime = lastKnownTime;
                audio.play();
                isPlaying = true;
            }
        }
    }, { once: true });

    function updateDisplay(isEjected = false) {
        const root = document.documentElement;
        if (playlist.length === 0 || isEjected) {
            root.style.setProperty('--artist', `"No Disc"`);
            root.style.setProperty('--title', `""`);
            root.style.setProperty('--albumcover', `none`);
            timeDisplay.textContent = `[--] --:--`;
            totalPlayDisplay.textContent = 'Total Play: --:-- m:s';
            trackTimeDisplay.textContent = 'Track: --:-- m:s';
        } else {
            const currentTrack = playlist[currentTrackIndex];
            root.style.setProperty('--artist', `"${currentTrack.artist}"`);
            root.style.setProperty('--title', `"${currentTrack.title}"`);
            root.style.setProperty('--albumcover', `url('${currentTrack.albumCoverUrl}')`);
            
            updatePlaylistView();
        }
    }

    function formatTime(seconds) {
        if (isNaN(seconds)) return "00:00";
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }

    function playMusic() {
        if (playlist.length === 0) {
            alert('Por favor, adicione uma música primeiro.');
            return;
        }
        if (!audio.src || audio.src.includes('about:blank')) {
            loadTrack(0, true);
        } else {
            audio.play();
            isPlaying = true;
            updatePlaylistView(); // NOVO: Atualiza o indicador de play
            savePlaylist();
        }
    }

    function pauseMusic() { 
        audio.pause(); 
        isPlaying = false; 
        updatePlaylistView(); // NOVO: Atualiza o indicador de play
        savePlaylist();
    }
    
    function stopMusic() {
        audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        updatePlaylistView(); // NOVO: Atualiza o indicador de play
        if (playlist.length > 0) {
            timeDisplay.textContent = `[${String(currentTrackIndex + 1).padStart(2, '0')}] 00:00`;
            trackTimeDisplay.textContent = `Track: 00:00 m:s`;
        } else {
            updateDisplay(true);
        }
        savePlaylist();
    }
    
    function loadTrack(trackIndex, autoplay = false) {
        if (playlist.length === 0 || trackIndex < 0 || trackIndex >= playlist.length) {
            updateDisplay(true);
            return;
        }
        currentTrackIndex = trackIndex;
        
        const blobUrl = URL.createObjectURL(playlist[currentTrackIndex].audioFile);
        audio.src = blobUrl;

        updateDisplay();
        if (autoplay) {
            audio.play().then(() => {
                isPlaying = true;
                updatePlaylistView(); // Atualiza a view com o indicador de play
            }).catch(e => console.error("Erro ao tocar áudio:", e));
        }
        savePlaylist();
    }

    function nextTrack() {
        if (playlist.length === 0) return;
        let newIndex;
        if (isShuffle) {
            do { newIndex = Math.floor(Math.random() * playlist.length); } while (playlist.length > 1 && newIndex === currentTrackIndex);
        } else {
            newIndex = (currentTrackIndex + 1) % playlist.length;
        }
        loadTrack(newIndex, true);
    }

    function previousTrack() {
        if (playlist.length === 0) return;
        const newIndex = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(newIndex, true);
    }
    
    function forward() {
        audio.currentTime = Math.min(audio.currentTime + 15, audio.duration);
    }

    function rewind() {
        audio.currentTime = Math.max(audio.currentTime - 15, 0);
    }

    function ejectDisc() {
        stopMusic();
        playlist = [];
        audio.src = '';
        updateDisplay(true);
        const transaction = db.transaction(["playlistStore"], "readwrite");
        const objectStore = transaction.objectStore("playlistStore");
        objectStore.clear();
        localStorage.removeItem('currentTrackIndex');
        localStorage.removeItem('isPlaying');
        localStorage.removeItem('lastKnownTime');
        updatePlaylistView();
    }
    
    // NOVO: Função única para abrir/fechar a playlist
    function togglePlaylist() {
        playlistContainer.classList.toggle('active');
        if (playlistContainer.classList.contains('active')) {
            updatePlaylistView();
        }
    }

    // NOVO: Função para remover uma faixa específica
    function removeTrack(indexToRemove) {
        if (indexToRemove === currentTrackIndex) {
            stopMusic();
        }

        playlist.splice(indexToRemove, 1);

        const transaction = db.transaction(["playlistStore"], "readwrite");
        const objectStore = transaction.objectStore("playlistStore");
        objectStore.clear().onsuccess = () => {
            if (playlist.length > 0) {
                const addTransaction = db.transaction(["playlistStore"], "readwrite");
                const addObjectStore = addTransaction.objectStore("playlistStore");
                playlist.forEach(track => addObjectStore.add(track));
            }
        };

        if (currentTrackIndex > indexToRemove) {
            currentTrackIndex--;
        } else if (currentTrackIndex >= playlist.length && playlist.length > 0) {
            currentTrackIndex = 0;
        }
        
        savePlaylist();
        updatePlaylistView();
        updateDisplay(playlist.length === 0);
    }

    // MODIFICADO: Lógica de exibição da lista
    function updatePlaylistView() {
        playlistView.innerHTML = '';
        if (playlist.length === 0) {
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'Nenhuma música adicionada.';
            emptyMessage.style.textAlign = 'center';
            emptyMessage.style.fontStyle = 'italic';
            playlistView.appendChild(emptyMessage);
            return;
        }

        playlist.forEach((track, index) => {
            const li = document.createElement('li');
            const isCurrentlyPlaying = (index === currentTrackIndex && isPlaying);
            const trackNumber = String(index + 1).padStart(2, '0');

            li.innerHTML = `
                <span class="track-info ${isCurrentlyPlaying ? 'playing-indicator' : ''}">
                    ${isCurrentlyPlaying ? '►' : trackNumber + '.'}
                </span>
                <span class="track-title">${track.artist} - ${track.title}</span>
                <span class="track-duration">${track.duration ? formatTime(track.duration) : '--:--'}</span>
                <button class="remove-track-btn" data-index="${index}">×</button>
            `;

            if (index === currentTrackIndex) {
                li.classList.add('active');
            }

            li.querySelector('.track-title').addEventListener('click', () => {
                loadTrack(index, true);
            });

            li.querySelector('.remove-track-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                removeTrack(index);
            });

            playlistView.appendChild(li);
        });
    }

    playButton.addEventListener('click', playMusic);
    pauseButton.addEventListener('click', pauseMusic);
    stopButton.addEventListener('click', stopMusic);
    nextButton.addEventListener('click', nextTrack);
    previousButton.addEventListener('click', previousTrack);
    forwardButton.addEventListener('click', forward);
    rewindButton.addEventListener('click', rewind);
    
    // MODIFICADO: Listener para o botão de fila
    queueButton.addEventListener('click', togglePlaylist);
    
    audio.addEventListener('timeupdate', () => {
        if (isPlaying && playlist.length > 0 && !isNaN(audio.duration)) {
            const { currentTime, duration } = audio;
            totalPlayDisplay.textContent = `Total Play: ${formatTime(duration)} m:s`;
            trackTimeDisplay.textContent = `Track: ${formatTime(currentTime)} m:s`;
            timeDisplay.textContent = `[${String(currentTrackIndex + 1).padStart(2, '0')}] ${formatTime(currentTime)}`;
        }
    });
    
    audio.addEventListener('ended', () => {
        if (isContinuous) { nextTrack(); } else { stopMusic(); }
    });

    volumeSlider.addEventListener('input', (e) => { audio.volume = e.target.value; });
    
    const menuItems = document.querySelectorAll('.menu-item');
    function closeAllMenus() {
        menuItems.forEach(item => item.classList.remove('active'));
    }

    menuItems.forEach(item => {
        item.querySelector('span').addEventListener('click', (event) => {
            event.stopPropagation();
            const wasActive = item.classList.contains('active');
            closeAllMenus();
            if (!wasActive) item.classList.add('active');
        });
    });

    menuEject.addEventListener('click', () => { ejectDisc(); closeAllMenus(); });
    menuAddMusic.addEventListener('click', () => {
        fileInput.click();
        closeAllMenus();
    });

    // MODIFICADO: Lógica de adição de arquivo para incluir duração
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('audio/')) {
            if (file) alert("Por favor, selecione um arquivo de áudio válido.");
            fileInput.value = '';
            return;
        }

        const addTrackToPlaylist = (tags, duration) => {
            let albumCoverUrl = "https://images2.imgbox.com/42/89/JIRoQjUo_o.png";
            if (tags.picture) {
                const { data, format } = tags.picture;
                let base64String = data.reduce((acc, byte) => acc + String.fromCharCode(byte), '');
                albumCoverUrl = `data:${format};base64,${window.btoa(base64String)}`;
            }

            const newTrack = {
                artist: tags.artist || "Artista Desconhecido",
                title: tags.title || file.name.replace(/\.[^/.]+$/, ""),
                albumCoverUrl: albumCoverUrl,
                audioFile: file,
                duration: duration
            };
            
            const transaction = db.transaction(["playlistStore"], "readwrite");
            const objectStore = transaction.objectStore("playlistStore");
            const addRequest = objectStore.add(newTrack);

            addRequest.onsuccess = function() {
                playlist.push(newTrack);
                loadTrack(playlist.length - 1, true);
            };
            addRequest.onerror = function(e) {
                console.error("Erro ao adicionar faixa ao DB:", e.target.error);
            };
        };

        const tempAudio = new Audio(URL.createObjectURL(file));
        tempAudio.addEventListener('loadedmetadata', () => {
            const duration = tempAudio.duration;
            URL.revokeObjectURL(tempAudio.src); // Limpa a memória

            window.jsmediatags.read(file, {
                onSuccess: (tag) => {
                    addTrackToPlaylist(tag.tags, duration);
                },
                onError: (error) => {
                    console.log('Erro ao ler as tags:', error.type, error.info);
                    addTrackToPlaylist({}, duration); // Adiciona com tags vazias
                }
            });
        });

        fileInput.value = '';
    });
    
    document.getElementById('menuViewNormal').addEventListener('click', () => {
        cdPlayerWindow.classList.remove('compact');
        volumeControl.classList.remove('active');
        closeAllMenus();
    });
    document.getElementById('menuViewCompact').addEventListener('click', () => {
        cdPlayerWindow.classList.add('compact');
        volumeControl.classList.remove('active');
        closeAllMenus();
    });
    document.getElementById('menuViewVolume').addEventListener('click', () => {
        volumeControl.classList.toggle('active');
        closeAllMenus();
    });

    const randomCheck = document.querySelector('#menuOptRandom .checkmark');
    document.getElementById('menuOptRandom').addEventListener('click', () => {
        isShuffle = !isShuffle;
        randomCheck.classList.toggle('active', isShuffle);
        randomCheck.innerHTML = isShuffle ? '✓' : '';
        closeAllMenus();
    });

    const continuousCheck = document.querySelector('#menuOptContinuous .checkmark');
    document.getElementById('menuOptContinuous').addEventListener('click', () => {
        isContinuous = !isContinuous;
        continuousCheck.classList.toggle('active', isContinuous);
        continuousCheck.innerHTML = isContinuous ? '✓' : '';
        closeAllMenus();
    });
    
    window.addEventListener('keydown', (e) => {
        if (e.altKey) {
            const key = e.key.toLowerCase();
            let menuToClick = null;
            if (key === 'd') {
                menuToClick = document.querySelector('.menu-item:nth-child(1) > span');
            } else if (key === 'v') {
                menuToClick = document.querySelector('.menu-item:nth-child(2) > span');
            } else if (key === 'o') {
                menuToClick = document.querySelector('.menu-item:nth-child(3) > span');
            }
            
            if (menuToClick) {
                e.preventDefault();
                menuToClick.click();
            }
        }
    });

    window.addEventListener('click', closeAllMenus);
    
    updateDisplay(!playlist.length);
});
