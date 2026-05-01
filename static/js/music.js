export class MusicPlayer {
    constructor(settingsController) {
        this.settings = settingsController;
        this.window = document.getElementById('music-player');
        this.btnClose = document.getElementById('btn-close');
        this.btnPlay = document.getElementById('btn-play');
        this.btnLoop = document.getElementById('btn-loop');
        this.fileInput = document.getElementById('music-file-input');
        
        this.ytInput = document.getElementById('yt-link-input');
        this.ytLoadBtn = document.getElementById('btn-yt-load');
        this.ytContainer = document.getElementById('yt-player-container');
        this.ytIframe = document.getElementById('yt-iframe');
        
        this.mediaList = document.getElementById('media-list');
        
        this.canvas = document.getElementById('visualizer-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioElement = document.getElementById('audio-element');
        
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.animationId = null;

        this.isPlaying = false;
        this.isLooping = false;

        this.bindEvents();
        this.loadDefaultLibrary();
        
        // Ensure canvas matches its container size
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
        }
    }

    bindEvents() {
        // App Icon click
        document.querySelector('[data-app="music"]').addEventListener('click', () => {
            this.window.classList.remove('hidden');
            this.settings.setAppOpen(true);
            setTimeout(() => this.resizeCanvas(), 100);
        });

        // Close
        this.btnClose.addEventListener('click', () => {
            this.window.classList.add('hidden');
            this.settings.setAppOpen(false);
            if (this.isPlaying) {
                this.audioElement.pause();
                this.isPlaying = false;
                this.updatePlayBtn();
            }
        });

        // Local File Input
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.playLocalFile(file);
            }
        });

        // YouTube Load Button
        this.ytLoadBtn.addEventListener('click', () => {
            const url = this.ytInput.value.trim();
            if (url) {
                let embedUrl = "";
                let videoId = "";
                
                if (url.includes('v=')) {
                    videoId = url.split('v=')[1].split('&')[0];
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
                } else if (url.includes('youtu.be/')) {
                    videoId = url.split('youtu.be/')[1].split('?')[0];
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
                } else if (url.includes('playlist?list=')) {
                    const listId = url.split('list=')[1].split('&')[0];
                    embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1&enablejsapi=1`;
                }

                // If looping is on, try to force it for single videos
                if (this.isLooping && videoId) {
                    embedUrl += `&loop=1&playlist=${videoId}`;
                }

                if (this.isPlaying) {
                    this.audioElement.pause();
                    this.isPlaying = false;
                    this.updatePlayBtn();
                }

                this.canvas.classList.add('hidden');
                this.ytContainer.classList.remove('hidden');
                this.ytIframe.src = embedUrl;
            }
        });

        // Play/Pause Button
        this.btnPlay.addEventListener('click', () => {
            if (this.audioElement.src && this.ytContainer.classList.contains('hidden')) {
                if (this.isPlaying) {
                    this.audioElement.pause();
                } else {
                    this.initAudioContext();
                    this.audioElement.play();
                }
                this.isPlaying = !this.isPlaying;
                this.updatePlayBtn();
            }
        });

        // Loop Button
        this.btnLoop.addEventListener('click', () => {
            this.isLooping = !this.isLooping;
            this.audioElement.loop = this.isLooping;
            
            if (this.isLooping) {
                this.btnLoop.classList.add('bg-white/20', 'text-[#0ff]');
                this.btnLoop.classList.remove('bg-white/5', 'text-white');
            } else {
                this.btnLoop.classList.remove('bg-white/20', 'text-[#0ff]');
                this.btnLoop.classList.add('bg-white/5', 'text-white');
            }
        });
    }

    async loadDefaultLibrary() {
        try {
            const response = await fetch('/api/media');
            if (response.ok) {
                const songs = await response.json();
                this.renderMediaList(songs);
            } else {
                this.renderMediaList(['Sample Track 1.mp3', 'Ambient Vibe.mp3']);
            }
        } catch (e) {
            this.renderMediaList(['Theme Song.mp3']);
        }
    }

    renderMediaList(songs) {
        this.mediaList.innerHTML = '<div class="text-sm opacity-50 uppercase tracking-widest mb-4 font-bold">Local Library</div>';
        songs.forEach(song => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between bg-white/5 hover:bg-white/10 px-6 py-4 rounded-2xl text-lg interactable transition-all mb-2';
            item.innerHTML = `
                <span class="truncate pr-4">${song}</span>
                <svg class="w-6 h-6 opacity-50" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            `;
            item.onclick = () => this.playFromServer(song);
            this.mediaList.appendChild(item);
        });
    }

    playLocalFile(file) {
        this.ytContainer.classList.add('hidden');
        this.canvas.classList.remove('hidden');
        this.ytIframe.src = "";
        const url = URL.createObjectURL(file);
        this.audioElement.src = url;
        this.audioElement.load();
        this.initAudioContext();
        this.audioElement.play();
        this.isPlaying = true;
        this.updatePlayBtn();
        this.resizeCanvas();
    }

    playFromServer(filename) {
        this.ytContainer.classList.add('hidden');
        this.canvas.classList.remove('hidden');
        this.ytIframe.src = "";
        this.audioElement.src = `/static/media/${filename}`;
        this.audioElement.load();
        this.initAudioContext();
        this.audioElement.play();
        this.isPlaying = true;
        this.updatePlayBtn();
        this.resizeCanvas();
    }

    updatePlayBtn() {
        this.btnPlay.innerHTML = this.isPlaying 
            ? `<svg class="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
            : `<svg class="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    }

    initAudioContext() {
        if (!this.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;
            this.source = this.audioContext.createMediaElementSource(this.audioElement);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.draw();
        } else if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    draw() {
        this.animationId = requestAnimationFrame(() => this.draw());
        this.analyser.getByteFrequencyData(this.dataArray);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const barWidth = (this.canvas.width / this.dataArray.length) * 1.5;
        let x = 0;
        for(let i = 0; i < this.dataArray.length; i++) {
            const barHeight = (this.dataArray[i] / 255) * this.canvas.height;
            
            // Vibrant gradient effect
            const hue = (i / this.dataArray.length) * 360;
            this.ctx.fillStyle = `hsla(${hue}, 80%, 50%, 0.8)`;
            
            // Rounded bars
            this.ctx.beginPath();
            this.ctx.roundRect(x, this.canvas.height - barHeight, barWidth - 2, barHeight, 5);
            this.ctx.fill();
            
            x += barWidth;
        }
    }
}
