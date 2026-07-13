export class UIController {
    constructor() {
        this.cursor = document.getElementById('spatial-cursor');
        this.cursorRing = document.getElementById('spatial-cursor-ring');
        this.cursorRight = document.getElementById('spatial-cursor-right');
        this.cursorRingRight = document.getElementById('spatial-cursor-ring-right');
        this.isPinching = false;
        this.hoveredElement = null;
        this.lastPinchTime = 0;
        
        // Track screen position for event dispatching
        this.currentX = 0;
        this.currentY = 0;

        this.bindFullscreen();
    }

    bindFullscreen() {
        const btn = document.getElementById('fullscreen-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
            });
        }
    }

    updateCursor(x, y) {
        this.currentX = x;
        this.currentY = y;
        
        // Primary Projection
        this.cursor.style.left = `${x}px`;
        this.cursor.style.top = `${y}px`;
        this.cursorRing.style.left = `${x}px`;
        this.cursorRing.style.top = `${y}px`;
        
        // Secondary Projection (Right Eye)
        if (this.cursorRight) {
            const halfWidth = window.innerWidth / 2;
            let xRight;
            
            if (x < halfWidth) {
                xRight = x + halfWidth;
            } else {
                xRight = x - halfWidth;
            }

            this.cursorRight.style.left = `${xRight}px`;
            this.cursorRight.style.top = `${y}px`;
            this.cursorRingRight.style.left = `${xRight}px`;
            this.cursorRingRight.style.top = `${y}px`;
            
            // Sync visibility with Cardboard Mode (only show if stereoscopic is active)
            if (document.body.classList.contains('cardboard-mode')) {
                this.cursorRight.classList.remove('hidden');
                this.cursorRingRight.classList.remove('hidden');
            } else {
                this.cursorRight.classList.add('hidden');
                this.cursorRingRight.classList.add('hidden');
            }
        }

        this.checkHover(x, y);
        this.applyPanelTilt(x, y);
    }

    setPinching(pinching) {
        if (pinching && !this.isPinching) {
            this.isPinching = true;
            this.cursor.classList.add('pinching');
            this.cursorRing.classList.add('pinching');
            
            const now = Date.now();
            if (now - this.lastPinchTime > 300) {
                this.dispatchSpatialClick();
                this.lastPinchTime = now;
            }
        } else if (!pinching && this.isPinching) {
            this.isPinching = false;
            this.cursor.classList.remove('pinching');
            this.cursorRing.classList.remove('pinching');
            if (this.cursorRight) {
                this.cursorRight.classList.remove('pinching');
                this.cursorRingRight.classList.remove('pinching');
            }
            
            if (this.hoveredElement) {
                this.hoveredElement.classList.remove('clicked');
            }
        }
    }

    dispatchSpatialClick() {
        const elements = document.elementsFromPoint(this.currentX, this.currentY);
        
        const interactable = elements.find(el => el.classList.contains('interactable'));
        const mapContainer = elements.find(el => el.id === 'map-container');
        
        const target = interactable || mapContainer || elements.find(el => 
            !el.id?.includes('spatial-cursor') && 
            !el.id?.includes('output_canvas') &&
            !el.id?.includes('input_video')
        );

        if (target) {
            target.classList.add('clicked');
            
            const clickEvent = new MouseEvent('click', {
                view: window, bubbles: true, cancelable: true,
                clientX: this.currentX, clientY: this.currentY, button: 0
            });
            
            target.dispatchEvent(clickEvent);
            
            if (mapContainer && target !== mapContainer) {
                const mapClick = new MouseEvent('click', {
                    view: window, bubbles: true, cancelable: true,
                    clientX: this.currentX, clientY: this.currentY
                });
                mapContainer.dispatchEvent(mapClick);
            }
        }
    }

    applyPanelTilt(x, y) {
        // Find visible full-screen or large panels
        const panels = document.querySelectorAll('.glass-panel:not(.hidden)');
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        panels.forEach(panel => {
            // Only tilt if it's a primary panel (Settings, Music, Map, Compass)
            if (panel.id === 'settings-panel' || panel.id === 'compass-panel' || panel.classList.contains('music-bg') || panel.parentElement.id === 'map-window') {
                const rect = panel.getBoundingClientRect();
                
                // Calculate tilt based on distance from hand to panel center
                const panelCenterX = rect.left + rect.width / 2;
                const panelCenterY = rect.top + rect.height / 2;
                
                const deltaX = (x - panelCenterX) / (window.innerWidth / 2);
                const deltaY = (y - panelCenterY) / (window.innerHeight / 2);
                
                const rotY = deltaX * 10; // Max 10 degrees
                const rotX = -deltaY * 10;

                // Combine with existing scale from CSS
                const scale = getComputedStyle(document.documentElement).getPropertyValue('--panel-scale') || 1;
                
                // Special case for centered panels
                let transform = `perspective(1200px) scale(${scale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
                
                if (panel.id === 'settings-panel' || panel.id === 'compass-panel') {
                     // Keep its absolute centering (X and Y)
                     panel.style.transform = `translate(-50%, -50%) ${transform}`;
                } else {
                     panel.style.transform = transform;
                }
                
                panel.style.transition = 'transform 0.1s ease-out';
            }
        });
    }

    checkHover(x, y) {
        const interactables = document.querySelectorAll('.interactable');
        let foundHover = false;

        interactables.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                if (this.hoveredElement !== el) {
                    if (this.hoveredElement) {
                        this.hoveredElement.classList.remove('hovered');
                        this.hoveredElement.style.transform = ''; 
                    }
                    this.hoveredElement = el;
                    el.classList.add('hovered');
                }
                foundHover = true;

                // Calculate tilt for the individual button/icon
                const relX = ((x - rect.left) / rect.width) * 2 - 1;
                const relY = ((y - rect.top) / rect.height) * 2 - 1;
                const rotX = -relY * 30; 
                const rotY = relX * 30; 
                
                // Add a "floating" translateY
                el.style.transform = `perspective(800px) scale(calc(var(--panel-scale) * var(--hover-scale))) translateY(-15px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
                el.style.zIndex = "100";
            } else {
                if (el.classList.contains('hovered') && this.hoveredElement !== el) {
                    el.classList.remove('hovered');
                    el.style.transform = ''; 
                }
            }
        });

        if (!foundHover) {
            if (this.hoveredElement) {
                this.hoveredElement.classList.remove('hovered');
                this.hoveredElement.style.transform = ''; 
            }
            this.hoveredElement = null;
        }
    }
}
