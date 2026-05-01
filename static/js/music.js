export class MusicPlayer {
    constructor(settingsController) {
        this.settings = settingsController;
        this.window = document.getElementById('music-player');
        this.btnClose = document.getElementById('btn-close');
        this.btnMinimize = document.getElementById('btn-minimize');
        this.miniPlayer = document.getElementById('mini-player');
        
        this.btnPlay = document.getElementById('btn-play');
        this.btnLoop = document.getElementById('btn-loop');
        this.fileInput = document.getElementById('music-file-input');
        
        this.ytInput = document.getElementById('yt-link-input');
        this.ytLoadBtn = document.getElementById('btn-yt-load');
        this.ytContainer = document.getElementById('yt-player-container');
        this.ytIframe = document.getElementById('yt-iframe');
        
        this.mediaList = document.getElementById('media-list');
        
        this.canvas = document.getElementById('visualizer-canvas');
        this.miniCanvas = document.getElementById('mini-visualizer-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.miniCtx = this.miniCanvas.getContext('2d');
        
        this.audioElement = document.getElementById('audio-element');
        
        this.nowPlayingTitle = document.getElementById('now-playing-title');
        this.nowPlayingArtist = document.getElementById('now-playing-artist');
        
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.animationId = null;

        this.isPlaying = false;
        this.isLooping = false;
        this.isMinimized = false;

        this.bindEvents();
        this.loadDefaultLibrary();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (this.canvas) {
            this.canvas.width = this.canvas.clientWidth;
            this.canvas.height = this.canvas.clientHeight;
        }
        if (this.miniCanvas) {
            this.miniCanvas.width = this.miniCanvas.clientWidth;
            this.miniCanvas.height = this.miniCanvas.clientHeight;
        }
    }

    bindEvents() {
        document.querySelector('[data-app="music"]').addEventListener('click', () => {
            this.maximize();
        });

        this.btnClose.addEventListener('click', () => {
            this.window.classList.add('hidden');
            this.miniPlayer.classList.add('hidden');
            this.isMinimized = false;
            this.settings.setAppOpen(false);
            if (this.isPlaying) {
                this.audioElement.pause();
                this.isPlaying = false;
                this.updatePlayBtn();
            }
        });

        this.btnMinimize.addEventListener('click', () => this.minimize());
        this.miniCanvas.addEventListener('dblclick', () => this.maximize());
        this.miniCanvas.addEventListener('click', () => {
            if (this.audioElement.src) {
                if (this.isPlaying) this.audioElement.pause();
                else this.audioElement.play();
                this.isPlaying = !this.isPlaying;
                this.updatePlayBtn();
            }
        });

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) this.playLocalFile(file);
        });

        this.ytLoadBtn.addEventListener('click', () => {
            const url = this.ytInput.value.trim();
            if (url) {
                let embedUrl = "";
                if (url.includes('v=')) {
                    const videoId = url.split('v=')[1].split('&')[0];
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&enablejsapi=1`;
                }
                if (this.isPlaying) {
                    this.audioElement.pause();
                    this.isPlaying = false;
                    this.updatePlayBtn();
                }
                this.nowPlayingTitle.innerText = "YouTube Stream";
                this.nowPlayingArtist.innerText = "External Mission Data";
                this.canvas.classList.add('hidden');
                this.ytContainer.classList.remove('hidden');
                this.ytIframe.src = embedUrl;
            }
        });

        this.btnPlay.addEventListener('click', () => {
            if (this.audioElement.src && this.ytContainer.classList.contains('hidden')) {
                if (this.isPlaying) this.audioElement.pause();
                else {
                    this.initAudioContext();
                    this.audioElement.play();
                }
                this.isPlaying = !this.isPlaying;
                this.updatePlayBtn();
            }
        });

        this.btnLoop.addEventListener('click', () => {
            this.isLooping = !this.isLooping;
            this.audioElement.loop = this.isLooping;
            this.btnLoop.classList.toggle('bg-white/20', this.isLooping);
        });
    }

    minimize() {
        this.window.classList.add('hidden');
        this.miniPlayer.classList.remove('hidden');
        this.isMinimized = true;
        this.settings.setAppOpen(false);
        setTimeout(() => this.resizeCanvas(), 50);
    }

    maximize() {
        this.window.classList.remove('hidden');
        this.miniPlayer.classList.add('hidden');
        this.isMinimized = false;
        this.settings.setAppOpen(true);
        setTimeout(() => this.resizeCanvas(), 100);
    }

    loadDefaultLibrary() {
        const tracks = [
            'Nine Inch Nails - As Alive As You Need Me To Be (Official Music Video) - Nine Inch Nails (128k).mp3'
        ];
        this.renderMediaList(tracks);
    }

    renderMediaList(songs) {
        this.mediaList.innerHTML = '<div class="text-[10px] opacity-30 uppercase tracking-[0.2em] px-4 py-2 font-bold">Tactical Library</div>';
        songs.forEach(song => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between bg-white/5 hover:bg-white/10 px-4 py-3 rounded-xl text-sm interactable transition-all mb-1 group';
            item.innerHTML = `
                <div class="flex flex-col truncate">
                    <span class="truncate text-white/80 font-bold">${song.split(' - ')[0]}</span>
                    <span class="truncate text-[10px] text-white/30 uppercase tracking-widest">${song.split(' - ')[1] || 'Unknown Source'}</span>
                </div>
                <svg class="w-4 h-4 text-white/20 group-hover:text-blue-400" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            `;
            item.onclick = () => this.playFromServer(song);
            this.mediaList.appendChild(item);
        });
    }

    playLocalFile(file) {
        this.ytContainer.classList.add('hidden');
        this.canvas.classList.remove('hidden');
        this.ytIframe.src = "";
        this.audioElement.src = URL.createObjectURL(file);
        this.audioElement.load();
        this.nowPlayingTitle.innerText = file.name.split('.')[0];
        this.nowPlayingArtist.innerText = "Local Intelligence File";
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
        this.audioElement.src = `/static/media/${encodeURIComponent(filename)}`;
        this.audioElement.load();
        
        const parts = filename.split(' - ');
        this.nowPlayingTitle.innerText = parts[0] || filename;
        this.nowPlayingArtist.innerText = parts[1]?.split('.')[0] || "System Library";
        
        this.initAudioContext();
        this.audioElement.play();
        this.isPlaying = true;
        this.updatePlayBtn();
        this.resizeCanvas();
    }

    updatePlayBtn() {
        this.btnPlay.innerHTML = this.isPlaying 
            ? `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
            : `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.source = this.audioContext.createMediaElementSource(this.audioElement);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.draw();
        } else if (this.audioContext.state === 'suspended') this.audioContext.resume();
    }

    draw() {
        this.animationId = requestAnimationFrame(() => this.draw());
        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(this.dataArray);
        const themeColor = getComputedStyle(document.body).getPropertyValue('--text-primary').trim() || '#00d2ff';

        const drawVisualizer = (ctx, canvas) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const bufferLength = this.dataArray.length;
            const barWidth = (canvas.width / bufferLength) * 1.2;
            
            ctx.shadowBlur = 15;
            ctx.shadowColor = themeColor;
            
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (this.dataArray[i] / 255) * (canvas.height * 0.8);
                
                ctx.fillStyle = themeColor;
                ctx.globalAlpha = 0.7;

                // Symmetric Mirrored Bars from center
                const xOffset = i * barWidth;
                
                // Right side
                ctx.beginPath();
                ctx.roundRect(centerX + xOffset, centerY - barHeight / 2, barWidth - 2, barHeight, 5);
                ctx.fill();

                // Left side
                ctx.beginPath();
                ctx.roundRect(centerX - xOffset - barWidth, centerY - barHeight / 2, barWidth - 2, barHeight, 5);
                ctx.fill();
            }
            
            ctx.shadowBlur = 0; // Reset for performance
        };

        if (!this.isMinimized) {
            drawVisualizer(this.ctx, this.canvas);
        } else {
            drawVisualizer(this.miniCtx, this.miniCanvas);
        }
    }
}
