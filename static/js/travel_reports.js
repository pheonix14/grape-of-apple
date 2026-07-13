import { CONFIG } from './config.js';

export class TravelReports {
    constructor(persistence) {
        this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        this.persistence = persistence;
        
        this.panel = document.getElementById('travel-reports-panel');
        this.list = document.getElementById('travel-reports-list');
        this.locationName = document.getElementById('travel-location-name');
        this.btnClose = document.getElementById('btn-travel-close');
        this.btnMyLocation = document.getElementById('btn-travel-location');
        this.btnSearch = document.getElementById('btn-travel-search');
        this.searchInput = document.getElementById('travel-search-input');
        
        this.scrollTrack = document.getElementById('travel-scroll-track');
        this.scrollHandle = document.getElementById('travel-scroll-handle');

        this.isOpen = false;
        this.isDraggingScroll = false;
        this.init();
    }

    init() {
        if (this.btnClose) {
            this.btnClose.addEventListener('click', () => this.close());
        }
        if (this.btnMyLocation) {
            this.btnMyLocation.addEventListener('click', () => this.loadByProximity());
        }
        if (this.btnSearch) {
            this.btnSearch.addEventListener('click', () => this.loadBySearch());
        }
        
        if (this.searchInput) {
            this.searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.loadBySearch();
            });

