export class AIController {
    constructor(settingsController) {
        this.settings = settingsController;
        this.panel = document.getElementById('ai-panel');
        this.btnClose = document.getElementById('btn-ai-close');
        
        this.tokenInput = document.getElementById('hf-token-input');
        this.modelSelect = document.getElementById('ai-model-select');
        this.voiceSelect = document.getElementById('tts-voice-select');
        this.chatHistory = document.getElementById('ai-chat-history');
        this.textInput = document.getElementById('ai-text-input');
        this.btnSend = document.getElementById('btn-ai-send');
        this.btnStt = document.getElementById('btn-ai-stt');
        
        this.isOpen = false;
        this.isListening = false;
        this.chatContext = [];
        
        this.initSpeechSynthesis();
        this.initSpeechRecognition();
        this.bindEvents();
        this.loadPrefs();
    }

    initSpeechSynthesis() {
        this.synth = window.speechSynthesis;
        this.voices = [];
        
        const populateVoices = () => {
            if (!this.synth) return;
            try {
                this.voices = this.synth.getVoices();
            } catch (e) {
                console.warn("Speech Synthesis getVoices failed:", e);
                return;
            }
            if (this.voiceSelect) {
                this.voiceSelect.innerHTML = '<option value="">System Voice</option>';
                this.voices.forEach((voice, index) => {
                    const option = document.createElement('option');
                    option.textContent = `${voice.name} (${voice.lang})`;
                    option.value = index;
                    this.voiceSelect.appendChild(option);
                });
                
                const savedVoice = localStorage.getItem('grape_hf_voice');
                if (savedVoice) this.voiceSelect.value = savedVoice;
            }
        };

        if (this.synth && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = populateVoices;
        }
        populateVoices();
    }

    initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                if (this.btnStt) {
                    this.btnStt.classList.replace('text-white/70', 'text-red-500');
                    this.btnStt.classList.add('bg-red-500/20');
                }
                if (this.textInput) this.textInput.placeholder = "Listening...";
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                if (this.textInput) this.textInput.value = transcript;
                this.sendMessage(); // Auto send when STT finishes
            };

            this.recognition.onerror = (e) => {
                console.error("STT Error:", e);
                if (this.textInput) this.textInput.placeholder = "Failed to listen.";
            };

            this.recognition.onend = () => {
                this.isListening = false;
                if (this.btnStt) {
                    this.btnStt.classList.replace('text-red-500', 'text-white/70');
                    this.btnStt.classList.remove('bg-red-500/20');
                }
                if (this.textInput) this.textInput.placeholder = "Initiate query...";
            };
        } else {
            console.warn("Speech Recognition not supported in this browser.");
            if (this.btnStt) this.btnStt.style.display = 'none';
        }
    }

    bindEvents() {
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.close());
        }
        if (this.btnSend) {
            this.btnSend.addEventListener('click', () => this.sendMessage());
        }
        if (this.textInput) {
            this.textInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
        }
        if (this.btnStt) {
            this.btnStt.addEventListener('click', () => {
                if (this.isListening) {
                    try { this.recognition.stop(); } catch(e){}
                } else {
                    if (this.textInput) this.textInput.value = '';
                    try { this.recognition.start(); } catch(e){}
                }
            });
        }
        if (this.tokenInput) {
            this.tokenInput.addEventListener('change', () => {
                localStorage.setItem('grape_hf_token', this.tokenInput.value);
            });
        }
        if (this.modelSelect) {
            this.modelSelect.addEventListener('change', () => {
                localStorage.setItem('grape_hf_model', this.modelSelect.value);
            });
        }
        if (this.voiceSelect) {
            this.voiceSelect.addEventListener('change', () => {
                localStorage.setItem('grape_hf_voice', this.voiceSelect.value);
            });
        }
    }

    loadPrefs() {
        const defaultToken = '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';
        let t = localStorage.getItem('grape_hf_token');
        if (!t) {
            t = defaultToken;
            localStorage.setItem('grape_hf_token', t);
        }
        const m = localStorage.getItem('grape_hf_model');
        const v = localStorage.getItem('grape_hf_voice');

        if (this.tokenInput) this.tokenInput.value = t;
        if (m && this.modelSelect) this.modelSelect.value = m;
        if (v && this.voiceSelect) this.voiceSelect.value = v;
    }

    open() {
        if (!this.panel) return;
        this.isOpen = true;
        this.panel.classList.remove('hidden');
        setTimeout(() => {
            this.panel.classList.remove('opacity-0', 'pointer-events-none');
        }, 10);
    }

    close() {
        if (!this.panel) return;
        this.isOpen = false;
        this.panel.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => {
            this.panel.classList.add('hidden');
        }, 500);
    }

    appendMessage(role, text) {
        if (!this.chatHistory) return;
        
        const msgDiv = document.createElement('div');
        msgDiv.className = `max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed transition-all duration-300 shadow-xl ${
            role === 'user'
                ? 'self-end bg-gradient-to-r from-blue-600/30 to-purple-600/30 border border-blue-400/40 text-blue-100 font-[\'Space_Grotesk\'] shadow-[0_4px_20px_rgba(59,130,246,0.2)]'
                : 'self-start bg-slate-950/80 border border-purple-500/30 text-purple-100 font-[\'Outfit\'] shadow-[0_4px_20px_rgba(168,85,247,0.2)]'
        }`;
        
        const title = role === 'user' ? 'OPERATIVE' : 'AI INTEL ENGINE';
        const titleColor = role === 'user' ? 'text-blue-300' : 'text-purple-300';
        const dotColor = role === 'user' ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' : 'bg-purple-400 shadow-[0_0_8px_#c084fc]';
        
        msgDiv.innerHTML = `
            <div class="text-[9px] font-black uppercase tracking-[0.25em] mb-1.5 flex items-center gap-1.5 ${titleColor} font-[\'Orbitron\']">
                <span class="w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse"></span>
                ${title}
            </div>
            <div class="break-words font-medium text-[13px] tracking-wide leading-relaxed">${text.replace(/\n/g, '<br>')}</div>
        `;
        
        this.chatHistory.appendChild(msgDiv);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    }
    
    appendGlobalCaption(text) {
        const capWrapper = document.getElementById('global-captions');
        const capBox = document.getElementById('caption-text');
        if (capBox) {
            capBox.innerText = text;
            if (capWrapper) capWrapper.classList.remove('hidden');
        }
    }

    speak(text) {
        if (!this.synth && 'speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
        }
        if (!this.synth) return;
        
        try {
            this.synth.cancel();
            if (this.synth.paused) this.synth.resume();
        } catch(e){}
        
        // Clean text for speech output
        const cleanText = text.replace(/\[ACTION:[^\]]+\]/g, '').replace(/[#*`_~]/g, '').trim();
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // Choose voice carefully
        if (this.voices && this.voices.length > 0) {
            const voiceIdx = this.voiceSelect ? parseInt(this.voiceSelect.value, 10) : NaN;
            if (!isNaN(voiceIdx) && this.voices[voiceIdx]) {
                utterance.voice = this.voices[voiceIdx];
            } else {
                // Find default English voice if available
                const defaultVoice = this.voices.find(v => v.lang.startsWith('en') && v.default) || this.voices.find(v => v.lang.startsWith('en'));
                if (defaultVoice) utterance.voice = defaultVoice;
            }
        }
        
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        this.appendGlobalCaption(cleanText);
        
        utterance.onend = () => {
            setTimeout(() => {
                const capBox = document.getElementById('caption-text');
                const capWrapper = document.getElementById('global-captions');
                if (capBox && capBox.innerText === cleanText) {
                    capBox.innerText = '';
                    if (capWrapper) capWrapper.classList.add('hidden');
                }
            }, 3000);
        };

        utterance.onerror = (e) => {
            console.warn("[TTS] Speech synthesis error:", e);
        };

        try {
            this.synth.speak(utterance);
            // Chromium bug fix: resume speech engine
            if (this.synth.paused) {
                this.synth.resume();
            }
        } catch (err) {
            console.error("[TTS] Failed to execute speak:", err);
        }
    }

    executeActionDirective(actionString, fullText = '') {
        if (!actionString && !fullText) return;

        let targetAction = actionString;
        if (!targetAction && fullText.includes('[ACTION:')) {
            const match = fullText.match(/\[ACTION:([^\]]+)\]/);
            if (match) targetAction = match[1];
        }

        if (!targetAction) return;

        console.log("🚀 [AI EXECUTOR] LAUNCHING TARGET ACTION:", targetAction);

        if (targetAction.startsWith('OPEN_APP:')) {
            const app = targetAction.replace('OPEN_APP:', '').trim();
            this.launchAppByName(app);
        }
    }

    launchAppByName(appName) {
        console.log(`[AI EXECUTOR] Opening app: ${appName}`);
        if (appName === 'map') {
            if (window.mapController) {
                window.mapController.openMap(true);
            } else {
                document.querySelector('[data-app="map"]')?.click();
            }
        } else if (appName === 'music') {
            if (window.musicController) {
                window.musicController.open();
            } else {
                document.querySelector('[data-app="music"]')?.click();
            }
        } else if (appName === 'travel-reports' || appName === 'reports') {
            document.querySelector('[data-app="travel-reports"]')?.click();
        } else if (appName === 'compass') {
            if (window.initCompass) {
                window.initCompass();
            } else {
                document.querySelector('[data-app="compass"]')?.click();
            }
        } else if (appName === 'auth' || appName === 'identity') {
            document.querySelector('[data-app="auth"]')?.click();
        } else if (appName === 'settings') {
            document.getElementById('settings-btn')?.click();
        }
    }

    async sendMessage(queryText = null) {
        const text = (queryText || (this.textInput ? this.textInput.value : '')).trim();
        if (!text) return;
        
        const token = (this.tokenInput ? this.tokenInput.value.trim() : '') || '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';
        const model = this.modelSelect ? this.modelSelect.value : 'Qwen/Qwen2.5-7B-Instruct';
        
        if (this.textInput) {
            this.textInput.value = '';
            this.textInput.disabled = true;
        }
        if (this.btnSend) this.btnSend.classList.add('opacity-50', 'pointer-events-none');
        
        this.appendMessage('user', text);
        this.chatContext.push({ role: 'user', content: text });

        // Multi-stage thinking animation indicator
        const loadingId = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.id = loadingId;
        msgDiv.className = 'self-start max-w-[85%] rounded-2xl p-3.5 bg-purple-950/40 border border-purple-500/40 text-purple-200 text-xs flex flex-col gap-2 shadow-[0_0_25px_rgba(168,85,247,0.25)] transition-all duration-300';
        msgDiv.innerHTML = `
            <div class="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-purple-300 font-['Orbitron']">
                <div class="w-2.5 h-2.5 bg-purple-400 rounded-full animate-ping shadow-[0_0_10px_#a855f7]"></div>
                <span id="${loadingId}-stage">THINKING...</span>
            </div>
            <div id="${loadingId}-sub" class="text-[11px] font-['Space_Grotesk'] text-purple-200/80 italic font-medium tracking-wide">
                Parsing Neural Intent & Query Context...
            </div>
            <div class="w-full h-1 bg-purple-950/80 rounded-full overflow-hidden border border-purple-500/20">
                <div id="${loadingId}-bar" class="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 w-1/3 transition-all duration-500"></div>
            </div>
        `;
        if (this.chatHistory) {
            this.chatHistory.appendChild(msgDiv);
            this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        }

        // Multi-stage progression timers
        const timer1 = setTimeout(() => {
            const stageEl = document.getElementById(`${loadingId}-stage`);
            const subEl = document.getElementById(`${loadingId}-sub`);
            const barEl = document.getElementById(`${loadingId}-bar`);
            if (stageEl && subEl && barEl) {
                stageEl.innerText = 'ANALYZING...';
                subEl.innerText = 'Scanning Spatial Database & Sector Telemetry...';
                barEl.style.width = '68%';
            }
        }, 350);

        const timer2 = setTimeout(() => {
            const stageEl = document.getElementById(`${loadingId}-stage`);
            const subEl = document.getElementById(`${loadingId}-sub`);
            const barEl = document.getElementById(`${loadingId}-bar`);
            if (stageEl && subEl && barEl) {
                stageEl.innerText = 'BUILDING...';
                subEl.innerText = 'Synthesizing Neural Response & Actions...';
                barEl.style.width = '94%';
            }
        }, 700);

        const cleanupTimers = () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            document.getElementById(loadingId)?.remove();
        };

        try {
            // Primary backend route query with DB link & action parsing
            const res = await fetch('/api/brain/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: text,
                    token: token,
                    model: model
                })
            });

            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

            const data = await res.json();
            let aiText = data.reply || "No response received.";
            let action = data.action || "";

            cleanupTimers();

            // Extract action directive if embedded in text
            if (aiText.includes('[ACTION:')) {
                const actionMatch = aiText.match(/\[ACTION:([^\]]+)\]/);
                if (actionMatch) action = actionMatch[1];
            }

            // Strip action tag for display & speaking
            const displayMessage = aiText.replace(/\[ACTION:[^\]]+\]/g, '').trim();

            this.chatContext.push({ role: 'assistant', content: displayMessage });
            this.appendMessage('assistant', displayMessage);
            this.speak(displayMessage);

            if (action) {
                this.executeActionDirective(action, aiText);
            }

        } catch (e) {
            console.warn("[AI ENGINE] Backend query failed, trying direct HF endpoint:", e);
            
            // Direct HF Inference Fallback
            try {
                const hfResp = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        inputs: `User: ${text}\nAssistant:`,
                        parameters: { max_new_tokens: 180, temperature: 0.7 }
                    })
                });

                if (!hfResp.ok) throw new Error(`HF HTTP ${hfResp.status}`);

                const hfData = await hfResp.json();
                let aiText = "Neural query complete.";
                if (Array.isArray(hfData) && hfData.length > 0 && hfData[0].generated_text) {
                    aiText = hfData[0].generated_text.replace(/^User:.*Assistant:/s, '').trim();
                }

                cleanupTimers();
                this.appendMessage('assistant', aiText);
                this.speak(aiText);

                // Fallback action execution check
                if (text.toLowerCase().includes('open map')) this.launchAppByName('map');
                if (text.toLowerCase().includes('play music') || text.toLowerCase().includes('open music')) this.launchAppByName('music');
                if (text.toLowerCase().includes('reports')) this.launchAppByName('travel-reports');

            } catch (fallbackErr) {
                cleanupTimers();
                const failMsg = `Transmission Note: Processing offline telemetry for '${text}'.`;
                this.appendMessage('assistant', failMsg);
                this.speak(failMsg);
            }
        } finally {
            if (this.textInput) {
                this.textInput.disabled = false;
                this.textInput.focus();
            }
            if (this.btnSend) this.btnSend.classList.remove('opacity-50', 'pointer-events-none');
        }
    }
}
