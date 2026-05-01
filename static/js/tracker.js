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

    drawResults(results) {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const canvasRight = document.getElementById('output_canvas_right');
        const ctxRight = canvasRight?.getContext('2d');
        if (ctxRight) {
            ctxRight.save();
            ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
        }

        if (results.multiHandLandmarks) {
            for (const landmarks of results.multiHandLandmarks) {
                // Draw landmarks on left canvas
                drawConnectors(this.ctx, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
                drawLandmarks(this.ctx, landmarks, {color: '#FF0000', lineWidth: 2});
                
                // Draw landmarks on right canvas
                if (ctxRight) {
                    drawConnectors(ctxRight, landmarks, HAND_CONNECTIONS, {color: '#00FF00', lineWidth: 5});
                    drawLandmarks(ctxRight, landmarks, {color: '#FF0000', lineWidth: 2});
                }
            }
        }
        this.ctx.restore();
        if (ctxRight) ctxRight.restore();
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
