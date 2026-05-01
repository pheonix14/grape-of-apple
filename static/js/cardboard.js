export class CardboardController {
    constructor() {
        this.isActive = false;
        this.ipd = 0;
        this.vOff = 0;
        this.vScale = 1.0;

        this.panel = document.getElementById('cardboard-panel');
        this.btnConfig = document.getElementById('btn-cardboard-config');
        this.btnClose = document.getElementById('btn-cardboard-panel-close');
        
        this.rangeIpd = document.getElementById('range-ipd');
        this.rangeVoff = document.getElementById('range-voff');
        this.rangeVscale = document.getElementById('range-vscale');
        
        this.valIpd = document.getElementById('val-ipd');
        this.valVoff = document.getElementById('val-voff');
        this.valVscale = document.getElementById('val-vscale');
        
        this.bindEvents();
        this.updateStyles(); // Ensure variables are set on boot
    }

    bindEvents() {
        if (this.btnConfig) {
            this.btnConfig.addEventListener('click', () => this.togglePanel(true));
        }
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.togglePanel(false));
        }

        // Neural Toggle Listener
        document.getElementById('btn-cardboard-toggle')?.addEventListener('click', () => {
            this.toggleMode();
        });

        // Calibration Inputs
        this.rangeIpd?.addEventListener('input', (e) => {
            this.ipd = e.target.value;
            this.valIpd.innerText = `${this.ipd}px`;
            this.updateStyles();
        });

        this.rangeVoff?.addEventListener('input', (e) => {
            this.vOff = e.target.value;
            this.valVoff.innerText = `${this.vOff}px`;
            this.updateStyles();
        });

        this.rangeVscale?.addEventListener('input', (e) => {
            this.vScale = e.target.value;
            this.valVscale.innerText = this.vScale;
            this.updateStyles();
        });
    }

    toggleMode() {
        this.isActive = !this.isActive;
        if (this.isActive) {
            document.body.classList.add('cardboard-mode');
            this.setupSplitScreen();
        } else {
            document.body.classList.remove('cardboard-mode');
            this.teardownSplitScreen();
        }
    }

    setupSplitScreen() {
        // Since duplication is heavy, we'll use a simpler trick:
        // Wrap everything in a main container and use a specialized layout.
        // For a true "No Lens" experience, we'll rely on the CSS grid split.
        console.log("Entering Neural Cardboard Mode...");
    }

    teardownSplitScreen() {
        console.log("Exiting Neural Cardboard Mode...");
    }

    togglePanel(show) {
        if (show) {
            this.panel.classList.remove('hidden');
            setTimeout(() => {
                this.panel.classList.remove('opacity-0');
                this.panel.classList.add('opacity-100');
            }, 10);
        } else {
            this.panel.classList.add('opacity-0');
            this.panel.classList.remove('opacity-100');
            setTimeout(() => this.panel.classList.add('hidden'), 300);
        }
    }

    updateStyles() {
        document.documentElement.style.setProperty('--ipd-offset', `${this.ipd}px`);
        document.documentElement.style.setProperty('--v-offset', `${this.vOff}px`);
        document.documentElement.style.setProperty('--view-scale', `${this.vScale}`);
    }
}
