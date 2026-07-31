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
        msgDiv.className = `max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${role === 'user' ? 'self-end bg-blue-500/20 border border-blue-500/40 text-blue-100' : 'self-start bg-white/10 border border-white/20 text-white'}`;
        
        const title = role === 'user' ? 'OPERATIVE' : 'AI INTEL';
        msgDiv.innerHTML = `
            <div class="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">${title}</div>
            <div class="break-words font-medium">${text.replace(/\n/g, '<br>')}</div>
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
        if (!this.synth) return;
        try { this.synth.cancel(); } catch(e){}
        
        // Clean text for speech output
        const cleanText = text.replace(/\[ACTION:[^\]]+\]/g, '').replace(/[#*`_~]/g, '').trim();
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        const voiceIdx = this.voiceSelect ? this.voiceSelect.value : null;
        if (voiceIdx && this.voices[voiceIdx]) {
            utterance.voice = this.voices[voiceIdx];
        }
        
        utterance.rate = 1.05;
        utterance.pitch = 0.95;
        
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

        this.synth.speak(utterance);
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

        const loadingId = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.id = loadingId;
        msgDiv.className = 'self-start max-w-[85%] rounded-xl p-3 bg-white/5 border border-white/10 text-white/50 text-xs italic flex items-center gap-2';
        msgDiv.innerHTML = `<div class="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div> Syncing with Neural Net & DB...`;
        if (this.chatHistory) {
            this.chatHistory.appendChild(msgDiv);
            this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
        }

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

            document.getElementById(loadingId)?.remove();

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

                document.getElementById(loadingId)?.remove();
                this.appendMessage('assistant', aiText);
                this.speak(aiText);

                // Fallback action execution check
                if (text.toLowerCase().includes('open map')) this.launchAppByName('map');
                if (text.toLowerCase().includes('play music') || text.toLowerCase().includes('open music')) this.launchAppByName('music');
                if (text.toLowerCase().includes('reports')) this.launchAppByName('travel-reports');

            } catch (fallbackErr) {
                document.getElementById(loadingId)?.remove();
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
