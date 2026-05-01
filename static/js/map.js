import { CONFIG } from './config.js';

export class MapController {
    constructor(settingsController) {
        this.settings = settingsController;
        this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        this.window = document.getElementById('map-window');
        this.btnClose = document.getElementById('btn-map-close');
        
        // Map UI controls
        this.btnZoomIn = document.getElementById('btn-map-zoom-in');
        this.btnZoomOut = document.getElementById('btn-map-zoom-out');
        this.btnLocate = document.getElementById('btn-map-locate');
        this.btnMarker = document.getElementById('btn-map-marker');
        this.btnClear = document.getElementById('btn-map-clear');
        this.searchInput = document.getElementById('map-search-input');
        this.btnSearch = document.getElementById('btn-map-search');
        this.routeList = document.getElementById('route-list');
        this.searchResultsPanel = document.getElementById('map-search-results');
        
        // Intel Panel
        this.intelPanel = document.getElementById('tactical-intel');
        this.intelName = document.getElementById('intel-name');
        this.intelCategory = document.getElementById('intel-category');
        this.intelStories = document.getElementById('intel-stories');
        this.intelReviews = document.getElementById('intel-reviews');
        this.intelReports = document.getElementById('intel-reports');

        this.map = null;
        this.activePolylines = [];
        this.destinationMarker = null;
        this.userMarker = null;
        this.huntMarkers = [];
        this.isHuntMode = true; // Always active now
        
        this.userLocation = [37.7749, -122.4194]; 
        this.isPlacementMode = false;
        this.selectedDestination = null;

        this.infoPanel = document.getElementById('map-route-info');
        this.distanceEl = document.getElementById('route-distance');
        this.timeEl = document.getElementById('route-time');

        this.isOpen = false;
        this.lastPinchPos = null;

        this.bindEvents();
    }

    bindEvents() {
        document.querySelector('[data-app="map"]').addEventListener('click', () => {
            this.openMap();
        });

        this.btnClose.addEventListener('click', () => {
            this.window.classList.add('hidden');
            this.isOpen = false;
            if (this.settings) this.settings.setAppOpen(false);
        });

        if (this.btnLocate) {
            this.btnLocate.addEventListener('click', () => {
                if (this.map) {
                    this.map.setView(this.userLocation, 15);
                    if (this.userMarker) this.userMarker.openPopup();
                }
            });
        }

        if (this.btnMarker) {
            this.btnMarker.addEventListener('click', () => {
                this.isPlacementMode = !this.isPlacementMode;
                this.btnMarker.classList.toggle('bg-red-500/60');
            });
        }

        if (this.btnClear) {
            this.btnClear.addEventListener('click', () => {
                if (this.destinationMarker) this.map.removeLayer(this.destinationMarker);
                this.destinationMarker = null;
                this.activePolylines.forEach(p => this.map.removeLayer(p));
                this.activePolylines = [];
                if (this.routeList) this.routeList.innerHTML = "";
                this.infoPanel.classList.add('hidden');
            });
        }

        if (this.btnZoomIn) {
            this.btnZoomIn.addEventListener('click', () => this.zoomInBy(1));
        }
        if (this.btnZoomOut) {
            this.btnZoomOut.addEventListener('click', () => this.zoomOutBy(1));
        }
        if (this.btnSearch) {
            this.btnSearch.addEventListener('click', async () => {
                const q = this.searchInput.value.trim();
                if (q) {
                    const matches = await this.searchMultipleLocations(q);
                    if (matches.length > 0) {
                        const target = matches[0];
                        this.setDestination(target.lat, target.lon, target.name, target.id, target.category);
                        this.searchResultsPanel.classList.add('hidden');
                    } else {
                        this.searchExternal(q);
                    }
                }
            });
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('input', async () => {
                const q = this.searchInput.value.trim();
                if (q.length > 1) {
                    const matches = await this.searchMultipleLocations(q);
                    this.showSearchResults(matches);
                } else {
                    this.searchResultsPanel.classList.add('hidden');
                }
            });
        }
    }

    zoomInBy(amount = 1) {
        if (this.map) this.map.setZoom(this.map.getZoom() + amount);
    }

    zoomOutBy(amount = 1) {
        if (this.map) this.map.setZoom(this.map.getZoom() - amount);
    }

    openMap() {
        this.window.classList.remove('hidden');
        this.isOpen = true;
        if (this.settings) this.settings.setAppOpen(true);
        
        if (!this.map) {
            setTimeout(() => {
                this.initMap();
                this.loadLocations();
            }, 300); 
        } else {
            setTimeout(() => this.map.invalidateSize(), 300);
        }
    }

    initMap() {
        this.map = L.map('map-container', { zoomControl: false }).setView(this.userLocation, 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB',
            noWrap: true,
            minZoom: 2
        }).addTo(this.map);

