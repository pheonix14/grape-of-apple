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
        this.scrollTrack = document.getElementById('music-scroll-track');
        this.scrollThumb = document.getElementById('music-scroll-thumb');
        
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

        this.miniControls = document.getElementById('mini-controls');
        this.btnMiniPlay = document.getElementById('btn-mini-play');
        this.btnMiniNext = document.getElementById('btn-mini-next');
        this.btnMiniPrev = document.getElementById('btn-mini-prev');
        this.btnMiniLoop = document.getElementById('btn-mini-loop');
        this.miniPlayIcon = document.getElementById('mini-play-icon');

        this.isPlaying = false;
        this.isLooping = false;
        this.isMinimized = false;
        this.isDraggingScroll = false;
        this.tracks = [];
        this.currentTrackIndex = -1;
        this.controlsTimeout = null;

        this.bindEvents();
        this.loadDefaultLibrary();
        window.addEventListener('resize', () => this.resizeCanvas());
        this.mediaList.addEventListener('scroll', () => this.updateThumbFromScroll());
    }

    updateThumbFromScroll() {
        if (this.isDraggingScroll) return;
        const scrollPct = this.mediaList.scrollTop / (this.mediaList.scrollHeight - this.mediaList.clientHeight);
        const trackHeight = this.scrollTrack.clientHeight - this.scrollThumb.clientHeight - 16; // 16 for padding
        this.scrollThumb.style.top = `${8 + (scrollPct * trackHeight)}px`;
    }

    handleHandGesture(hand) {
        if (!hand) return;

        // 1. Handle Library Scroll (Main Panel)
        if (!this.window.classList.contains('hidden') && !this.isMinimized) {
            const trackRect = this.scrollTrack.getBoundingClientRect();
            const isNearThumb = (
                hand.x >= trackRect.left - 20 && 
                hand.x <= trackRect.right + 20 && 
                hand.y >= trackRect.top && 
                hand.y <= trackRect.bottom
            );

            if (hand.isPinching && isNearThumb) {
                this.isDraggingScroll = true;
                this.scrollThumb.classList.add('bg-blue-400', 'scale-110');
                let relativeY = hand.y - trackRect.top - (this.scrollThumb.clientHeight / 2);
                const maxScroll = trackRect.height - this.scrollThumb.clientHeight - 16;
                relativeY = Math.max(8, Math.min(relativeY, maxScroll + 8));
                this.scrollThumb.style.top = `${relativeY}px`;
                const scrollPct = (relativeY - 8) / maxScroll;
                this.mediaList.scrollTop = scrollPct * (this.mediaList.scrollHeight - this.mediaList.clientHeight);
            } else {
                if (this.isDraggingScroll) {
                    this.isDraggingScroll = false;
                    this.scrollThumb.classList.remove('bg-blue-400', 'scale-110');
                }
            }
        }

        // 2. Handle Mini Player Pop-up Controls (Mini Player)
        if (this.isMinimized && !this.miniPlayer.classList.contains('hidden')) {
            const miniRect = this.miniPlayer.getBoundingClientRect();
            const isOnMini = (
                hand.x >= miniRect.left && 
                hand.x <= miniRect.right && 
                hand.y >= miniRect.top && 
                hand.y <= miniRect.bottom
            );

            if (hand.isPinching && isOnMini) {
                this.showMiniControls();
            }
        }
    }

    showMiniControls() {
        this.miniControls.classList.remove('opacity-0', 'pointer-events-none', 'scale-75');
        this.miniControls.classList.add('opacity-100', 'pointer-events-auto', 'scale-100');
        
        if (this.controlsTimeout) clearTimeout(this.controlsTimeout);
        this.controlsTimeout = setTimeout(() => {
            this.miniControls.classList.add('opacity-0', 'pointer-events-none', 'scale-75');
            this.miniControls.classList.remove('opacity-100', 'pointer-events-auto', 'scale-100');
        }, 3000);
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
            document.body.classList.remove('music-minimized');
            this.settings.setAppOpen(false);
            if (this.isPlaying) {
                this.audioElement.pause();
                this.isPlaying = false;
                this.updatePlayBtn();
            }
            if (this.ctx && this.canvas) this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            if (this.miniCtx && this.miniCanvas) this.miniCtx.clearRect(0, 0, this.miniCanvas.width, this.miniCanvas.height);
        });

        this.btnMinimize.addEventListener('click', () => this.minimize());
        this.miniCanvas.addEventListener('dblclick', () => this.maximize());
        
        // Mini Controls Events
        this.btnMiniPlay.addEventListener('click', (e) => {
            e.stopPropagation();
            this.togglePlay();
        });
        this.btnMiniNext.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playNext();
        });
        this.btnMiniPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            this.playPrev();
        });
        this.btnMiniLoop.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleLoop();
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

        this.btnPlay.addEventListener('click', () => this.togglePlay());

        this.btnLoop.addEventListener('click', () => this.toggleLoop());
        
        this.audioElement.onended = () => {
            if (!this.isLooping) this.playNext();
        };
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        this.audioElement.loop = this.isLooping;
        this.updatePlayBtn(); // Sync UI
    }

    togglePlay() {
        if (this.audioElement.src && this.ytContainer.classList.contains('hidden')) {
            if (this.isPlaying) this.audioElement.pause();
            else {
                this.initAudioContext();
                this.audioElement.play();
            }
            this.isPlaying = !this.isPlaying;
            this.updatePlayBtn();
        }
    }

    playNext() {
        if (this.tracks.length > 0) {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
            this.playFromServer(this.tracks[this.currentTrackIndex]);
        }
    }

    playPrev() {
        if (this.tracks.length > 0) {
            this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
            this.playFromServer(this.tracks[this.currentTrackIndex]);
        }
    }

    minimize() {
        this.window.classList.add('hidden');
        this.miniPlayer.classList.remove('hidden');
        this.isMinimized = true;
        document.body.classList.add('music-minimized');
        this.settings.setAppOpen(true, 'music');
        setTimeout(() => this.resizeCanvas(), 50);
    }

    maximize() {
        this.window.classList.remove('hidden');
        this.miniPlayer.classList.add('hidden');
        this.isMinimized = false;
        document.body.classList.remove('music-minimized');
        this.settings.setAppOpen(true, 'music');
        setTimeout(() => this.resizeCanvas(), 100);
    }

    async loadDefaultLibrary() {
        this.mediaList.innerHTML = '<div class="text-[8px] opacity-30 uppercase tracking-[0.2em] px-2 py-4 font-bold animate-pulse text-center">Syncing Files...</div>';
        try {
            const response = await fetch(`/api/media?t=${Date.now()}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const tracks = await response.json();
            console.log("🎵 Media Library Loaded:", tracks);
            if (tracks && tracks.length > 0) {
                this.renderMediaList(tracks);
            } else {
                this.mediaList.innerHTML = '<div class="text-[8px] opacity-30 uppercase tracking-[0.2em] px-2 py-4 font-bold text-center">No Files Found</div>';
            }
        } catch (error) {
            console.error("❌ Failed to fetch media library:", error);
            this.mediaList.innerHTML = '<div class="text-[8px] opacity-30 uppercase tracking-[0.2em] px-2 py-4 font-bold text-red-400 text-center">Nexus Sync Failed</div>';
        }
    }

    renderMediaList(songs) {
        this.tracks = songs; // Store tracks for next/prev
        console.log("🎨 Rendering Media List with tracks:", songs);
        this.mediaList.innerHTML = '<div class="text-[8px] opacity-30 uppercase tracking-[0.2em] px-2 py-1.5 font-bold">Library</div>';
        
        songs.forEach((song, index) => {
            const item = document.createElement('div');
            item.className = 'flex items-center justify-between bg-white/5 hover:bg-white/10 px-3 py-2.5 rounded-xl text-sm interactable transition-all mb-1 group';
            
            const parts = song.split(' - ');
            const title = parts[0] || song;
            const subtitle = parts.length > 1 ? parts.slice(1).join(' - ').split('.')[0] : 'System Source';
            
            item.innerHTML = `
                <div class="flex flex-col truncate pr-2">
                    <span class="truncate text-white/80 font-bold text-[11px]">${title}</span>
                    <span class="truncate text-[8px] text-white/30 uppercase tracking-widest">${subtitle}</span>
                </div>
                <svg class="w-3 h-3 text-white/20 group-hover:text-blue-400 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            `;
            item.onclick = () => {
                this.currentTrackIndex = index;
                this.playFromServer(song);
            };
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
        const icon = this.isPlaying 
            ? `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`
            : `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
        
        this.btnPlay.innerHTML = icon;
        this.btnLoop.classList.toggle('bg-white/20', this.isLooping);
        this.btnLoop.classList.toggle('text-blue-400', this.isLooping);
        
        if (this.miniPlayIcon) {
            this.miniPlayIcon.innerHTML = this.isPlaying
                ? `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`
                : `<path d="M8 5v14l11-7z"/>`;
        }
        
        if (this.btnMiniLoop) {
            this.btnMiniLoop.classList.toggle('text-blue-400', this.isLooping);
            this.btnMiniLoop.classList.toggle('text-white/40', !this.isLooping);
        }
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

        // FREEZE VISUALIZER: If paused, skip drawing (keeps current waveform)
        if (!this.isPlaying) return;

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
