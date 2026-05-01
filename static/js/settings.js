export class SettingsController {
    constructor() {
        this.btnSettings = document.getElementById('settings-btn');
        this.panel = document.getElementById('settings-panel');
        
        this.isOpen = false;
        
        // CSS Variables to track
        this.appSize = 64; // px
        this.hoverScale = 1.25;
        this.cameraZoom = 1.0;
        this.tronTheme = false;

        this.bindEvents();
    }

    bindEvents() {
        // Toggle panel
        this.btnSettings.addEventListener('click', () => this.togglePanel());

        // Panel Size
        document.getElementById('btn-size-down').addEventListener('click', () => {
            this.appSize = Math.max(32, this.appSize - 8);
            this.updateStyles();
        });
        document.getElementById('btn-size-up').addEventListener('click', () => {
            this.appSize = Math.min(128, this.appSize + 8);
            this.updateStyles();
        });

        // Hover Physics
        document.getElementById('btn-hover-down').addEventListener('click', () => {
            this.hoverScale = Math.max(1.0, this.hoverScale - 0.1);
            this.updateStyles();
        });
        document.getElementById('btn-hover-up').addEventListener('click', () => {
            this.hoverScale = Math.min(2.0, this.hoverScale + 0.1);
            this.updateStyles();
        });

        // Camera Zoom
        document.getElementById('btn-zoom-down').addEventListener('click', () => {
            this.cameraZoom = Math.max(1.0, this.cameraZoom - 0.2);
            this.updateStyles();
        });
        document.getElementById('btn-zoom-up').addEventListener('click', () => {
            this.cameraZoom = Math.min(3.0, this.cameraZoom + 0.2);
            this.updateStyles();
        });

        // TRON Theme Toggle
        document.getElementById('btn-theme-toggle').addEventListener('click', () => {
            this.tronTheme = !this.tronTheme;
            const knob = document.getElementById('theme-toggle-knob');
            if (this.tronTheme) {
                document.body.classList.add('tron-ares');
                knob.style.transform = 'translateX(100%)';
                knob.style.backgroundColor = '#0ff';
            } else {
                document.body.classList.remove('tron-ares');
                knob.style.transform = 'translateX(0)';
                knob.style.backgroundColor = 'white';
            }
        });
    }

    togglePanel() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.panel.classList.remove('hidden');
            // small delay to allow display block to apply before opacity transition
            setTimeout(() => {
                this.panel.classList.remove('opacity-0', 'scale-95', 'pointer-events-none');
                this.panel.classList.add('opacity-100', 'scale-100', 'pointer-events-auto');
            }, 10);
        } else {
            this.panel.classList.remove('opacity-100', 'scale-100', 'pointer-events-auto');
            this.panel.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
            setTimeout(() => {
                this.panel.classList.add('hidden');
            }, 300); // match duration
        }
    }

    updateStyles() {
        document.documentElement.style.setProperty('--app-size', `${this.appSize}px`);
        document.documentElement.style.setProperty('--hover-scale', `${this.hoverScale}`);
        document.documentElement.style.setProperty('--camera-zoom', `${this.cameraZoom}`);
    }
}
