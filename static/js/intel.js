export class IntelController {
    constructor(mapController) {
        this.map = mapController;
        this.window = document.getElementById('intel-window');
        this.btnClose = document.getElementById('btn-intel-close');
        this.searchInput = document.getElementById('intel-search-input');
        this.btnExecute = document.getElementById('btn-intel-execute');
        this.resultsList = document.getElementById('intel-results-list');
        this.btnTrigger = document.querySelector('[data-app="intel"]');

        this.isOpen = false;
        this.bindEvents();
    }

    bindEvents() {
        if (this.btnTrigger) {
            this.btnTrigger.addEventListener('click', () => this.toggle());
        }
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.toggle());
        }
        if (this.btnExecute) {
            this.btnExecute.addEventListener('click', () => this.performSearch());
        }
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.performSearch();
            });
        }
    }

    toggle() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.window.classList.remove('hidden');
            setTimeout(() => {
                this.window.classList.add('opacity-100');
                this.window.classList.remove('pointer-events-none');
            }, 10);
            this.map.settings.setAppOpen(true, 'intel');
        } else {
            this.window.classList.remove('opacity-100');
            this.window.classList.add('pointer-events-none');
            setTimeout(() => {
                this.window.classList.add('hidden');
                this.map.settings.setAppOpen(false, 'intel');
            }, 500);
        }
    }

    async performSearch() {
        const query = this.searchInput.value.trim();
        if (!query) return;

        this.resultsList.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20 animate-pulse">
                <div class="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <p class="text-[10px] font-black uppercase tracking-[0.3em] mt-4">Scanning...</p>
            </div>
        `;

        const matches = await this.map.searchIntel(query);
        this.renderResults(matches);
    }

    renderResults(matches) {
        this.resultsList.innerHTML = "";

        if (matches.length === 0) {
            this.resultsList.innerHTML = `
                <div class="text-center py-10 opacity-30">
                    <p class="text-[10px] font-bold uppercase tracking-widest text-red-400">Zero Intel Matches Found</p>
                </div>
            `;
            return;
        }

        matches.forEach(m => {
            const card = document.createElement('div');
            card.className = "interactable glass-panel p-5 rounded-3xl border border-white/10 hover:border-blue-500/50 hover:bg-white/5 transition-all flex flex-col gap-3 group animate-in fade-in slide-in-from-bottom-4";

            let intelSection = "";
            if (m.travel_data) {
                const td = m.travel_data;
                intelSection = `
                    <div class="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/5">
                        <div class="flex flex-col">
                            <span class="text-[8px] font-bold text-white/30 uppercase tracking-widest">Local Fare</span>
                            <span class="text-xs font-black text-green-400">${td.fare} ${td.currency || 'INR'}</span>
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[8px] font-bold text-white/30 uppercase tracking-widest">Sector Vehicle</span>
                            <span class="text-xs font-black text-yellow-400 uppercase">${td.vehicle || 'Transit'}</span>
                        </div>
                    </div>
                    ${td.note ? `<p class="text-[9px] italic text-white/50 bg-white/5 p-2 rounded-lg border border-white/5 mt-1">${td.note}</p>` : ''}
                `;
            }

            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div class="flex flex-col">
                        <h3 class="text-sm font-black text-white uppercase tracking-tighter">${m.name}</h3>
                        <span class="text-[9px] font-bold text-blue-400/60 uppercase tracking-widest">${m.category || 'Node'}</span>
                    </div>
                    <button class="interactable w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/40 transition-all">
                        <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                    </button>
                </div>
                ${intelSection}
            `;

            card.addEventListener('click', () => {
                if (m.lat && m.lon) {
                    this.map.setDestination(m.lat, m.lon, m.name, m.id, m.category, 'intel');
                    this.toggle(); // Close hub upon deployment
                }
            });

            this.resultsList.appendChild(card);
        });
    }
}
