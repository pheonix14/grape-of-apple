import { UIController } from './ui.js';
import { HandTracker } from './tracker.js';
import { SettingsController } from './settings.js';
import { CardboardController } from './cardboard.js';
import { MusicPlayer } from './music.js?v=2';
import { MapController } from './map.js';
import { MicAssistant } from './mic.js?v=5';
import { PageController } from './pages.js';
import { VirtualKeyboard } from './keyboard.js';
import { PersistenceManager } from './persistence.js';
import { TravelReports } from './travel_reports.js';
import { CompassController } from './compass.js';
import { AuthController } from './auth.js';
import { RewardEngine } from './rewards.js';
import { MessageHub } from './messages.js';

document.addEventListener('DOMContentLoaded', () => {
    const videoElement = document.getElementById('input_video');
    const persistence = new PersistenceManager();
    
    // Core Controllers (Lightweight)
    const ui = new UIController();
    const settings = new SettingsController();
    const cardboard = new CardboardController();
    const pages = new PageController();
    const keyboard = new VirtualKeyboard();
    window.virtualKeyboard = keyboard;
    window.rewardEngine = new RewardEngine(persistence);
    window.messageHub = new MessageHub();

    // Heavy Controllers (Deferred/Lazy)
    let map = null;
    let music = null;
    let mic = null;
    let travelReports = null;
    let compass = null;
    let auth = null;

    const initMap = () => {
        if (!map) {
            console.log('[SYSTEM] LAZY LOADING MAP PANEL...');
            map = new MapController(settings);
            window.mapController = map;
            if (!mic) initMic(); // Mic usually depends on Map
            persistence.trackAppOpen('map');
        }
        return map;
    };

    const initMusic = () => {
        if (!music) {
            console.log('[SYSTEM] LAZY LOADING MUSIC PANEL...');
            music = new MusicPlayer(settings);
            window.musicController = music;
            persistence.trackAppOpen('music');
        }
        return music;
    };

    const initMic = () => {
        if (!mic) {
            console.log('[SYSTEM] INITIALIZING TACTICAL ASSISTANT...');
            // Ensure map is available for location commands
            const mapInstance = initMap();
            // We pass travelReports function so mic can lazy-init it if needed
            mic = new MicAssistant(mapInstance, initTravelReports, persistence);
            window.micController = mic;
            persistence.trackAppOpen('mic');
        }
        return mic;
    };

    const initTravelReports = () => {
        if (!travelReports) {
            console.log('[SYSTEM] LAZY LOADING TRAVEL REPORTS...');
            travelReports = new TravelReports(persistence);
            persistence.trackAppOpen('travel-reports');
        }
        travelReports.open();
        return travelReports;
    };

    const initCompass = () => {
        if (!compass) {
            console.log('[SYSTEM] LAZY LOADING COMPASS...');
            compass = new CompassController();
            persistence.trackAppOpen('compass');
        }
        compass.open();
        return compass;
    };

    const initAuth = () => {
        if (!auth) {
            console.log('[SYSTEM] LAZY LOADING TACTICAL IDENTITY PORTAL...');
            auth = new AuthController();
            persistence.trackAppOpen('auth');
        }
        auth.open();
        return auth;
    };

    // Pre-load top-used apps to prevent lag if they are common
    if (persistence.isTopUsed('map')) initMap();
    if (persistence.isTopUsed('music')) initMusic();
    if (persistence.isTopUsed('settings')) persistence.trackAppOpen('settings');

    // Bind UI clicks to lazy initialization
    document.querySelectorAll('[data-app]').forEach(btn => {
        btn.addEventListener('click', () => {
            const app = btn.getAttribute('data-app');
            if (app === 'map') initMap();
            if (app === 'music') initMusic();
            if (app === 'travel-reports') initTravelReports();
            if (app === 'compass') initCompass();
            if (app === 'auth') initAuth();
        });
    });

    const micBtn = document.getElementById('btn-mic-toggle');
    if (micBtn) {
        micBtn.addEventListener('click', () => {
            const m = initMic();
            if (m) m.toggle();
        });
    }

    // Settings panel also tracked
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => persistence.trackAppOpen('settings'));
    }

    // Initialize Hand Tracker with callback
    const tracker = new HandTracker(videoElement, (hand) => {
        const indexTip = hand[8];
        const thumbTip = hand[4];

        let screenX;
        if (settings.isMirrored) {
            screenX = (1 - indexTip.x) * window.innerWidth;
        } else {
            screenX = indexTip.x * window.innerWidth;
        }
        
        const screenY = indexTip.y * window.innerHeight;
        ui.updateCursor(screenX, screenY);

        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const dz = indexTip.z - thumbTip.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        const PINCH_THRESHOLD = 0.08; 
        const isPinching = distance < PINCH_THRESHOLD;
        ui.setPinching(isPinching);

        const gestureData = {
            x: screenX,
            y: screenY,
            isPinching: isPinching,
            pinchDistance: distance
        };

        // Pass hand state to controllers ONLY if initialized
        if (map) map.handleHandGesture(gestureData);
        if (music) music.handleHandGesture(gestureData);
        if (travelReports) travelReports.handleHandGesture(gestureData);
        if (auth) auth.handleHandGesture(gestureData);
        pages.handleHandGesture(gestureData);
    });

    tracker.start();
});
