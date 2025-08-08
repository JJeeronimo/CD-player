document.addEventListener('DOMContentLoaded', () => {
    const cdPlayerWindow = document.getElementById('cdPlayerWindow');
    const playButton = document.getElementById('playButton');
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');
    const nextButton = document.getElementById('nextTrackButton');
    const previousButton = document.getElementById('previousTrackButton');
    const ejectButton = document.getElementById('ejectButton');
    const timeDisplay = document.getElementById('text2');
    const totalPlayDisplay = document.querySelector('.status-bar-field:first-child');
    const trackTimeDisplay = document.querySelector('.status-bar-field:last-child');
    const volumeControl = document.querySelector('.volume-control');
    const volumeSlider = document.getElementById('volumeSlider');
    const fileInput = document.getElementById('fileInput');
    const menuAddMusic = document.getElementById('menuAddMusic');

    // Inicialize a playlist como um array vazio
    const playlist = [];
    
    const audio = new Audio();
    let currentTrackIndex = 0;
    let isPlaying = false;
    let isShuffle = false;
    let isContinuous = true;

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
        }
    }

    function pauseMusic() { audio.pause(); isPlaying = false; }
    
    function stopMusic() {
        audio.pause();
        audio.currentTime = 0;
        isPlaying = false;
        if (playlist.length > 0) {
            timeDisplay.textContent = `[${String(currentTrackIndex + 1).padStart(2, '0')}] 00:00`;
            trackTimeDisplay.textContent = `Track: 00:00 m:s`;
        } else {
            updateDisplay(true);
        }
    }
    
    function loadTrack(trackIndex, autoplay = false) {
        if (playlist.length === 0) {
            updateDisplay(true);
            return;
        }
        currentTrackIndex = trackIndex;
        audio.src = playlist[currentTrackIndex].url;
        updateDisplay();
        if (autoplay) {
            audio.play();
            isPlaying = true;
        }
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

    function ejectDisc() {
        stopMusic();
        audio.src = '';
        updateDisplay(true);
    }

    playButton.addEventListener('click', playMusic);
    pauseButton.addEventListener('click', pauseMusic);
    stopButton.addEventListener('click', stopMusic);
    nextButton.addEventListener('click', nextTrack);
    previousButton.addEventListener('click', previousTrack);
    ejectButton.addEventListener('click', ejectDisc);
    
    audio.addEventListener('timeupdate', () => {
        if (isPlaying && playlist.length > 0) {
            const { currentTime, duration } = audio;
            totalPlayDisplay.textContent = `Total Play: ${formatTime(duration)} m:s`;
            trackTimeDisplay.textContent = `Track: ${formatTime(currentTime)} m:s`;
            timeDisplay.textContent = `[${String(currentTrackIndex + 1).padStart(2, '0')}] ${formatTime(currentTime)}`;
        }
    });
    
    audio.addEventListener('ended', () => {
        if (isContinuous) { nextTrack(); } else { stopMusic(); isPlaying = false; }
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

    document.getElementById('menuEject').addEventListener('click', () => { ejectDisc(); closeAllMenus(); });
    menuAddMusic.addEventListener('click', () => {
        fileInput.click();
        closeAllMenus();
    });
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const fileURL = URL.createObjectURL(file);
            const title = file.name.replace(/\.[^/.]+$/, "");
            const newTrack = {
                artist: "Artista Desconhecido",
                title: title,
                url: fileURL,
                albumCoverUrl: "https://images2.imgbox.com/42/89/JIRoQjUo_o.png"
            };
            playlist.push(newTrack);
            loadTrack(playlist.length - 1, true);
            fileInput.value = '';
        }
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
    
    window.addEventListener('click', closeAllMenus);
    
    updateDisplay(true);
});