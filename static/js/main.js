import { UIController } from './ui.js';
import { HandTracker } from './tracker.js';
import { SettingsController } from './settings.js';
import { MusicPlayer } from './music.js';
import { MapController } from './map.js';
import { MicAssistant } from './mic.js';

document.addEventListener('DOMContentLoaded', () => {
    const videoElement = document.getElementById('input_video');
    
    // Initialize Controllers
    const ui = new UIController();
    const settings = new SettingsController();
    const music = new MusicPlayer();
    const map = new MapController();
    const mic = new MicAssistant(map);

    // Initialize Hand Tracker with callback
    const tracker = new HandTracker(videoElement, (hand) => {
        // Landmark 8 is Index Finger Tip, 4 is Thumb Tip
        const indexTip = hand[8];
        const thumbTip = hand[4];

        // Map normalized coordinates (0-1) to screen pixels
        // (Video is mirrored horizontally in UI, so scale-x is inverted)
        const screenX = (1 - indexTip.x) * window.innerWidth;
        const screenY = indexTip.y * window.innerHeight;

        ui.updateCursor(screenX, screenY);

        // Distance calculation for Pinch (Click) detection
        const dx = indexTip.x - thumbTip.x;
        const dy = indexTip.y - thumbTip.y;
        const dz = indexTip.z - thumbTip.z;
        const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

        const PINCH_THRESHOLD = 0.05; 
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

    // Start Webcam & Tracking
    tracker.start();
});