        const redIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="background-color:#ff003c; width:12px; height:12px; border-radius:50%; box-shadow:0 0 10px #ff003c; border:2px solid white;"></div>',
            iconSize: [12, 12], iconAnchor: [6, 6]
        });
        this.userMarker = L.marker(this.userLocation, { icon: redIcon }).addTo(this.map).bindPopup("Current Position");

        this.map.on('click', (e) => {
            if (this.isPlacementMode) {
                this.setDestination(e.latlng.lat, e.latlng.lng, "Tactical Target");
                this.isPlacementMode = false;
                this.btnMarker.classList.remove('bg-red-500/60');
            }
        });

        this.map.on('zoomend', () => this.updateMarkerLabels());

        if (navigator.geolocation) {
            let lastSyncTime = 0;
            navigator.geolocation.watchPosition(pos => {
                const now = Date.now();
                this.userLocation = [pos.coords.latitude, pos.coords.longitude];
                if (this.userMarker) this.userMarker.setLatLng(this.userLocation);
                
                // Real-time GPS Sync to Supabase (Throttled to every 5 seconds)
                if (now - lastSyncTime > 5000) {
                    this.syncGPS(pos.coords.latitude, pos.coords.longitude);
                    lastSyncTime = now;
                }
            }, err => console.error("Geolocation Error:", err), { enableHighAccuracy: true });
        }

        setTimeout(() => this.map.invalidateSize(), 400);
    }

    async syncGPS(lat, lng) {
        try {
            const { error } = await this.supabase.from('user_tracking').upsert({
                user_id: 'tactical_unit_1', // Default ID for tracking
                latitude: lat,
                longitude: lng,
                last_updated: new Date().toISOString()
            }, { onConflict: 'user_id' });
            
            if (!error) console.log("📡 GPS Synchronized to Command Center");
            else console.error("GPS Sync Error:", error);
        } catch (e) { console.error("Supabase GPS Failure:", e); }
    }

    async loadLocations() {
        try {
            console.log("Syncing Tactical Sectors from Supabase...");
            const { data: locations, error } = await this.supabase.from('locations').select('*');
            
            if (error) {
                console.error("Supabase Error:", error);
                return;
            }

            if (locations) {
                console.log(`Neural Link established: ${locations.length} sectors detected.`);
                
                // STATIC GREEN DOT ICON (High Visibility, No Animation)
                const huntIcon = L.divIcon({
                    className: 'static-green-dot',
                    html: '<div style="background-color:#00ff88; width:10px; height:10px; border-radius:50%; border:2px solid white; box-shadow:0 0 8px #00ff88;"></div>',
                    iconSize: [12, 12], iconAnchor: [6, 6]
                });

                const markersForBounds = [];
                locations.forEach(loc => {
                    if (loc.lat && loc.lon) {
                        const marker = L.marker([loc.lat, loc.lon], { icon: huntIcon });
                        
                        // Permanent Neon Label
                        marker.bindTooltip(loc.name || 'Sector', { 
                            permanent: true, 
                            direction: 'top',
                            className: 'neon-label',
                            offset: [0, -15]
                        });
                        
                        const popupContent = `
                            <div style="text-align:center; min-width:150px;">
                                <b style="color:#ccff00; font-size:14px; text-transform:uppercase; font-family:'Syncopate';">${loc.name}</b>
                                <div style="margin:8px 0; color:#00f2ff; font-weight:bold; font-size:12px; font-family:'Space Grotesk';">
                                    <i class="fas fa-gem"></i> ${loc.reward_per_visit || 50} Gold
                                </div>
                                <button class="popup-btn" style="background:#bc13fe; color:#fff;" onclick="window.mapController.setDestination(${loc.lat}, ${loc.lon}, '${loc.name.replace(/'/g, "\\'")}', '${loc.id}', '${loc.category}')">
                                    <i class="fas fa-info-circle"></i> VIEW INFO
                                </button>
                                <button class="popup-btn" style="background:#ccff00; color:#000; font-weight:bold;" onclick="window.mapController.setDestination(${loc.lat}, ${loc.lon}, '${loc.name.replace(/'/g, "\\'")}', '${loc.id}', '${loc.category}')">
                                    <i class="fas fa-crosshairs"></i> SET DESTINATION
                                </button>
                            </div>
                        `;
                        marker.bindPopup(popupContent);

                        marker.on('click', (e) => {
                            L.DomEvent.stopPropagation(e);
                            // We use the buttons in the popup now
                        });

                        marker.addTo(this.map); 
                        this.huntMarkers.push({ marker, data: loc });
                        markersForBounds.push([loc.lat, loc.lon]);
                    }
                });

                if (markersForBounds.length > 0) {
                    const bounds = L.latLngBounds(markersForBounds);
                    this.map.fitBounds(bounds, { padding: [50, 50] });
                }
                
                this.updateMarkerLabels();
            }
        } catch (e) { console.error("Neural loading failure:", e); }
    }

    updateMarkerLabels() {
        if (!this.map) return;
        const zoom = this.map.getZoom();
        const showLabels = zoom >= 13; 
        this.huntMarkers.forEach(hm => {
            if (showLabels) hm.marker.openTooltip();
            else hm.marker.closeTooltip();
        });
    }

    setDestination(lat, lng, name = "Target Locked", locId = null, category = "Tactical Sector") {
        if (!this.map) return;
        if (this.destinationMarker) this.map.removeLayer(this.destinationMarker);

        const blueIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="color:#00d2ff; font-size:32px; filter:drop-shadow(0 0 10px #00d2ff);"><svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg></div>',
            iconSize: [32, 32], iconAnchor: [16, 32]
        });

        this.destinationMarker = L.marker([lat, lng], { icon: blueIcon, draggable: true }).addTo(this.map);
        this.destinationMarker.bindPopup(`<b>${name}</b><br>Tactical route updated.`).openPopup();
        this.selectedDestination = { lat, lng, name };

        if (locId) {
            this.loadTacticalIntel(locId, name, category);
        } else {
            this.intelPanel.classList.add('hidden');
        }

        this.destinationMarker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            this.selectedDestination.lat = pos.lat;
            this.selectedDestination.lng = pos.lng;
            this.generatePaths(pos.lat, pos.lng);
        });

        this.generatePaths(lat, lng);
        this.map.flyTo([lat, lng], 14);
    }

    async loadTacticalIntel(locId, name, category) {
        this.intelPanel.classList.remove('hidden');
        this.intelName.innerText = name;
        this.intelCategory.innerText = category || "Tactical Sector";
        
        // Clear previous
        this.intelStories.innerHTML = '<div class="text-xs opacity-50">Loading Lore...</div>';
        this.intelReviews.innerHTML = '<div class="text-xs opacity-50">Scanning SITREPs...</div>';
        this.intelReports.innerHTML = '<div class="text-xs opacity-50">Checking Logistics...</div>';

        // 1. Stories
        this.supabase.from('stories').select('*').eq('loc_id', locId).then(({ data }) => {
            this.intelStories.innerHTML = data && data.length > 0 
                ? data.map(s => `<div class="bg-white/5 p-3 rounded-2xl border border-white/5"><div class="font-bold text-xs mb-1">${s.title}</div><div class="text-[10px] opacity-70">${s.content}</div></div>`).join('')
                : '<div class="text-xs opacity-30 italic">No lore archived for this sector.</div>';
        });

        // 2. Reviews (SITREPs)
        this.supabase.from('reviews').select('*').eq('location_id', locId).then(({ data }) => {
            this.intelReviews.innerHTML = data && data.length > 0 
                ? data.map(r => `<div class="bg-white/5 p-3 rounded-2xl border border-white/5"><div class="flex justify-between font-bold text-[10px] mb-1"><span>${r.user_id}</span><span>${'★'.repeat(r.rating)}</span></div><div class="text-[10px] opacity-70">${r.content}</div></div>`).join('')
                : '<div class="text-xs opacity-30 italic">No field reports available.</div>';
        });

        // 3. Travel Reports (Logistics)
        this.supabase.from('travel_reports').select('*').eq('loc_id', locId).then(({ data }) => {
            this.intelReports.innerHTML = data && data.length > 0 
                ? data.map(tr => `<div class="bg-white/5 p-3 rounded-2xl border border-white/5"><div class="flex justify-between text-[10px] font-bold"><span>${tr.vehicle || 'Transport'}</span><span>${tr.fare} ${tr.currency}</span></div><div class="text-[10px] opacity-70">${tr.origin_name} ➔ ${tr.dest_name}</div></div>`).join('')
                : '<div class="text-xs opacity-30 italic">No transport data found.</div>';
        });
    }

    async generatePaths(lat, lng) {
        if (!this.map) return;
        const modes = [{ id: 'driving', name: 'Driving', color: '#ff003c' }, { id: 'foot', name: 'Walking', color: '#00ff88' }];
        this.activePolylines.forEach(p => this.map.removeLayer(p));
        this.activePolylines = [];
        if (this.routeList) this.routeList.innerHTML = "";

        for (const mode of modes) {
            const url = `https://router.project-osrm.org/route/v1/${mode.id}/${this.userLocation[1]},${this.userLocation[0]};${lng},${lat}?overview=full&geometries=geojson&alternatives=true`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                if (data.code === 'Ok') {
                    data.routes.forEach((route, idx) => {
                        const latlngs = route.geometry.coordinates.map(c => [c[1], c[0]]);
                        const polyline = L.polyline(latlngs, {
                            color: mode.color, weight: 6, opacity: (idx === 0 && mode.id === 'driving') ? 0.9 : 0.3,
                            dashArray: idx === 0 ? null : '10, 10'
                        }).addTo(this.map);
                        polyline.routeData = route;
                        this.activePolylines.push(polyline);
                        const dist = (route.distance / 1000).toFixed(1);
                        const card = document.createElement('div');
                        card.className = "glass-panel p-4 rounded-2xl border border-white/10 hover:bg-white/10 cursor-pointer transition-all";
                        if (idx === 0 && mode.id === 'driving') {
                            card.classList.add('border-blue-400', 'bg-blue-400/10');
                            this.updateRouteUI(route);
                        }
                        card.innerHTML = `<div class="flex justify-between items-center"><span class="font-bold text-sm uppercase tracking-wider">${mode.name} ${idx > 0 ? '#' + (idx + 1) : ''}</span><span class="text-xs opacity-60">${dist} km</span></div>`;
                        card.onclick = () => this.selectPath(polyline, card);
                        polyline.on('click', (e) => { L.DomEvent.stopPropagation(e); this.selectPath(polyline, card); });
                        if (this.routeList) this.routeList.appendChild(card);
                    });
                }
            } catch (err) { console.error("OSRM Error:", err); }
        }
    }

    selectPath(polyline, card) {
        this.activePolylines.forEach(p => p.setStyle({ opacity: 0.2, weight: 6 }));
        if (this.routeList) Array.from(this.routeList.children).forEach(c => c.classList.remove('border-blue-400', 'bg-blue-400/10'));
        polyline.setStyle({ opacity: 1, weight: 10 });
        if (card) card.classList.add('border-blue-400', 'bg-blue-400/10');
        this.updateRouteUI(polyline.routeData);
    }

    updateRouteUI(route) {
        if (!route) return;
        this.infoPanel.classList.remove('hidden');
        const dist = (route.distance / 1000).toFixed(1);
        this.distanceEl.innerText = `${dist} km`;
        if (this.timeEl) this.timeEl.classList.add('hidden');
    }

    async searchExternal(query) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data && data.length > 0) this.setDestination(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name);
        } catch (e) { console.error(e); }
    }

    async syncWithSupabase() {
        // This is now legacy/automatic but kept for reference if needed
        if (!this.selectedDestination) return;
        try {
            await this.supabase.from('missions').upsert({
                id: 1, target_lat: this.selectedDestination.lat, target_lng: this.selectedDestination.lng,
                target_name: this.selectedDestination.name, updated_at: new Date()
            });
        } catch (e) { console.error("Sync Failed:", e); }
    }

    async searchMultipleLocations(query) {
        if (!query || query.length < 2) return [];
        try {
            // Updated for User Schema: Removed 'description', added 'category'
            const filter = `name.ilike.%${query}%,category.ilike.%${query}%`;
            
            const { data, error } = await this.supabase
                .from('locations')
                .select('*')
                .or(filter)
                .limit(10);

            if (error) {
                console.error("Supabase Search Error:", error.message, error.details);
                // Fallback to name-only search
                const { data: fallbackData } = await this.supabase
                    .from('locations')
                    .select('*')
                    .ilike('name', `%${query}%`)
                    .limit(10);
                return fallbackData || [];
            }

            return data || [];
        } catch (e) {
            console.error("Search execution failed:", e);
            return [];
        }
    }

    showSearchResults(matches) {
        if (!this.searchResultsPanel) return;
        this.searchResultsPanel.innerHTML = "";
        if (matches.length > 0) {
            this.searchResultsPanel.classList.remove('hidden');
            matches.forEach(loc => {
                const div = document.createElement('div');
                div.className = "glass-panel p-3 rounded-xl border border-white/10 hover:bg-white/20 cursor-pointer text-sm font-bold transition-all";
                div.innerText = loc.name;
                div.onclick = () => {
                    this.setDestination(loc.lat, loc.lon, loc.name, loc.id, loc.category);
                    this.searchResultsPanel.classList.add('hidden');
                    this.searchInput.value = loc.name;
                };
                this.searchResultsPanel.appendChild(div);
            });
        } else {
            this.searchResultsPanel.classList.add('hidden');
        }
    }

    handleHandGesture(hand) {
        if (!this.isOpen || !this.map || this.isPlacementMode) return;
        if (hand.isPinching && hand.pinchDistance < 0.05) {
            if (this.lastPinchPos) {
                const dx = -(hand.x - this.lastPinchPos.x) * 2; 
                const dy = -(hand.y - this.lastPinchPos.y) * 2;
                if (Math.abs(dx) > 1 || Math.abs(dy) > 1) this.map.panBy([dx, dy], { animate: false });
            }
            this.lastPinchPos = { x: hand.x, y: hand.y };
        } else this.lastPinchPos = null;
    }
}
