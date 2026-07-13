import { CONFIG } from './config.js';

export class RewardEngine {
    constructor(persistence) {
        this.persistence = persistence;
        this.goldBalance = document.getElementById('gold-balance');
        this.notificationHub = document.getElementById('notification-hub');
        this.goldHUD = document.getElementById('gold-hud');
        
        // Initialize Supabase
        this.supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        
        this.lastCheck = 0;
        this.checkInterval = 30000; // 30 seconds
        this.isSubscribed = false;
        this.channel = null;
        this.init();
    }

    init() {
        // Initial balance update
        this.updateLiveBalance();
        this.setupRealtimeSync();
        
        // Listen for page changes to hide/show Gold HUD (NOW PAGE 3 ONLY)
        document.addEventListener('pageChanged', (e) => {
            if (this.goldHUD) {
                if (e.detail.page === 3) {
                    this.goldHUD.style.opacity = "1";
                    this.goldHUD.classList.remove('opacity-0', 'scale-90', 'translate-y-[-20px]');
                    this.goldHUD.classList.add('opacity-100', 'scale-100', 'translate-y-0');
                } else {
                    this.goldHUD.style.opacity = "0";
                    this.goldHUD.classList.add('opacity-0', 'scale-90', 'translate-y-[-20px]');
                    this.goldHUD.classList.remove('opacity-100', 'scale-100', 'translate-y-0');
                }
            }
        });
    }

    setupRealtimeSync() {
        const savedUser = localStorage.getItem('grape_os_user');
        if (!savedUser || this.isSubscribed) return;
        const user = JSON.parse(savedUser);

        // Subscribe to changes on users table for this specific user
        this.channel = this.supabase
            .channel(`public:users:${user.user_id}`)
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'users',
                filter: `user_id=eq.${user.user_id}`
            }, (payload) => {
                if (payload.new && payload.new.points !== undefined) {
                    this.updateUI(payload.new.points);
                }
            })
            .subscribe();
            
        this.isSubscribed = true;
    }

    reset() {
        if (this.channel) {
            this.supabase.removeChannel(this.channel);
            this.channel = null;
        }
        this.isSubscribed = false;
        this.updateUI(0);
    }

    updateUI(points) {
        if (this.goldBalance) {
            this.goldBalance.innerText = String(points).padStart(4, '0');
        }
    }

    playStarAnimation() {
        const container = document.createElement('div');
        container.className = "fixed inset-0 z-[5000] pointer-events-none flex items-center justify-center";
        container.innerHTML = `
            <div class="star-anim relative w-96 h-96">
                <div class="absolute inset-0 flex items-center justify-center">
                    <svg class="w-32 h-32 text-yellow-400 drop-shadow-[0_0_30px_#eab308] animate-ping" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                    </svg>
                </div>
                ${Array.from({length: 12}).map((_, i) => `
                    <div class="absolute w-2 h-2 bg-yellow-400 rounded-full" style="
                        top: 50%; left: 50%;
                        transform: rotate(${i * 30}deg) translate(80px);
                        animation: star-particle 1s ease-out forwards;
                    "></div>
                `).join('')}
            </div>
        `;
        document.body.appendChild(container);
        setTimeout(() => container.remove(), 2000);
    }

    async updateLiveBalance() {
        const savedUser = localStorage.getItem('grape_os_user');
        if (!savedUser || !this.goldBalance) return;

        try {
            const user = JSON.parse(savedUser);
            const response = await fetch(`/api/user/points/${user.user_id}`);
            const result = await response.json();
            
            if (result.status === 'ok') {
                this.updateUI(result.points);
                user.points = result.points;
                localStorage.setItem('grape_os_user', JSON.stringify(user));
                
                // Re-setup sync if needed (e.g. after login)
                this.setupRealtimeSync();
            }
        } catch (e) {
            console.error("Gold Sync Error:", e);
        }
    }

    async checkProximity(lat, lon) {
        const now = Date.now();
        if (now - this.lastCheck < this.checkInterval) return;
        this.lastCheck = now;

        const savedUser = localStorage.getItem('grape_os_user');
        if (!savedUser) return;

        const user = JSON.parse(savedUser);

        try {
            const response = await fetch('/api/check-proximity', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.user_id,
                    lat: lat,
                    lon: lon
                })
            });

            const result = await response.json();
            if (result.status === 'ok') {
                // 1. Handle Rewards (11km)
                if (result.triggered && result.triggered.length > 0) {
                    this.playStarAnimation();
                    result.triggered.forEach(t => {
                        this.showNotification(t, 'REWARD');
                    });
                    this.updateLiveBalance();
                }
                
                // 2. Handle Nearby Alerts (100km)
                if (result.nearby && result.nearby.length > 0) {
                    result.nearby.forEach(n => {
                        this.showNotification(n, 'NEARBY');
                    });
                }
            }
        } catch (e) {
            console.error("Proximity Check Failed:", e);
        }
    }

    showNotification(data, type = 'REWARD') {
        if (!this.notificationHub) return;

        const notif = document.createElement('div');
        
        if (type === 'REWARD') {
            notif.className = "glass-panel p-4 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 shadow-[0_0_30px_rgba(234,179,8,0.2)] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 pointer-events-auto";
            notif.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center shadow-[0_0_15px_#eab308]">
                    <svg class="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"></path>
                    </svg>
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Sector Reward Detected</span>
                    <span class="text-xs font-bold text-white uppercase">${data.name}</span>
                    <span class="text-[9px] text-green-400 font-bold tracking-widest">+${data.reward} GOLD COINS ARCHIVED</span>
                </div>
            `;
        } else {
            // NEARBY Detection (100km)
            notif.className = "glass-panel p-4 rounded-2xl border border-blue-500/40 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500 pointer-events-auto";
            notif.innerHTML = `
                <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/40">
                    <svg class="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                </div>
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-blue-400 uppercase tracking-widest">Nearby Sector Identified</span>
                    <span class="text-xs font-bold text-white uppercase">${data.name}</span>
                    <span class="text-[9px] text-blue-300/60 font-bold tracking-widest">CATEGORY: ${data.category.toUpperCase()} | DIST: ${data.dist}KM</span>
                </div>
            `;
        }

        this.notificationHub.appendChild(notif);

        // Manual dismiss on tap
        notif.addEventListener('click', () => {
            notif.classList.add('opacity-0', '-translate-y-4');
            setTimeout(() => notif.remove(), 500);
        });

        // Auto-remove after 20 seconds (as requested)
        setTimeout(() => {
            if (notif.parentNode) {
                notif.classList.add('opacity-0', '-translate-y-4');
                setTimeout(() => notif.remove(), 500);
            }
        }, 20000);
    }
}
