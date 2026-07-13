console.log("🚀 ASSISTANT V6.0 - LOGISTICS ENABLED");

export class MicAssistant {
    constructor(mapController, getTravelReports, persistence) {
        this.mapController = mapController;
        this.getTravelReports = getTravelReports;
        this.persistence = persistence;

        this.overlay = document.getElementById('mic-overlay');
        this.statusText = document.getElementById('mic-status');
        this.transcriptionText = document.getElementById('mic-transcription');
        this.optionsContainer = document.getElementById('mic-options');
        this.micToggleBtn = document.getElementById('btn-mic-toggle');
        this.micIconSvg = document.getElementById('mic-icon-svg');
        
        this.isActive = false;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = true;
            this.bindEvents();
        } else {
            console.error("[SYSTEM] SPEECH RECOGNITION NOT SUPPORTED IN THIS BROWSER");
            if (this.statusText) this.statusText.innerText = "SENSOR NOT SUPPORTED";
        }
    }

    bindEvents() {
        this.recognition.onstart = () => {
            console.log("[MIC] SENSOR ACTIVE - LISTENING...");
            this.isActive = true;
            this.overlay.classList.remove('hidden');
            setTimeout(() => this.overlay.classList.remove('opacity-0'), 10);
            this.statusText.innerText = "Listening...";
            this.micIconSvg.classList.add('text-red-500'); 
        };

        this.recognition.onresult = async (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                else interimTranscript += event.results[i][0].transcript;
            }

            console.log("[MIC] TRANSCRIPTION:", finalTranscript || interimTranscript);
            if (this.transcriptionText) this.transcriptionText.innerText = interimTranscript || finalTranscript;

            if (finalTranscript) {
                const transcript = finalTranscript.trim().toLowerCase();
                this.handleCommand(transcript);
            }
        };

        this.recognition.onerror = (event) => {
            console.error("[MIC] SENSOR ERROR:", event.error);
            this.statusText.innerText = `ERROR: ${event.error.toUpperCase()}`;
            if (event.error === 'not-allowed') {
                this.statusText.innerText = "PERMISSION DENIED";
            }
        };

        this.recognition.onend = () => {
            console.log("[MIC] SENSOR STANDBY");
            if (this.isActive) {
                try { this.recognition.start(); } catch (e) { }
            }
        };
    }

    async handleCommand(transcript) {
        console.log("[MIC] PROCESSING INTENT:", transcript);

        const words = transcript.toLowerCase().trim().split(/\s+/);
        if (words.length < 2) return;

        const action = words[0];
        let query = words.slice(1).join(' ').trim();

        // 1. REPORT / LOGISTICS / SITREP commands
        if (['report', 'reports', 'sitrep', 'logistics'].includes(action)) {
            this.statusText.innerText = `Fetching Reports: ${query}`;
            
            const reportsHub = this.getTravelReports();
            if (reportsHub) {
                if (reportsHub.searchInput) {
                    reportsHub.searchInput.value = query;
                    reportsHub.loadBySearch();
                }
            }
            this.stopListening();
            return;
        }

        // 2. FIND / LOCATE / SEARCH / SHOW / GOTO commands
        if (['find', 'locate', 'search', 'show', 'goto', 'go'].includes(action)) {
            if (action === 'go' && words[1] === 'to') {
                query = words.slice(2).join(' ').trim();
            }

            if (this.mapController.searchInput) {
                this.mapController.searchInput.value = query;
            }

            this.statusText.innerText = `Searching Sector: ${query}`;
            
            // Fetch local results
            let matches = await this.mapController.searchMultipleLocations(query);
            
            // Global Scan Fallback
            if (matches.length === 0) {
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
                    const data = await res.json();
                    matches = data.map(d => ({
                        name: d.display_name,
                        lat: parseFloat(d.lat),
                        lon: parseFloat(d.lon),
                        category: 'Global Sector'
                    }));
                } catch (e) { console.error("Global Scan Failed", e); }
            }

            this.showResultList(matches, query);
        }
    }

    showResultList(matches, query) {
        this.optionsContainer.classList.remove('hidden');
        this.optionsContainer.innerHTML = "";
        
        if (matches && matches.length > 0) {
            this.statusText.innerText = `Nodes for "${query}"`;
            
            matches.slice(0, 5).forEach(m => {
                const btn = document.createElement('div');
                btn.className = "interactable glass-panel p-2.5 px-5 rounded-xl border border-white/10 hover:border-blue-500/50 hover:bg-white/10 cursor-pointer text-xs font-bold transition-all text-white flex justify-between items-center gap-4 mb-1.5 shadow-lg";
                btn.innerHTML = `
                    <div class="flex flex-col overflow-hidden">
                        <span class="tracking-tight truncate max-w-[200px]">${m.name}</span>
                        <span class="text-[8px] text-blue-400 uppercase tracking-widest opacity-50">${m.category || 'Sector'}</span>
                    </div>
                    <div class="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                        <svg class="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        </svg>
                    </div>
                `;
                
                btn.onclick = () => this.executeDestination(m);
                this.optionsContainer.appendChild(btn);
            });
        } else {
            this.statusText.innerText = "NO SECTORS FOUND";
            setTimeout(() => this.resetUI(), 2000);
        }
    }

    executeDestination(loc) {
        if (this.mapController.searchInput) this.mapController.searchInput.value = loc.name;
        if (!this.mapController.isOpen) {
            this.mapController.openMap(true); // Open as minimap
        } else if (!this.mapController.isMinimized) {
            this.mapController.toggleMinimize(); // Force minimize if full map is open
        }
        
        setTimeout(() => {
            this.mapController.setDestination(
                loc.lat || loc.latitude, 
                loc.lon || loc.longitude, 
                loc.name, 
                loc.id, 
                loc.category,
                'mic'
            );
            this.stopListening();
        }, 800);
    }

    resetUI() {
        this.optionsContainer.innerHTML = "";
        this.optionsContainer.classList.add('hidden');
        if (this.transcriptionText) this.transcriptionText.innerText = "";
    }

    startListening() {
        if (this.isActive) return;
        try { 
            this.recognition.start();
        } catch (e) {
            console.error("[MIC] FAILED TO START SENSOR:", e);
        }
    }

    stopListening() {
        this.isActive = false;
        try { this.recognition.stop(); } catch (e) {}
        this.overlay.classList.add('opacity-0');
        setTimeout(() => {
            this.overlay.classList.add('hidden');
            this.resetUI();
        }, 500);
        this.micIconSvg.classList.remove('text-red-500');
    }

    toggle() {
        if (this.isActive) this.stopListening();
        else this.startListening();
    }
}
