export class UIController {
    constructor() {
        this.cursor = document.getElementById('spatial-cursor');
        this.cursorRing = document.getElementById('spatial-cursor-ring');
        this.interactables = document.querySelectorAll('.interactable');
        this.isPinching = false;
        this.hoveredElement = null;
        this.lastPinchTime = 0;
    }

    updateCursor(x, y) {
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
            if (this.hoveredElement && (now - this.lastPinchTime > 300)) {
                this.hoveredElement.classList.add('clicked');
                console.log("Clicked:", this.hoveredElement.dataset.app || "dock item");
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

    checkHover(x, y) {
        let foundHover = false;
        this.interactables.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
                if (this.hoveredElement !== el) {
                    if (this.hoveredElement) {
                        this.hoveredElement.classList.remove('hovered');
                        this.hoveredElement.style.transform = ''; // reset 3D
                    }
                    this.hoveredElement = el;
                    el.classList.add('hovered');
                }
                foundHover = true;

                // Apply 3D Parallax physics
                const relX = ((x - rect.left) / rect.width) * 2 - 1;
                const relY = ((y - rect.top) / rect.height) * 2 - 1;
                const rotX = -relY * 30; // up/down tilt
                const rotY = relX * 30; // left/right tilt
                el.style.transform = `perspective(500px) scale(var(--hover-scale)) translateY(-10px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;

            } else {
                if (el.classList.contains('hovered') && this.hoveredElement !== el) {
                    el.classList.remove('hovered');
                    el.style.transform = ''; // reset 3D
                }
            }
        });

        if (!foundHover) {
            if (this.hoveredElement) {
                this.hoveredElement.classList.remove('hovered');
                this.hoveredElement.style.transform = ''; // reset
            }
            this.hoveredElement = null;
        }
    }
}
