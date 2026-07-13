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
        
        // Close buttons
        const closeBtn = document.getElementById('btn-keyboard-close');
        if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    }

    bindEvents() {
        this.overlay.addEventListener('click', (e) => {
            const key = e.target.closest('[data-key]')?.getAttribute('data-key');
            if (key) {
                this.handleKeyPress(key);
            }
        });

        // Keyboard Mic: Voice-to-Text directly into input
        const micBtn = document.getElementById('btn-keyboard-mic');
        if (micBtn) {
            micBtn.addEventListener('click', () => {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (SpeechRecognition) {
                    const recognition = new SpeechRecognition();
                    recognition.lang = 'en-US';
                    recognition.onstart = () => {
                        this.display.innerText = "Listening...";
                        micBtn.classList.add('bg-blue-500/60');
                    };
                    recognition.onresult = (event) => {
                        const transcript = event.results[0][0].transcript;
                        this.currentValue = transcript;
                        this.render();
                        if (this.targetInput) {
                            this.targetInput.value = this.currentValue;
                            this.targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    };
                    recognition.onend = () => {
                        micBtn.classList.remove('bg-blue-500/60');
                        if (this.display.innerText === "Listening...") this.render();
                    };
                    recognition.start();
                }
            });
        }
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
            btn.className = 'interactable bg-white/10 py-4 rounded-xl hover:bg-white/20 font-bold text-xl uppercase';
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
                // 1. Dispatch native Enter event for controllers listening to keyup/keypress
                this.targetInput.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', bubbles: true }));
                this.targetInput.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
                
                // 2. Fallback: Search for sibling GO buttons in the immediate container
                const container = this.targetInput.closest('.flex') || this.targetInput.parentElement;
                const searchBtn = container.querySelector('button');
                if (searchBtn && searchBtn.innerText.includes('GO')) searchBtn.click();
            }
            this.close();
            return;
        } else {
            this.currentValue += key;
        }
        
        if (this.targetInput) {
            this.targetInput.value = this.currentValue;
            this.targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
        this.render();
    }
}
