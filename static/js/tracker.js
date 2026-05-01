export class HandTracker {
    constructor(videoElement, onLandmarks) {
        this.videoElement = videoElement;
        this.onLandmarks = onLandmarks;
        
        // window.Hands is injected by MediaPipe script tags
        this.hands = new window.Hands({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }});

        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7
        });

        this.hands.onResults(this.onResults.bind(this));
        
        // window.Camera is injected by MediaPipe script tags
        this.camera = new window.Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({image: this.videoElement});
            },
            width: 1280,
            height: 720,
            facingMode: 'environment' // Prioritize back camera
        });
    }

    start() {
        this.camera.start();
    }

    onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.onLandmarks(results.multiHandLandmarks[0]);
        }
    }
}
