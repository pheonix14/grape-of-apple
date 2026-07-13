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
        
        this.init();
    }

    init() {
        console.log("🚀 Initializing Tactical Cardboard Engine...");
        
        // Mode Toggle
        const toggleBtn = document.getElementById('btn-cardboard-toggle');
        if (toggleBtn) {
            toggleBtn.onclick = () => {
                console.log("🔄 Cardboard Toggle Clicked");
                this.toggleMode();
            };
        }

        // Config Panel
        if (this.btnConfig) {
            this.btnConfig.onclick = () => {
                console.log("⚙️ Opening Cardboard Config");
                this.togglePanel(true);
            };
        }

        if (this.btnClose) {
            this.btnClose.onclick = () => this.togglePanel(false);
        }

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

        // Physics Fix Button
        const physicsBtn = document.getElementById('btn-physics-fix');
        if (physicsBtn) {
            physicsBtn.onclick = () => {
                console.log("🧬 Applying Tactical Physics Specs (8cm Fix)");
                this.ipd = 35; // Convergence Offset
                this.vOff = -5; // Gaze curvature fix
                this.vScale = 0.75; // Near-field focus fix
                
                // Update UI elements
                if (this.rangeIpd) this.rangeIpd.value = this.ipd;
                if (this.rangeVoff) this.rangeVoff.value = this.vOff;
                if (this.rangeVscale) this.rangeVscale.value = this.vScale;
                
                if (this.valIpd) this.valIpd.innerText = `${this.ipd}px`;
                if (this.valVoff) this.valVoff.innerText = `${this.vOff}px`;
                if (this.valVscale) this.valVscale.innerText = this.vScale;
                
                this.updateStyles();
            };
        }

        this.updateStyles();
    }

    toggleMode() {
        this.isActive = !this.isActive;
        const body = document.body;
        const mediaRight = document.getElementById('media-right');
        const videoRight = document.getElementById('input_video_right');

        if (this.isActive) {
            body.classList.add('cardboard-mode');
            if (mediaRight) mediaRight.classList.remove('hidden');
            
            // Sync video streams
            const videoLeft = document.getElementById('input_video');
            if (videoLeft && videoRight && videoLeft.srcObject) {
                videoRight.srcObject = videoLeft.srcObject;
            }
            this.updateStyles();
        } else {
            body.classList.remove('cardboard-mode');
            if (mediaRight) mediaRight.classList.add('hidden');
        }
    }

    setupSplitScreen() {
        // Since duplication is heavy, we'll use a simpler trick:
        // Wrap everything in a main container and use a specialized layout.
        // For a true "No Lens" experience, we'll rely on the CSS grid split.
        console.log("Entering Tactical Cardboard Mode...");
    }

    teardownSplitScreen() {
        console.log("Exiting Tactical Cardboard Mode...");
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