            const triggerKeyboard = () => {
                if (window.virtualKeyboard) {
                    window.virtualKeyboard.open(this.searchInput);
                }
            };
            this.searchInput.addEventListener('click', triggerKeyboard);
            this.searchInput.addEventListener('focus', triggerKeyboard);
        }

        if (this.list) {
            this.list.addEventListener('scroll', () => this.updateScrollHandle());
        }
    }

    async open() {
        this.panel.classList.remove('hidden');
        this.isOpen = true;
        
        // Restore last session if available
        if (this.persistence && this.persistence.usageData.lastSession.travelQuery) {
            this.searchInput.value = this.persistence.usageData.lastSession.travelQuery;
            this.locationName.innerText = this.persistence.usageData.lastSession.lastSector || "RESTORING SESSION...";
            this.loadBySearch(true); // Don't track again if restoring
        } else if (this.list.innerHTML.includes('Initialize')) {
            this.loadByProximity();
        }
    }

    handleHandGesture(hand) {
        if (!this.isOpen || !this.panel) return;

        const rect = this.panel.getBoundingClientRect();
        const isHovering = hand.x >= rect.left && hand.x <= rect.right &&
                           hand.y >= rect.top && hand.y <= rect.bottom;

        if (isHovering && !this.isDraggingScroll) {
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const tiltX = (hand.y - centerY) / (rect.height / 2) * -10;
            const tiltY = (hand.x - centerX) / (rect.width / 2) * 10;
            this.panel.style.transition = "transform 0.1s ease-out";
            this.panel.style.transform = `translate(-50%, -50%) perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
        } else if (!this.isDraggingScroll) {
            this.panel.style.transition = "transform 0.5s ease-out";
            this.panel.style.transform = "translate(-50%, -50%) perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)";
        }

        if (hand.isPinching) {
            if (!this.isDraggingScroll && this.scrollTrack) {
                const trackRect = this.scrollTrack.getBoundingClientRect();
                if (hand.x >= trackRect.left - 60 && hand.x <= trackRect.right + 60 &&
                    hand.y >= trackRect.top - 20 && hand.y <= trackRect.bottom + 20) {
                    this.isDraggingScroll = true;
                }
            }

            if (this.isDraggingScroll && this.scrollTrack && this.list) {
                const trackRect = this.scrollTrack.getBoundingClientRect();
                const relativeY = Math.max(0, Math.min(1, (hand.y - trackRect.top) / trackRect.height));
                const totalScroll = this.list.scrollHeight - this.list.clientHeight;
                this.list.scrollTop = relativeY * totalScroll;
                this.updateScrollHandle();
            }
        } else {
            this.isDraggingScroll = false;
        }
    }

    updateScrollHandle() {
        if (!this.scrollHandle || !this.scrollTrack || !this.list) return;
        const scrollPct = this.list.scrollTop / (this.list.scrollHeight - this.list.clientHeight);
        const trackHeight = this.scrollTrack.clientHeight - this.scrollHandle.clientHeight;
        this.scrollHandle.style.top = `${scrollPct * trackHeight}px`;
    }

    async loadByProximity() {
        this.showLoading();
        try {
            const map = window.mapController;
            if (!map || !map.userLocation) {
                this.locationName.innerText = "GPS OFFLINE";
                this.list.innerHTML = '<div class="text-center text-red-400 py-10 font-bold">ERROR: GPS SIGNAL LOST</div>';
                return;
            }

            const [uLat, uLon] = map.userLocation;
            const { data: locations, error: locError } = await this.supabase.from('locations').select('*');
            if (locError) throw locError;

            let nearest = null;
            let minDist = Infinity;
            locations.forEach(loc => {
                const d = Math.sqrt(Math.pow(loc.lat - uLat, 2) + Math.pow(loc.lon - uLon, 2));
                if (d < minDist) {
                    minDist = d;
                    nearest = loc;
                }
            });

            if (!nearest) {
                this.locationName.innerText = "NO SECTOR DETECTED";
                this.list.innerHTML = '<div class="text-center text-white/40 py-10">NO DATA FOR THIS COORDINATE</div>';
                return;
            }

            this.locationName.innerText = `SECTOR: ${nearest.name}`;
            
            // Persist the sector name
            if (this.persistence) {
                this.persistence.usageData.lastSession.lastSector = `SECTOR: ${nearest.name}`;
                this.persistence.saveData();
            }

            this.fetchReports(nearest.id);

        } catch (err) {
            this.showError(err.message);
        }
    }

    async loadBySearch(isRestoring = false) {
        const query = this.searchInput.value.trim();
        if (!query) return;

        this.showLoading();
        try {
            const { data: locations, error: locError } = await this.supabase
                .from('locations')
                .select('*')
                .ilike('name', `%${query}%`)
                .limit(1);

            if (locError) throw locError;

            if (!locations || locations.length === 0) {
                this.locationName.innerText = "SECTOR NOT FOUND";
                this.list.innerHTML = `<div class="text-center text-white/40 py-10">NO SECTOR MATCHING "${query}"</div>`;
                return;
            }

            const target = locations[0];
            this.locationName.innerText = `SECTOR: ${target.name}`;
            
            // Persist the query and sector
            if (this.persistence && !isRestoring) {
                this.persistence.usageData.lastSession.travelQuery = query;
                this.persistence.usageData.lastSession.lastSector = `SECTOR: ${target.name}`;
                this.persistence.saveData();
            }

            this.fetchReports(target.id);

        } catch (err) {
            this.showError(err.message);
        }
    }

    async fetchReports(locId) {
        try {
            const { data: reports, error } = await this.supabase
                .from('travel_reports')
                .select('*')
                .eq('loc_id', locId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.renderReports(reports);
        } catch (err) {
            this.showError(err.message);
        }
    }

    showLoading() {
        this.list.innerHTML = `
            <div class="animate-pulse flex flex-col gap-3">
                <div class="h-20 bg-white/5 rounded-2xl"></div>
                <div class="h-20 bg-white/5 rounded-2xl"></div>
                <div class="h-20 bg-white/5 rounded-2xl"></div>
            </div>
        `;
        if (this.scrollTrack) this.scrollTrack.classList.add('hidden');
    }

    showError(msg) {
        this.list.innerHTML = `<div class="text-center text-red-400 py-10 font-bold uppercase tracking-widest text-[10px]">Failure: ${msg}</div>`;
        if (this.scrollTrack) this.scrollTrack.classList.add('hidden');
    }

    renderReports(reports) {
        if (!reports || reports.length === 0) {
            this.list.innerHTML = '<div class="text-center text-white/40 py-10 font-bold uppercase tracking-widest text-[10px]">No field reports archived for this sector.</div>';
            if (this.scrollTrack) this.scrollTrack.classList.add('hidden');
            return;
        }

        if (this.scrollTrack && reports.length > 3) {
            this.scrollTrack.classList.remove('hidden');
            setTimeout(() => this.updateScrollHandle(), 50);
        } else if (this.scrollTrack) {
            this.scrollTrack.classList.add('hidden');
        }

        this.list.innerHTML = reports.map(r => `
            <div class="bg-white/5 p-4 rounded-[20px] border border-white/10 hover:bg-white/10 transition-all flex flex-col gap-2">
                <div class="flex justify-between items-start">
                    <div>
                        <div class="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">${r.vehicle || 'Unknown Transport'}</div>
                        <div class="text-xs font-bold text-white uppercase leading-tight">${r.origin_name || 'Point A'} ➔ ${r.dest_name || 'Point B'}</div>
                    </div>
                    <div class="text-right">
                        <div class="text-xs font-black text-green-400 font-['Syncopate']">${r.fare} ${r.currency}</div>
                        <div class="text-[8px] opacity-40 font-bold">${new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                </div>
                ${r.note ? `<p class="text-[10px] text-white/60 italic bg-black/20 p-2 rounded-lg mt-1 border border-white/5">${r.note}</p>` : ''}
            </div>
        `).join('');
    }

    close() {
        this.panel.classList.add('hidden');
        this.isOpen = false;
    }
}
