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
                this.btnStt.classList.replace('text-white/70', 'text-red-500');
                this.btnStt.classList.add('bg-red-500/20');
                this.textInput.placeholder = "Listening...";
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.textInput.value = transcript;
                this.sendMessage(); // Auto send when STT finishes
            };

            this.recognition.onerror = (e) => {
                console.error("STT Error:", e);
                this.textInput.placeholder = "Failed to listen.";
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.btnStt.classList.replace('text-red-500', 'text-white/70');
                this.btnStt.classList.remove('bg-red-500/20');
                this.textInput.placeholder = "Initiate query...";
            };
        } else {
            console.warn("Speech Recognition not supported in this browser.");
            if(this.btnStt) this.btnStt.style.display = 'none';
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
                    this.recognition.stop();
                } else {
                    this.textInput.value = '';
                    this.recognition.start();
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
        const t = localStorage.getItem('grape_hf_token');
        const m = localStorage.getItem('grape_hf_model');
        const v = localStorage.getItem('grape_hf_voice');
        if (t && this.tokenInput) this.tokenInput.value = t;
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
        if (this.settings && this.settings.captionsEnabled) {
            const capBox = document.getElementById('caption-text');
            if (capBox) {
                capBox.innerText = text;
            }
        }
    }

    speak(text) {
        if (!this.synth) return;
        this.synth.cancel(); // cancel previous
        
        // Strip markdown or weird tokens for speaking
        const cleanText = text.replace(/[#*`_~]/g, '');
        
        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        const voiceIdx = this.voiceSelect.value;
        if (voiceIdx && this.voices[voiceIdx]) {
            utterance.voice = this.voices[voiceIdx];
        }
        
        utterance.rate = 1.05;
        utterance.pitch = 0.95;
        
        // Event binding for word-level captions if supported, otherwise just full text
        this.appendGlobalCaption(cleanText);
        
        utterance.onend = () => {
            setTimeout(() => {
                const capBox = document.getElementById('caption-text');
                if (capBox && capBox.innerText === cleanText) {
                    capBox.innerText = '';
                }
            }, 3000); // clear after 3 seconds
        };

        this.synth.speak(utterance);
    }

    async sendMessage() {
        const text = this.textInput.value.trim();
        if (!text) return;
        
        const token = this.tokenInput.value.trim();
        if (!token) {
            alert("Please enter a HuggingFace API Token.");
            return;
        }

        const model = this.modelSelect.value;
        
        // UI Update
        this.textInput.value = '';
        this.textInput.disabled = true;
        this.btnSend.classList.add('opacity-50', 'pointer-events-none');
        
        this.appendMessage('user', text);
        this.chatContext.push({ role: 'user', content: text });

        // Add loading indicator
        const loadingId = 'loading-' + Date.now();
        const msgDiv = document.createElement('div');
        msgDiv.id = loadingId;
        msgDiv.className = 'self-start max-w-[85%] rounded-xl p-3 bg-white/5 border border-white/10 text-white/50 text-xs italic flex items-center gap-2';
        msgDiv.innerHTML = `<div class="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div> Syncing with Neural Net...`;
        this.chatHistory.appendChild(msgDiv);
        this.chatHistory.scrollTop = this.chatHistory.scrollHeight;

        try {
            // Simplified Inference API Request
            // Note: Different models have different prompt templates. We are using standard HF Inference API
            // Some models prefer raw strings, some support conversational formatting.
            // Using a simple raw prompt for generic text generation models, but trying to format it nicely.
            
            let promptText = "";
            this.chatContext.forEach(m => {
                if (m.role === 'user') promptText += `User: ${m.content}\n`;
                else promptText += `Assistant: ${m.content}\n`;
            });
            promptText += "Assistant:";

            const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    inputs: promptText,
                    parameters: {
                        max_new_tokens: 150,
                        temperature: 0.7,
                        return_full_text: false
                    }
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || response.statusText);
            }

            const data = await response.json();
            let aiText = "No response.";
            if (Array.isArray(data) && data.length > 0 && data[0].generated_text) {
                aiText = data[0].generated_text.trim();
            }

            // Remove loading
            document.getElementById(loadingId)?.remove();
            
            this.chatContext.push({ role: 'assistant', content: aiText });
            this.appendMessage('assistant', aiText);
            this.speak(aiText);

        } catch (e) {
            document.getElementById(loadingId)?.remove();
            this.appendMessage('assistant', `⚠️ Transmission Failed: ${e.message}`);
        } finally {
            this.textInput.disabled = false;
            this.btnSend.classList.remove('opacity-50', 'pointer-events-none');
            this.textInput.focus();
        }
    }
}
