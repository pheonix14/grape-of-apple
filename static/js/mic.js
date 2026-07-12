export class MicAssistant {
    constructor(mapController) {
        this.mapController = mapController;
        this.overlay = document.getElementById('mic-overlay');
        this.statusText = document.getElementById('mic-status');
        this.optionsContainer = document.getElementById('mic-options');
        this.micToggleBtn = document.getElementById('btn-mic-toggle');
        this.micIconSvg = document.getElementById('mic-icon-svg');
        
        this.isActive = false;
        this.state = 'IDLE'; // IDLE, SELECTING, CONFIRMING
        this.currentMatches = [];
        this.selectedLocation = null;

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            // Continuous listening
            this.recognition.continuous = true;
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = false;
            
            this.bindEvents();
        } else {
            console.warn("Speech Recognition API not supported in this browser.");
        }
    }

    bindEvents() {
        this.micToggleBtn.addEventListener('click', () => {
            if (this.isActive) {
                this.stopListening();
            } else {
                this.startListening();
            }
        });

        this.recognition.onstart = () => {
            this.isActive = true;
            this.overlay.classList.remove('hidden');
            setTimeout(() => this.overlay.classList.remove('opacity-0'), 10);
            this.statusText.innerText = "Auto-Listening... Say 'Find [Location]'";
            this.micIconSvg.classList.add('text-red-500'); // Change icon color to indicate active
        };

        this.recognition.onresult = async (event) => {
            // Get the latest transcript
            const lastIndex = event.results.length - 1;
            const transcript = event.results[lastIndex][0].transcript.trim().toLowerCase();
            
            console.log("Heard:", transcript);

            if (this.state === 'IDLE') {
                if (transcript.includes('find ')) {
                    const query = transcript.split('find ')[1].trim();
                    this.statusText.innerText = `Searching for "${query}"...`;
                    
                    const matches = await this.mapController.searchMultipleLocations(query);
                    if (matches.length === 0) {
                        const failMsg = `No locations found for "${query}".`;
                        this.statusText.innerText = failMsg;
                        this.speak(failMsg);
                        setTimeout(() => this.resetToIdle(), 3000);
                    } else if (matches.length === 1) {
                        // Only 1 match, auto select and confirm
                        this.selectedLocation = matches[0];
                        this.askForConfirmation();
                    } else {
                        // Multiple matches
                        this.currentMatches = matches;
                        this.state = 'SELECTING';
                        const msg = `I found multiple locations for ${query}. Say First, Second, or Third.`;
                        this.statusText.innerText = msg;
                        this.speak(msg);
                        this.optionsContainer.classList.remove('hidden');
                        this.optionsContainer.innerHTML = matches.map((m, i) => `<div>${i+1}. ${m.name}</div>`).join('');
                    }
                } else if (transcript.includes('zoom in')) {
                    const match = transcript.match(/zoom in (\d+)/);
                    const amount = match ? match[1] : 1;
                    this.mapController.zoomInBy(amount);
                    this.statusText.innerText = `Zoomed in by ${amount}`;
                    setTimeout(() => this.resetToIdle(), 1000);
                } else if (transcript.includes('zoom out')) {
                    const match = transcript.match(/zoom out (\d+)/);
                    const amount = match ? match[1] : 1;
                    this.mapController.zoomOutBy(amount);
                    this.statusText.innerText = `Zoomed out by ${amount}`;
                    setTimeout(() => this.resetToIdle(), 1000);
                }
            } else if (this.state === 'SELECTING') {
                let index = -1;
                if (transcript.includes('first') || transcript.includes('one') || transcript.includes('1')) index = 0;
                else if (transcript.includes('second') || transcript.includes('two') || transcript.includes('2')) index = 1;
                else if (transcript.includes('third') || transcript.includes('three') || transcript.includes('3')) index = 2;

                if (index >= 0 && index < this.currentMatches.length) {
                    this.selectedLocation = this.currentMatches[index];
                    this.askForConfirmation();
                } else if (transcript.includes('cancel') || transcript.includes('stop')) {
                    this.resetToIdle();
                }
            } else if (this.state === 'CONFIRMING') {
                if (transcript.includes('yes') || transcript.includes('yeah') || transcript.includes('sure') || transcript.includes('route')) {
                    const okMsg = `Routing to ${this.selectedLocation.name}. Safe travels.`;
                    this.statusText.innerText = okMsg;
                    this.speak(okMsg);
                    this.optionsContainer.classList.add('hidden');
                    this.mapController.setDestination(this.selectedLocation.latitude, this.selectedLocation.longitude, this.selectedLocation.name);
                    setTimeout(() => {
                        this.resetToIdle();
                        this.stopListening();
                    }, 2000);
                } else if (transcript.includes('no') || transcript.includes('cancel') || transcript.includes('stop')) {
                    this.statusText.innerText = "Routing cancelled.";
                    setTimeout(() => {
                        this.resetToIdle();
                        this.stopListening();
                    }, 2000);
                }
            }
        };

        this.recognition.onerror = (event) => {
            console.error("Mic error:", event.error);
            // Ignore no-speech errors for continuous listening
            if (event.error !== 'no-speech') {
                this.statusText.innerText = "Error: " + event.error;
                setTimeout(() => this.resetToIdle(), 2000);
            }
        };

        this.recognition.onend = () => {
            // Auto-restart if it was supposed to be active (continuous listening workaround)
            if (this.isActive) {
                try {
                    this.recognition.start();
                } catch (e) { }
            }
        };
    }

    askForConfirmation() {
        this.state = 'CONFIRMING';
        this.optionsContainer.classList.add('hidden');
        const text = `Are you sure you want to route to ${this.selectedLocation.name}? Say 'Yes' or 'No'.`;
        this.statusText.innerText = text;
        this.speak(text);
    }

    resetToIdle() {
        this.state = 'IDLE';
        this.currentMatches = [];
        this.selectedLocation = null;
        this.optionsContainer.classList.add('hidden');
        this.optionsContainer.innerHTML = '';
        if (this.isActive) {
            this.statusText.innerText = "Auto-Listening... Say 'Find [Location]'";
        }
    }

    startListening() {
        try {
            this.recognition.start();
            this.speak("Voice assistant active. How can I help you?");
        } catch (e) { }
    }

    stopListening() {
        this.isActive = false;
        this.recognition.stop();
        this.overlay.classList.add('opacity-0');
        setTimeout(() => this.overlay.classList.add('hidden'), 500);
        this.micIconSvg.classList.remove('text-red-500');
        this.speak("Powering down voice modules.");
    }

    speak(text) {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        const trySpeak = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) {
                // If voices aren't loaded yet, wait and try again
                setTimeout(trySpeak, 100);
                return;
            }

            // High-priority female voices
            const femaleVoice = voices.find(v => 
                v.name.includes('Google US English') || 
                v.name.includes('Samantha') || 
                v.name.includes('Zira') ||
                v.name.includes('Female') ||
                v.name.includes('Victoria')
            );
            
            if (femaleVoice) {
                utterance.voice = femaleVoice;
            }
            
            utterance.pitch = 1.1; 
            utterance.rate = 1.05; // Slightly faster for tactical feel
            window.speechSynthesis.speak(utterance);
        };

        trySpeak();
    }
}
