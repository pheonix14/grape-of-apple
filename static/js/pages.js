export class PageController {
    constructor() {
        this.currentPage = 1;
        this.totalPages = 4;
        this.pinchStartX = 0;
        this.isDraggingPage = false;
        this.dragThreshold = 150; // pixels

        this.dots = document.querySelectorAll('.page-dot');
        this.icons = document.querySelectorAll('.sidebar-toolbar .interactable');
        this.logContainer = document.getElementById('system-log');

        this.init();
    }

    init() {
        this.addLog('SYSTEM INITIALIZED', 'SUCCESS');
        this.updatePageUI();
    }

    handleHandGesture(data) {
        // Block page switching if any app (except music) is open
        if (document.body.classList.contains('app-open')) {
            this.isDraggingPage = false;
            return;
        }

        if (data.isPinching) {
            if (!this.isDraggingPage) {
                // Check if starting on empty space
                const element = document.elementFromPoint(data.x, data.y);
                const isInteractable = element && (element.classList.contains('interactable') || element.closest('.interactable'));
                
                if (!isInteractable) {
                    this.isDraggingPage = true;
                    this.pinchStartX = data.x;
                }
            }
        } else {
            if (this.isDraggingPage) {
                const dragDistance = data.x - this.pinchStartX;
                
                if (Math.abs(dragDistance) > this.dragThreshold) {
                    if (dragDistance > 0 && this.currentPage > 1) {
                        this.switchPage(this.currentPage - 1);
                    } else if (dragDistance < 0 && this.currentPage < this.totalPages) {
                        this.switchPage(this.currentPage + 1);
                    }
                }
                this.isDraggingPage = false;
            }
        }
    }

    switchPage(page) {
        if (page === this.currentPage) return;
        
        this.currentPage = page;
        this.addLog(`SWITCHING TO PAGE ${page}`, 'INFO');
        this.updatePageUI();

        // Dispatch event for other controllers
        const event = new CustomEvent('pageChanged', { detail: { page: page } });
        document.dispatchEvent(event);
    }

    updatePageUI() {
        // Update Icons
        this.icons.forEach(icon => {
            const iconPage = icon.getAttribute('data-page');
            if (iconPage === 'all' || iconPage === String(this.currentPage)) {
                icon.classList.remove('hidden');
                setTimeout(() => icon.classList.remove('opacity-0'), 10);
            } else {
                icon.classList.add('opacity-0');
                setTimeout(() => icon.classList.add('hidden'), 500);
            }
        });

        // Update Dots
        this.dots.forEach(dot => {
            const dotNum = dot.getAttribute('data-dot');
            if (dotNum === String(this.currentPage)) {
                dot.classList.add('shadow-[0_0_10px_#fff]', 'bg-white');
                dot.classList.remove('bg-white/20');
            } else {
                dot.classList.remove('shadow-[0_0_10px_#fff]', 'bg-white');
                dot.classList.add('bg-white/20');
            }
        });
    }

    addLog(message, type = 'INFO') {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [${type}] ${message}`);
    }
}
