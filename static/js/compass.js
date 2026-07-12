export class CompassController {
    constructor() {
        this.panel = document.getElementById('compass-panel');
        this.needle = document.getElementById('compass-needle');
        this.degreeText = document.getElementById('compass-degrees');
        this.dirText = document.getElementById('compass-direction');
        this.statusText = document.getElementById('compass-status');
        
        this.btnClose = document.getElementById('btn-compass-close');
        this.btnMinimize = document.getElementById('btn-compass-minimize');
        
        // Minimized HUD
        this.minHUD = document.getElementById('compass-minimized-hud');
        this.miniNeedle = document.getElementById('compass-mini-needle');
        this.miniDegreeText = document.getElementById('compass-mini-degrees');

        this.isOpen = false;
        this.isMinimized = false;
        this.heading = 0;
        this.init();
    }

    init() {
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.close());
        }
        if (this.btnMinimize) {
            this.btnMinimize.addEventListener('click', () => this.minimize());
        }
        if (this.minHUD) {
            this.minHUD.addEventListener('click', () => this.restore());
        }

        // Start listening to orientation (Works in background once browser allows)
        window.addEventListener('deviceorientation', (e) => this.handleOrientation(e), true);
        
        // Mobile Permission Request
        this.panel.addEventListener('click', () => {
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                DeviceOrientationEvent.requestPermission()
                    .then(permissionState => {
                        if (permissionState === 'granted') {
                            this.statusText.innerText = "MAGNETOMETER LOCKED";
                        }
                    })
                    .catch(console.error);
            }
        });
    }

    open() {
        if (this.isMinimized) {
            this.restore();
        } else {
            this.panel.classList.remove('hidden');
            this.isOpen = true;
        }
    }

    minimize() {
        this.panel.classList.add('hidden');
        this.minHUD.classList.remove('hidden');
        this.isMinimized = true;
        this.isOpen = false;
        
        // Tracking via Persistence if needed
        if (window.persistence) window.persistence.trackAppOpen('compass-minimized');
    }

    restore() {
        this.panel.classList.remove('hidden');
        this.minHUD.classList.add('hidden');
        this.isMinimized = false;
        this.isOpen = true;
    }

    handleOrientation(event) {
        let heading = 0;
        if (event.webkitCompassHeading) {
            heading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            heading = 360 - event.alpha;
        } else {
            return;
        }

        this.heading = Math.round(heading);
        this.updateUI();
    }

    updateUI() {
        // Main Panel Updates
        if (this.isOpen && this.needle) {
            this.needle.style.transform = `rotate(${this.heading}deg)`;
            this.degreeText.innerText = `${String(this.heading).padStart(3, '0')}°`;
            this.updateDirectionLabel();
        }

        // Minimized HUD Updates (Always active if sensor is running)
        if (this.miniNeedle) {
            this.miniNeedle.style.transform = `rotate(${this.heading}deg)`;
            this.miniDegreeText.innerText = `${this.heading}°`;
        }
    }

    updateDirectionLabel() {
        const directions = [
            { label: 'NORTH', min: 337.5, max: 360 },
            { label: 'NORTH', min: 0, max: 22.5 },
            { label: 'NORTH-EAST', min: 22.5, max: 67.5 },
            { label: 'EAST', min: 67.5, max: 112.5 },
            { label: 'SOUTH-EAST', min: 112.5, max: 157.5 },
            { label: 'SOUTH', min: 157.5, max: 202.5 },
            { label: 'SOUTH-WEST', min: 202.5, max: 247.5 },
            { label: 'WEST', min: 247.5, max: 292.5 },
            { label: 'NORTH-WEST', min: 292.5, max: 337.5 }
        ];

        const dir = directions.find(d => this.heading >= d.min && this.heading < d.max);
        if (dir) {
            this.dirText.innerText = dir.label;
        }
    }

    close() {
        this.panel.classList.add('hidden');
        this.minHUD.classList.add('hidden');
        this.isOpen = false;
        this.isMinimized = false;
    }
}
