export class SettingsController {
    constructor() {
        this.btnSettings = document.getElementById('settings-btn');
        this.panel = document.getElementById('settings-panel');
        
        this.isOpen = false;
        
        // CSS Variables to track
        this.appSize = 64; 
        this.hoverScale = 1.25;
        this.cameraZoom = 1.0;
        this.textSize = 16; 
        this.panelScale = 1.0;
        
        this.themeState = 0;
        this.isMirrored = true; 

        this.bindEvents();
        this.updateStyles(); // Ensure variables are set on boot
    }

    bindEvents() {
        // Toggle panel
        this.btnSettings.addEventListener('click', () => this.togglePanel());

        // Panel/Icon Size
        document.getElementById('btn-size-down').addEventListener('click', (e) => {
            e.stopPropagation();
            this.appSize = Math.max(32, this.appSize - 8);
            this.panelScale = Math.max(0.5, this.panelScale - 0.1);
            this.updateStyles();
        });
        document.getElementById('btn-size-up').addEventListener('click', (e) => {
            e.stopPropagation();
            this.appSize = Math.min(160, this.appSize + 8);
            this.panelScale = Math.min(2.0, this.panelScale + 0.1);
            this.updateStyles();
        });

        // Text Size
        document.getElementById('btn-text-down').addEventListener('click', (e) => {
            e.stopPropagation();
            this.textSize = Math.max(10, this.textSize - 2);
            this.updateStyles();
        });
        document.getElementById('btn-text-up').addEventListener('click', (e) => {
            e.stopPropagation();
            this.textSize = Math.min(32, this.textSize + 2);
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

        // Mirror Toggle
        document.getElementById('btn-mirror-toggle').addEventListener('click', () => {
            this.isMirrored = !this.isMirrored;
            console.log("🔄 Mirror Toggled:", this.isMirrored);
            this.updateStyles();
        });

        // Cockpit Toggle
        const cockpitBtn = document.getElementById('btn-cockpit-toggle');
        if (cockpitBtn) {
            cockpitBtn.addEventListener('click', () => {
                document.body.classList.toggle('cockpit-mode');
                const isActive = document.body.classList.contains('cockpit-mode');
                cockpitBtn.innerText = isActive ? 'Disengage Cockpit' : 'Engage Cockpit Mode';
                cockpitBtn.classList.toggle('bg-blue-500/40', isActive);
            });
        }
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
        document.documentElement.style.setProperty('--panel-scale', `${this.panelScale}`);
        document.documentElement.style.setProperty('--text-size', `${this.textSize}px`);
        document.documentElement.style.setProperty('--mirror-scale', this.isMirrored ? '-1' : '1');
    }

    // Helper to set app-open state
    setAppOpen(isOpen) {
        if (isOpen) {
            document.body.classList.add('app-open');
        } else {
            document.body.classList.remove('app-open');
        }
    }
}
