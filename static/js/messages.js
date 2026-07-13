export class MessageHub {
    constructor() {
        this.panel = document.getElementById('message-hub');
        this.list = document.getElementById('message-list');
        this.pollInterval = null;

        if (this.panel) this.panel.style.willChange = "transform, opacity";

        this.init();
    }

    init() {
        // Auto-load immediately on start - no button needed
        this.refreshMessages();

        // Auto-refresh every 30 seconds
        this.pollInterval = setInterval(() => this.refreshMessages(), 30000);
    }

    async refreshMessages() {
        const savedUser = localStorage.getItem('grape_os_user');
        if (!savedUser) {
            this.renderMessages([]);
            return;
        }

        try {
            const user = JSON.parse(savedUser);
            const supabase = window.supabase?.createClient ?
                window.supabase.createClient(window.CONFIG?.SUPABASE_URL || '', window.CONFIG?.SUPABASE_KEY || '') :
                (window.mapController?.supabase);

            if (supabase) {
                const { data, error } = await supabase
                    .from('transactions')
                    .select('details, amount, timestamp')
                    .eq('user_id', user.user_id)
                    .order('timestamp', { ascending: false })
                    .limit(5);

                if (!error && data) {
                    this.renderMessages(data);
                } else {
                    this.renderMessages([]);
                }
            } else {
                console.warn("Supabase client not initialized for messages");
                this.renderMessages([]);
            }
        } catch (e) {
            console.error("Message Sync Failed:", e);
            this.renderMessages([]);
        }
    }

    renderMessages(messages) {
        const fragment = document.createDocumentFragment();

        if (messages && messages.length > 0) {
            messages.forEach((m, i) => {
                const el = document.createElement('div');
                el.className = "p-2.5 rounded-xl bg-black/40 border border-white/5 transition-all duration-300 will-change-transform";
                el.style.opacity = "0.85";
                el.style.animationDelay = `${i * 50}ms`;

                el.innerHTML = `
                    <div class="flex flex-col items-end">
                        <span class="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mb-0.5">Sector Update</span>
                        <p class="text-[10px] font-bold text-white uppercase text-right drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">${m.details}</p>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-[9px] font-black text-green-400">+${m.amount} G</span>
                            <span class="text-[7px] text-white/60 uppercase tracking-widest">${new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>
                `;
                fragment.appendChild(el);
            });
        } else {
            const empty = document.createElement('div');
            empty.className = "text-right p-3 transition-all duration-500";
            empty.innerHTML = `
                <div class="flex flex-col items-end opacity-60">
                    <span class="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] mb-1">Tactical Status</span>
                    <p class="text-[10px] font-bold text-white/40 uppercase">0 ACTIVE LOGS FOUND</p>
                    <div class="w-10 h-0.5 bg-white/10 mt-2"></div>
                </div>
            `;
            fragment.appendChild(empty);
        }

        this.list.innerHTML = "";
        this.list.appendChild(fragment);
    }
}
