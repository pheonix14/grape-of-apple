export class MusicPlayer {
    constructor() {
        this.window = document.getElementById('music-player');
        this.btnMin = document.getElementById('btn-min');
        this.btnClose = document.getElementById('btn-close');
        this.btnPlay = document.getElementById('btn-play');
        this.btnLoop = document.getElementById('btn-loop');
        this.fileInput = document.getElementById('music-file-input');
        
        this.ytInput = document.getElementById('yt-link-input');
        this.ytLoadBtn = document.getElementById('btn-yt-load');
        this.ytContainer = document.getElementById('yt-player-container');
        this.ytIframe = document.getElementById('yt-iframe');
        
        this.canvas = document.getElementById('visualizer-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioElement = document.getElementById('audio-element');
        
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.animationId = null;

        this.isPlaying = false;
        this.isMinimized = false;
        this.isLooping = false;

        this.bindEvents();
    }

    bindEvents() {
        // App Icon click
        document.querySelector('[data-app="music"]').addEventListener('click', () => {
            this.window.classList.remove('hidden');
            if (this.isMinimized) {
                this.window.classList.remove('minimized');
                this.isMinimized = false;
            }
        });

        // Close
        this.btnClose.addEventListener('click', () => {
            this.window.classList.add('hidden');
            if (this.isPlaying) {
                this.audioElement.pause();
                this.isPlaying = false;
                this.updatePlayBtn();
            }
        });

        // Minimize
        this.btnMin.addEventListener('click', () => {
            this.isMinimized = !this.isMinimized;
            if (this.isMinimized) {
                this.window.classList.add('minimized');
            } else {
                this.window.classList.remove('minimized');
            }
        });

        // Local File Input
        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Hide YT iframe if active
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
            }
        });

        // YouTube Load Button
        this.ytLoadBtn.addEventListener('click', () => {
            const url = this.ytInput.value.trim();
            if (url) {
                // Try to extract video ID or Playlist ID
                let embedUrl = "";
                if (url.includes('youtube.com/watch?v=')) {
                    const vidId = url.split('v=')[1].split('&')[0];
                    embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1`;
                } else if (url.includes('youtu.be/')) {
                    const vidId = url.split('youtu.be/')[1].split('?')[0];
                    embedUrl = `https://www.youtube.com/embed/${vidId}?autoplay=1`;
                } else if (url.includes('youtube.com/playlist?list=')) {
                    const listId = url.split('list=')[1].split('&')[0];
                    embedUrl = `https://www.youtube.com/embed/videoseries?list=${listId}&autoplay=1`;
                } else {
                    alert("Please enter a valid YouTube Video or Playlist URL.");
                    return;
                }

                // Pause local audio
                if (this.isPlaying) {
                    this.audioElement.pause();
                    this.isPlaying = false;
                    this.updatePlayBtn();
                }

                // Show iframe, hide canvas
                this.canvas.classList.add('hidden');
                this.ytContainer.classList.remove('hidden');
                this.ytIframe.src = embedUrl;
            }
        });

        // Play/Pause Button
        this.btnPlay.addEventListener('click', () => {
            if (this.audioElement.src && !this.ytContainer.classList.contains('hidden') === false) {
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
                this.btnLoop.classList.add('text-[#0ff]'); // highlight
            } else {
                this.btnLoop.classList.remove('text-[#0ff]');
            }
        });
    }

    updatePlayBtn() {
        if (this.isPlaying) {
            // Pause Icon
            this.btnPlay.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
        } else {
            // Play Icon
            this.btnPlay.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
        }
    }

    initAudioContext() {
        if (!this.audioContext) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioContext();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            this.source = this.audioContext.createMediaElementSource(this.audioElement);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            
            this.draw();
        } else {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
        }
    }

    draw() {
        this.animationId = requestAnimationFrame(() => this.draw());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const barWidth = (this.canvas.width / this.dataArray.length) * 2.5;
        let barHeight;
        let x = 0;
        
        for(let i = 0; i < this.dataArray.length; i++) {
            barHeight = this.dataArray[i] / 2;
            
            // Neon cyan/blue styling
            const hue = i * 2;
            this.ctx.fillStyle = `hsl(${200 + hue}, 100%, 50%)`;
            
            this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
}
