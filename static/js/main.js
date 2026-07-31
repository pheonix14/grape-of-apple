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
import { AIController } from './ai.js';

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
    let aiHub = null;

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
            console.log('[SYSTEM] INITIALIZING ASSISTANT...');
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

    window.initCompass = () => {
        if (!compass) {
            console.log('[SYSTEM] LAZY LOADING COMPASS...');
            compass = new CompassController();
            window.compassController = compass;
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

    const initAIHub = (openPanel = true) => {
        if (!aiHub) {
            console.log('[SYSTEM] INITIALIZING AI INTEL HUB...');
            aiHub = new AIController(settings);
            window.aiController = aiHub;
            persistence.trackAppOpen('ai-hub');
        }
        if (openPanel) aiHub.open();
        return aiHub;
    };
    window.initAIHub = initAIHub;
    initAIHub(false); // Eagerly instantiate background listener & TTS engine

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
            if (app === 'compass') window.initCompass();
            if (app === 'auth') initAuth();
            if (app === 'ai-hub') initAIHub();
        });
    });

    const micBtn = document.getElementById('btn-mic-toggle');
    if (micBtn) {
        micBtn.addEventListener('click', () => {
            const ai = initAIHub();
            if (ai.btnStt) {
                // If it's closed, open it and click STT. If it's already listening, stop it.
                ai.btnStt.click();
            }
        });
    }

    // Settings panel also tracked
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => persistence.trackAppOpen('settings'));
    }

    // Global gesture dispatcher
    let lastHandActiveTime = 0;

    const dispatchGesture = (screenX, screenY, isPinching, isSynthetic = true) => {
        ui.updateCursor(screenX, screenY);
        ui.setPinching(isPinching, isSynthetic);

        const gestureData = {
            x: screenX,
            y: screenY,
            isPinching: isPinching,
            pinchDistance: isPinching ? 0.01 : 1.0
        };

        // Pass hand state to controllers ONLY if initialized
        if (map) map.handleHandGesture(gestureData);
        if (music) music.handleHandGesture(gestureData);
        if (travelReports) travelReports.handleHandGesture(gestureData);
        if (auth) auth.handleHandGesture(gestureData);
        if (compass) compass.handleHandGesture(gestureData);
        pages.handleHandGesture(gestureData);
    };

    // Initialize Hand Tracker with callback
    const tracker = new HandTracker(videoElement, (hand) => {
        lastHandActiveTime = Date.now();

        const indexTip = hand[8];
        const thumbTip = hand[4];

        let screenX;
        if (settings.isMirrored) {
            screenX = (1 - indexTip.x) * window.innerWidth;
        } else {
            screenX = indexTip.x * window.innerWidth;
        }
        
        const screenY = indexTip.y * window.innerHeight;

        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const dz = indexTip.z - thumbTip.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        const PINCH_THRESHOLD = 0.08; 
        const isPinching = distance < PINCH_THRESHOLD;

        dispatchGesture(screenX, screenY, isPinching, true);
    });

    tracker.start();

    // Mouse & Touch fallback listeners (only active when hand tracking is inactive)
    let isMouseDown = false;

    const handleMouseEvent = (e, isPinching) => {
        if (Date.now() - lastHandActiveTime < 1000) return; // Hand tracker has priority
        dispatchGesture(e.clientX, e.clientY, isPinching, false);
    };

    window.addEventListener('mousemove', (e) => {
        handleMouseEvent(e, isMouseDown);
    }, { passive: true });

    window.addEventListener('mousedown', (e) => {
        isMouseDown = true;
        handleMouseEvent(e, true);
    });

    window.addEventListener('mouseup', (e) => {
        isMouseDown = false;
        handleMouseEvent(e, false);
    });

    // Touch support (mobile/tablet equivalent)
    const handleTouchEvent = (e, isPinching) => {
        if (Date.now() - lastHandActiveTime < 1000) return; // Hand tracker has priority
        if (e.touches && e.touches.length > 0) {
            const touch = e.touches[0];
            dispatchGesture(touch.clientX, touch.clientY, isPinching, false);
        } else if (e.changedTouches && e.changedTouches.length > 0) {
            const touch = e.changedTouches[0];
            dispatchGesture(touch.clientX, touch.clientY, isPinching, false);
        }
    };

    window.addEventListener('touchstart', (e) => {
        handleTouchEvent(e, true);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
        handleTouchEvent(e, true);
    }, { passive: true });

    window.addEventListener('touchend', (e) => {
        handleTouchEvent(e, false);
    }, { passive: true });
});
