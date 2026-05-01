export class VirtualKeyboard {
    constructor() {
        this.overlay = document.getElementById('keyboard-overlay');
        this.display = document.getElementById('keyboard-display');
        this.keysContainer = document.getElementById('keyboard-keys');
        this.targetInput = null;
        
        this.currentSet = 'alpha'; // alpha, numeric, symbol
        this.currentValue = "";

        this.layouts = {
            alpha: ["q","w","e","r","t","y","u","i","o","p","a","s","d","f","g","h","j","k","l","z","x","c","v","b","n","m"],
            numeric: ["1","2","3","4","5","6","7","8","9","0","-","/",":",";","(",")","$","&","@","\"","."],
            symbol: ["[","]","{","}","#","%","^","*","+","=","_","\\","|","~","<",">","?","!","'"]
        };

        this.bindEvents();
        
        // Close button
        const closeBtn = document.getElementById('btn-keyboard-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    }

    bindEvents() {
        // Global focus listener to trigger keyboard
        document.addEventListener('focusin', (e) => {
            if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
                this.open(e.target);
            }
        });

        this.overlay.addEventListener('click', (e) => {
            const key = e.target.getAttribute('data-key');
            if (key) {
                this.handleKeyPress(key);
            }
        });
    }

    open(input) {
        this.targetInput = input;
        this.currentValue = input.value;
        this.render();
        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('flex');
    }

    close() {
        this.overlay.classList.add('hidden');
        this.overlay.classList.remove('flex');
    }

    render() {
        this.display.innerText = this.currentValue || "|";
        this.keysContainer.innerHTML = "";
        
        const set = this.layouts[this.currentSet];
        set.forEach(key => {
            const btn = document.createElement('button');
            btn.className = 'interactable bg-white/10 py-10 rounded-2xl hover:bg-white/20 font-bold text-3xl uppercase';
            btn.innerText = key;
            btn.setAttribute('data-key', key);
            this.keysContainer.appendChild(btn);
        });
    }

    handleKeyPress(key) {
        if (key === 'switch-123') {
            this.currentSet = this.currentSet === 'numeric' ? 'alpha' : 'numeric';
        } else if (key === 'switch-sym') {
            this.currentSet = this.currentSet === 'symbol' ? 'alpha' : 'symbol';
        } else if (key === 'backspace') {
            this.currentValue = this.currentValue.slice(0, -1);
        } else if (key === 'enter') {
            if (this.targetInput) {
                this.targetInput.value = this.currentValue;
                // Trigger any search button if present
                const searchBtn = this.targetInput.parentElement.querySelector('button');
                if (searchBtn) searchBtn.click();
            }
            this.close();
            return;
        } else {
            this.currentValue += key;
        }
        
        if (this.targetInput) {
            this.targetInput.value = this.currentValue;
        }
        this.render();
    }
}
