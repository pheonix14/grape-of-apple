export class MusicPlayer {
    constructor() {
        this.container = document.getElementById('music-player');
        this.audio = document.getElementById('audio-element');
        this.fileInput = document.getElementById('music-file-input');
        this.canvas = document.getElementById('visualizer-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.btnPlay = document.getElementById('btn-play');
        this.btnMin = document.getElementById('btn-min');
        this.btnClose = document.getElementById('btn-close');
        
        this.isMinimized = false;
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        
        this.bindEvents();
    }

    bindEvents() {
        // App icon click (from ui.js or main.js) to open
        document.querySelector('[data-app="music"]').addEventListener('click', () => {
            this.container.classList.remove('hidden');
        });

        this.btnClose.addEventListener('click', () => {
            this.container.classList.add('hidden');
            this.audio.pause();
        });

        this.btnMin.addEventListener('click', () => {
            this.isMinimized = !this.isMinimized;
            if (this.isMinimized) {
                this.container.classList.add('minimized');
            } else {
                this.container.classList.remove('minimized');
            }
        });

        this.btnPlay.addEventListener('click', () => {
            if (this.audio.paused) {
                this.audio.play();
                this.btnPlay.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
                this.initAudioContext();
            } else {
                this.audio.pause();
                this.btnPlay.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;
            }
        });

        this.fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                this.audio.src = url;
                this.audio.play();
                this.btnPlay.innerHTML = `<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`;
                this.initAudioContext();
            }
        });
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.source = this.audioContext.createMediaElementSource(this.audio);
            
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
            
            this.analyser.fftSize = 256;
            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
            
            this.draw();
        }
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    draw() {
        requestAnimationFrame(() => this.draw());
        
        this.analyser.getByteFrequencyData(this.dataArray);
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        const barWidth = (width / this.bufferLength) * 2.5;
        let barHeight;
        let x = 0;
        
        for (let i = 0; i < this.bufferLength; i++) {
            barHeight = this.dataArray[i] / 2;
            
            // Tron style cyan or just generic white/glassy
            const isTron = document.body.classList.contains('tron-ares');
            if (isTron) {
                this.ctx.fillStyle = `rgb(0, ${barHeight + 100}, 255)`;
            } else {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${barHeight / 255})`;
            }
            
            this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }
    }
}
