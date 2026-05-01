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
                    if (this.hoveredElement) this.hoveredElement.classList.remove('hovered');
                    this.hoveredElement = el;
                    el.classList.add('hovered');
                }
                foundHover = true;
            } else {
                el.classList.remove('hovered');
            }
        });

        if (!foundHover) {
            this.hoveredElement = null;
        }
    }
}
