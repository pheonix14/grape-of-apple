import { UIController } from './ui.js';
import { SettingsController } from './settings.js';
import { MusicPlayer } from './music.js';
import { MapController } from './map.js';
import { TrackerController } from './tracker.js';
import { MicController } from './mic.js';
import { KeyboardController } from './keyboard.js';
import { IntelController } from './intel.js';

class App {
    constructor() {
        this.settings = new SettingsController();
        this.intel = new IntelController();
        
        this.ui = new UIController();
        this.music = new MusicPlayer(this.settings);
        this.map = new MapController(this.settings, this.intel);
        this.tracker = new TrackerController(this.map, this.music);
        this.mic = new MicController(this.settings);
        this.keyboard = new KeyboardController();

        this.init();
    }

    init() {
        // Start hand tracking
        this.tracker.start();
        
        console.log("SNAI OS 2: Neural Link Established.");
    }
}

// Initialize app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
