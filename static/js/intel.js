export class IntelController {
    constructor() {
        this.panel = document.getElementById('intel-panel');
        this.btnClose = document.getElementById('btn-intel-close');
        this.targetName = document.getElementById('intel-target-name');
        this.content = document.getElementById('intel-content');
        this.tabs = document.querySelectorAll('.intel-tab');
        
        this.currentLocId = null;
        this.currentData = {
            stories: [],
            reviews: [],
            travel: []
        };
        this.activeTab = 'stories';

        this.bindEvents();
    }

    bindEvents() {
        this.btnClose.addEventListener('click', () => this.close());
        this.tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.setActiveTab(tab.dataset.tab);
            });
        });
    }

    async loadIntel(locId, name) {
        this.currentLocId = locId;
        this.targetName.innerText = name.toUpperCase();
        this.panel.classList.add('open');
        this.renderLoading();

        try {
            const [sRes, rRes, tRes] = await Promise.all([
                fetch(`/api/intel/stories?loc_id=${locId}`).then(r => r.json()),
                fetch(`/api/intel/reviews?loc_id=${locId}`).then(r => r.json()),
                fetch(`/api/intel/travel?loc_id=${locId}`).then(r => r.json())
            ]);

            this.currentData.stories = sRes.stories || [];
            this.currentData.reviews = rRes.reviews || [];
            this.currentData.travel = tRes.reports || [];

            this.renderContent();
        } catch (e) {
            this.content.innerHTML = `<div class="text-red-400 uppercase text-xs tracking-widest text-center p-10">Data Link Severed: ${e.message}</div>`;
        }
    }

    setActiveTab(tabName) {
        this.activeTab = tabName;
        this.tabs.forEach(t => {
            t.classList.toggle('active-tab', t.dataset.tab === tabName);
            t.classList.toggle('text-white/40', t.dataset.tab !== tabName);
            t.classList.toggle('text-white', t.dataset.tab === tabName);
        });
        this.renderContent();
    }

    renderLoading() {
        this.content.innerHTML = `<div class="flex items-center justify-center h-full opacity-50"><span class="animate-pulse uppercase tracking-widest text-sm">Synchronizing Intelligence...</span></div>`;
    }

    renderContent() {
        if (this.activeTab === 'stories') this.renderStories();
        else if (this.activeTab === 'reviews') this.renderReviews();
        else if (this.activeTab === 'travel') this.renderTravel();
    }

    renderStories() {
        const data = this.currentData.stories;
        if (data.length === 0) {
            this.content.innerHTML = `<div class="text-white/30 text-center py-10 uppercase text-xs tracking-tighter">No historical logs found for this sector.</div>`;
            return;
        }

        this.content.innerHTML = data.map(s => `
            <div class="glass-panel p-4 border border-white/10 rounded-xl space-y-2">
                <div class="flex justify-between items-center">
                    <span class="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">${s.s_type || 'LEGEND'}</span>
                    <span class="text-[10px] text-white/40">${s.user_id === 'SYSTEM_ARCHIVE' ? '📡 ARCHIVE' : '👤 ' + s.user_id}</span>
                </div>
                <h3 class="font-bold text-lg text-white/90">${s.title}</h3>
                <p class="text-sm text-white/60 leading-relaxed">${s.content}</p>
                <div class="flex gap-4 pt-2 border-t border-white/5">
                    <span class="text-[10px] text-white/40"><i class="fas fa-heart text-red-500/50"></i> ${s.likes || 0} Likes</span>
                </div>
            </div>
        `).join('');
    }

    renderReviews() {
        const data = this.currentData.reviews;
        if (data.length === 0) {
            this.content.innerHTML = `<div class="text-white/30 text-center py-10 uppercase text-xs tracking-tighter">No visitor field reports available.</div>`;
            return;
        }

        this.content.innerHTML = data.map(r => `
            <div class="glass-panel p-4 border border-white/10 rounded-xl space-y-2">
                <div class="flex justify-between items-center">
                    <div class="text-yellow-400 text-xs">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</div>
                    <span class="text-[10px] text-white/40 uppercase tracking-widest">${r.user_id}</span>
                </div>
                <p class="text-sm text-white/80 italic">"${r.content}"</p>
                <div class="text-[10px] text-white/20 pt-1">${new Date(r.timestamp).toLocaleDateString()}</div>
            </div>
        `).join('');
    }

    renderTravel() {
        const data = this.currentData.travel;
        if (data.length === 0) {
            this.content.innerHTML = `<div class="text-white/30 text-center py-10 uppercase text-xs tracking-tighter">No transit fare data recorded.</div>`;
            return;
        }

        this.content.innerHTML = data.map(t => `
            <div class="glass-panel p-4 border border-white/10 rounded-xl flex justify-between items-center">
                <div>
                    <div class="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">${t.vehicle || 'TRANSIT'}</div>
                    <div class="text-sm font-bold text-white/90">${t.origin_name || 'Start'} → ${t.dest_name || 'End'}</div>
                    <div class="text-[10px] text-white/40 italic mt-1">"${t.note || 'No notes'}"</div>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-green-400">${t.fare} ${t.currency || 'G'}</div>
                    <div class="text-[10px] text-white/20 uppercase">Report ID: ${t.report_id || t.idx}</div>
                </div>
            </div>
        `).join('');
    }

    close() {
        this.panel.classList.remove('open');
    }
}
