import { UIController } from './ui.js';
import { HandTracker } from './tracker.js';
import { SettingsController } from './settings.js';
import { CardboardController } from './cardboard.js';
import { MusicPlayer } from './music.js';
import { MapController } from './map.js';
import { MicAssistant } from './mic.js';
import { VirtualKeyboard } from './keyboard.js';

document.addEventListener('DOMContentLoaded', () => {
    const videoElement = document.getElementById('input_video');
    
    // Initialize Controllers
    const ui = new UIController();
    const settings = new SettingsController();
    const cardboard = new CardboardController();
        
    const map = new MapController(settings);
    window.mapController = map; // Expose for popup interactions
    const music = new MusicPlayer(settings); 
    const mic = new MicAssistant(map);
    const keyboard = new VirtualKeyboard();

    // Initialize Hand Tracker with callback
    const tracker = new HandTracker(videoElement, (hand) => {
        // Landmark 8 is Index Finger Tip, 4 is Thumb Tip
        const indexTip = hand[8];
        const thumbTip = hand[4];

        // Map normalized coordinates (0-1) to screen pixels
        const screenX = (1 - indexTip.x) * window.innerWidth;
        const screenY = indexTip.y * window.innerHeight;

        ui.updateCursor(screenX, screenY);

        // Distance calculation for Pinch (Click) detection
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const dz = indexTip.z - thumbTip.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        const PINCH_THRESHOLD = 0.08; 
        const isPinching = distance < PINCH_THRESHOLD;
        ui.setPinching(isPinching);

        // Pass hand state to map for swipe/drag navigation
        map.handleHandGesture({
            x: screenX,
            y: screenY,
            isPinching: isPinching,
            pinchDistance: distance
        });
    });

    // Handle "Find" click to show keyboard (auto-handled by focus listener in keyboard.js)
    
    // Start Webcam & Tracking
    tracker.start();
});
