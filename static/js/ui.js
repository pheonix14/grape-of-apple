export class UIController {
    constructor() {
        this.cursor = document.getElementById('spatial-cursor');
        this.cursorRing = document.getElementById('spatial-cursor-ring');
        this.isPinching = false;
        this.hoveredElement = null;
        this.lastPinchTime = 0;
        
        // Track screen position for event dispatching
        this.currentX = 0;
        this.currentY = 0;
    }

    updateCursor(x, y) {
        this.currentX = x;
        this.currentY = y;
        this.cursor.style.left = `${x}px`;
        this.cursor.style.top = `${y}px`;
        this.cursorRing.style.left = `${x}px`;
        this.cursorRing.style.top = `${y}px`;
        this.checkHover(x, y);
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
            
            if (this.hoveredElement) {
                this.hoveredElement.classList.remove('clicked');
            }
        }
    }

    dispatchSpatialClick() {
        const elements = document.elementsFromPoint(this.currentX, this.currentY);
        
        // Find if there's an interactable button first
        const interactable = elements.find(el => el.classList.contains('interactable'));
        const mapContainer = elements.find(el => el.id === 'map-container');
        
        // Priority: 1. Interactable Buttons, 2. Map Container, 3. Anything else
        const target = interactable || mapContainer || elements.find(el => 
            !el.id?.includes('spatial-cursor') && 
            !el.id?.includes('output_canvas') &&
            !el.id?.includes('input_video')
        );

        if (target) {
            target.classList.add('clicked');
            
            // Create a high-fidelity MouseEvent for frameworks like Leaflet
            // We dispatch to BOTH the target and potentially the map container directly
            const clickEvent = new MouseEvent('click', {
                view: window,
                bubbles: true,
                cancelable: true,
                clientX: this.currentX,
                clientY: this.currentY,
                button: 0
            });
            
            target.dispatchEvent(clickEvent);
            
            // If we didn't hit the map container directly but it was in the stack, 
            // dispatch a separate event to it just to be sure
            if (mapContainer && target !== mapContainer) {
                const mapClick = new MouseEvent('click', {
                    view: window, bubbles: true, cancelable: true,
                    clientX: this.currentX, clientY: this.currentY
                });
                mapContainer.dispatchEvent(mapClick);
            }

            console.log("Spatial Event Dispatched to:", target.id || target.tagName);
        }
    }

    checkHover(x, y) {
        const interactables = document.querySelectorAll('.interactable, #map-container');
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

                if (el.classList.contains('interactable')) {
                    const relX = ((x - rect.left) / rect.width) * 2 - 1;
                    const relY = ((y - rect.top) / rect.height) * 2 - 1;
                    const rotX = -relY * 25; 
                    const rotY = relX * 25; 
                    el.style.transform = `perspective(800px) scale(calc(var(--panel-scale) * var(--hover-scale))) translateY(-5px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
                }

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
