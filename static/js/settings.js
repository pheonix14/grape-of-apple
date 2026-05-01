export class SettingsController {
    constructor() {
        this.btnSettings = document.getElementById('settings-btn');
        this.panel = document.getElementById('settings-panel');
        
        this.isOpen = false;
        
        // CSS Variables to track
        this.appSize = 64; // px
        this.hoverScale = 1.25;
        this.cameraZoom = 1.0;
        this.textSize = 16; // px
        
        // Themes: 0=Default, 1=Tron Cyan, 2=Tron Red
        this.themeState = 0;

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

        // Text Size
        document.getElementById('btn-text-down').addEventListener('click', () => {
            this.textSize = Math.max(10, this.textSize - 2);
            this.updateStyles();
        });
        document.getElementById('btn-text-up').addEventListener('click', () => {
            this.textSize = Math.min(32, this.textSize + 2);
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

        // Border Color Customization
        const colorPicker = document.getElementById('border-color-picker');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                document.documentElement.style.setProperty('--app-border-color', e.target.value);
            });
        }

        // Theme Buttons
        const allThemes = ['tron-legacy', 'tron-ares-rb', 'tron-ares-rw', 'tron-ares-bw'];

        document.getElementById('btn-theme-normal').addEventListener('click', () => {
            document.body.classList.remove(...allThemes);
        });

        document.getElementById('btn-theme-legacy').addEventListener('click', () => {
            document.body.classList.remove(...allThemes);
            document.body.classList.add('tron-legacy');
        });

        document.getElementById('btn-theme-ares-rb').addEventListener('click', () => {
            document.body.classList.remove(...allThemes);
            document.body.classList.add('tron-ares-rb');
        });

        document.getElementById('btn-theme-ares-rw').addEventListener('click', () => {
            document.body.classList.remove(...allThemes);
            document.body.classList.add('tron-ares-rw');
        });

        document.getElementById('btn-theme-ares-bw').addEventListener('click', () => {
            document.body.classList.remove(...allThemes);
            document.body.classList.add('tron-ares-bw');
        });
    }

    togglePanel() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.panel.classList.remove('hidden');
            setTimeout(() => {
                this.panel.classList.remove('opacity-0', '-translate-x-4', 'pointer-events-none');
                this.panel.classList.add('opacity-100', 'translate-x-0', 'pointer-events-auto');
            }, 10);
        } else {
            this.panel.classList.remove('opacity-100', 'translate-x-0', 'pointer-events-auto');
            this.panel.classList.add('opacity-0', '-translate-x-4', 'pointer-events-none');
            setTimeout(() => {
                this.panel.classList.add('hidden');
            }, 300);
        }
    }

    updateStyles() {
        document.documentElement.style.setProperty('--app-size', `${this.appSize}px`);
        document.documentElement.style.setProperty('--hover-scale', `${this.hoverScale}`);
        document.documentElement.style.setProperty('--camera-zoom', `${this.cameraZoom}`);
        document.documentElement.style.setProperty('--text-size', `${this.textSize}px`);
    }
}
