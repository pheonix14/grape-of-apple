import { CONFIG } from './config.js';

export class MapController {
    constructor(settingsController, intelController) {
        this.settings = settingsController;
        this.intel = intelController;
        this.window = document.getElementById('map-window');
        this.btnClose = document.getElementById('btn-map-close');
        
        // Map UI controls
        this.btnZoomIn = document.getElementById('btn-map-zoom-in');
        this.btnZoomOut = document.getElementById('btn-map-zoom-out');
        this.btnLocate = document.getElementById('btn-map-locate');
        this.btnMarker = document.getElementById('btn-map-marker');
        this.btnClear = document.getElementById('btn-map-clear');
        this.btnAlt = document.getElementById('btn-map-alt');
        this.btnHunt = document.getElementById('btn-hunt-mode');
        this.searchInput = document.getElementById('map-search-input');
        this.btnSearch = document.getElementById('btn-map-search');
        this.routeList = document.getElementById('route-list');

        this.map = null;
        this.activePolylines = [];
        this.destinationMarker = null;
        this.userMarker = null;
        this.huntMarkers = [];
        this.supabaseLocations = []; 
        this.isHuntMode = false;
        
        this.userLocation = [37.7749, -122.4194]; 
        this.isPlacementMode = false;
        this.selectedDestination = null;

        this.infoPanel = document.getElementById('map-route-info');
        this.distanceEl = document.getElementById('route-distance');

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
            if (this.intel) this.intel.close();
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

        if (this.btnHunt) {
            this.btnHunt.addEventListener('click', () => {
                this.toggleHuntMode();
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
                if (this.intel) this.intel.close();
            });
        }

        if (this.btnAlt) {
            this.btnAlt.addEventListener('click', () => this.syncWithBackend());
            this.btnAlt.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>';
            this.btnAlt.title = "Sync Tactical Intel";
            this.btnAlt.classList.remove('hidden');
        }

        if (this.btnZoomIn) this.btnZoomIn.addEventListener('click', () => this.zoomInBy(1));
        if (this.btnZoomOut) this.btnZoomOut.addEventListener('click', () => this.zoomOutBy(1));
        
        if (this.btnSearch) {
            this.btnSearch.addEventListener('click', async () => {
                const q = this.searchInput.value.trim().toLowerCase();
                if (q) {
                    const localMatch = this.supabaseLocations.find(l => 
                        (l.name && l.name.toLowerCase().includes(q))
                    );

                    if (localMatch) {
                        this.setDestination(localMatch.latitude, localMatch.longitude, localMatch.name, localMatch.id);
                        return;
                    }

                    try {
                        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
                        const data = await res.json();
                        if (data.matches && data.matches.length > 0) {
                            const target = data.matches[0];
                            this.setDestination(target.latitude, target.longitude, target.name, target.id);
                        } else {
                            this.searchExternal(q);
                        }
                    } catch (e) { this.searchExternal(q); }
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
                this.loadLocationsFromBackend();
            }, 300); 
        } else {
            setTimeout(() => this.map.invalidateSize(), 300);
        }
    }

    initMap() {
        this.map = L.map('map-container', { zoomControl: false }).setView(this.userLocation, 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB'
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
            navigator.geolocation.watchPosition(pos => {
                this.userLocation = [pos.coords.latitude, pos.coords.longitude];
                if (this.userMarker) this.userMarker.setLatLng(this.userLocation);
            });
        }

        setTimeout(() => this.map.invalidateSize(), 400);
    }

    async loadLocationsFromBackend() {
        try {
            console.log("Requesting Tactical Data from Server Proxy...");
            const res = await fetch('/api/locations');
            const data = await res.json();
            
            if (data.locations) {
                this.supabaseLocations = data.locations;
                const huntIcon = L.divIcon({
                    className: 'treasure-node',
                    html: `<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clip-rule="evenodd"></path><path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z"></path></svg>`,
                    iconSize: [32, 32], iconAnchor: [16, 16]
                });

                data.locations.forEach(loc => {
                    if (loc.latitude && loc.longitude) {
                        const marker = L.marker([loc.latitude, loc.longitude], { icon: huntIcon });
                        marker.bindTooltip(loc.name || 'Sector', { 
                            permanent: true, direction: 'top', className: 'tactical-label neon-label', offset: [0, -15]
                        });
                        marker.on('click', (e) => {
                            L.DomEvent.stopPropagation(e);
                            this.setDestination(loc.latitude, loc.longitude, loc.name, loc.id);
                        });
                        this.huntMarkers.push({ marker, data: loc });
                    }
                });
                
                if (this.isHuntMode) this.huntMarkers.forEach(hm => hm.marker.addTo(this.map));
                this.updateMarkerLabels();
            }
        } catch (e) { console.error("Neural data link failed."); }
    }

    toggleHuntMode() {
        this.isHuntMode = !this.isHuntMode;
        this.btnHunt.classList.toggle('bg-green-500/40', this.isHuntMode);
        if (this.isHuntMode) this.huntMarkers.forEach(hm => hm.marker.addTo(this.map));
        else this.huntMarkers.forEach(hm => this.map.removeLayer(hm.marker));
    }

    updateMarkerLabels() {
        if (!this.map) return;
        const zoom = this.map.getZoom();
        const showLabels = zoom <= 12;
        this.huntMarkers.forEach(hm => {
            if (showLabels && this.isHuntMode) hm.marker.openTooltip();
            else hm.marker.closeTooltip();
        });
    }

    setDestination(lat, lng, name = "Target Locked", locId = null) {
        if (!this.map) return;
        if (this.destinationMarker) this.map.removeLayer(this.destinationMarker);
        
        const blueIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="color:#00d2ff; font-size:32px; filter:drop-shadow(0 0 10px #00d2ff);"><svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"></path></svg></div>',
            iconSize: [32, 32], iconAnchor: [16, 32]
        });

        this.destinationMarker = L.marker([lat, lng], { icon: blueIcon, draggable: true }).addTo(this.map);
        this.destinationMarker.bindPopup(`<b>${name}</b><br>Tactical route updated.`).openPopup();
        this.selectedDestination = { lat, lng, name, id: locId };

        this.destinationMarker.on('dragend', (e) => {
            const pos = e.target.getLatLng();
            this.selectedDestination.lat = pos.lat;
            this.selectedDestination.lng = pos.lng;
            this.generatePaths(pos.lat, pos.lng);
        });

        this.generatePaths(lat, lng);
        this.map.flyTo([lat, lng], 14);

        // AUTO-LOAD INTEL FOR LOCKED LOCATION
        if (locId && this.intel) {
            this.intel.loadIntel(locId, name);
        } else if (this.intel) {
            this.intel.close();
        }
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
    }

    async searchExternal(query) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (data && data.length > 0) this.setDestination(parseFloat(data[0].lat), parseFloat(data[0].lon), data[0].display_name);
        } catch (e) { console.error(e); }
    }

    async syncWithBackend() {
        if (!this.selectedDestination) return;
        try {
            const res = await fetch('/api/sync-mission', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: 1, target_lat: this.selectedDestination.lat, target_lng: this.selectedDestination.lng,
                    target_name: this.selectedDestination.name, updated_at: new Date().toISOString()
                })
            });
            const data = await res.json();
            if (data.status) console.log("Backend Sync Success:", data.status);
        } catch (e) { console.error("Neural sync failed."); }
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
