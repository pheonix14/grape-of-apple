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
        this.btnAlt = document.getElementById('btn-map-alt');
        this.searchInput = document.getElementById('map-search-input');
        this.btnSearch = document.getElementById('btn-map-search');

        this.map = null;
        this.activePolylines = [];
        this.currentRoutes = [];
        this.currentRouteIndex = 0;
        
        this.infoPanel = document.getElementById('map-route-info');
        this.distanceEl = document.getElementById('route-distance');
        this.timeEl = document.getElementById('route-time');
        
        this.userLocation = [37.7749, -122.4194]; 
        this.isPlacementMode = false;
        this.placedMarkers = [];
        this.destMarker = null;

        // Drag/Swipe state
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
                    this.map.flyTo(this.userLocation, 15);
                    L.marker(this.userLocation).addTo(this.map).bindPopup("My Location").openPopup();
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
                this.clearMap();
            });
        }

        if (this.btnAlt) {
            this.btnAlt.addEventListener('click', () => {
                if (this.currentRoutes.length > 1) {
                    this.currentRouteIndex = (this.currentRouteIndex + 1) % this.currentRoutes.length;
                    this.drawRoute(this.currentRouteIndex);
                }
            });
        }

        if (this.btnZoomIn) {
            this.btnZoomIn.addEventListener('click', () => this.zoomInBy(1));
        }
        if (this.btnZoomOut) {
            this.btnZoomOut.addEventListener('click', () => this.zoomOutBy(1));
        }
        
        if (this.btnSearch) {
            this.btnSearch.addEventListener('click', () => this.handleSearch());
        }
        
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
    }

    async handleSearch() {
        const q = this.searchInput.value.trim();
        if (!q) return;

        // 1. Try Supabase first
        let matches = await this.searchSupabase(q);
        
        // 2. Fallback to Nominatim (Global)
        if (matches.length === 0) {
            matches = await this.searchGlobal(q);
        }

        if (matches.length > 0) {
            const loc = matches[0];
            this.generatePaths(loc.lat, loc.lon, loc.name);
        } else {
            this.searchInput.value = "";
            this.searchInput.placeholder = "Location not found...";
            setTimeout(() => this.searchInput.placeholder = "Search locations...", 2000);
        }
    }

    async searchSupabase(query) {
        try {
            const { data, error } = await this.supabase
                .from('locations')
                .select('*')
                .ilike('name', `%${query}%`)
                .limit(5);
            return (data || []).map(d => ({ lat: d.latitude, lon: d.longitude, name: d.name }));
        } catch (e) { return []; }
    }

    async searchGlobal(query) {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
            const data = await res.json();
            return data.map(d => ({ lat: parseFloat(d.lat), lon: parseFloat(d.lon), name: d.display_name }));
        } catch (e) { return []; }
    }

    clearMap() {
        this.placedMarkers.forEach(m => this.map.removeLayer(m));
        this.placedMarkers = [];
        this.activePolylines.forEach(p => this.map.removeLayer(p));
        this.activePolylines = [];
        if (this.destMarker) this.map.removeLayer(this.destMarker);
        this.infoPanel.classList.add('hidden');
        this.btnAlt.classList.add('hidden');
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
            setTimeout(() => this.initMap(), 300); 
        } else {
            setTimeout(() => this.map.invalidateSize(), 300);
        }
    }

    initMap() {
        this.map = L.map('map-container', { zoomControl: false }).setView(this.userLocation, 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB'
        }).addTo(this.map);

        this.map.on('click', (e) => {
            if (this.isPlacementMode) {
                this.clearMap();
                this.generatePaths(e.latlng.lat, e.latlng.lng, "Pinned Location");
                this.isPlacementMode = false;
                this.btnMarker.classList.remove('bg-red-500/60');
            }
        });

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                this.userLocation = [pos.coords.latitude, pos.coords.longitude];
                this.map.setView(this.userLocation, 13);
                L.circleMarker(this.userLocation, { color: '#0ff', radius: 8, fillOpacity: 1 }).addTo(this.map);
            });
        }
    }

    async generatePaths(lat, lon, name) {
        if (!this.map) this.initMap();
        
        // Clear previous
        this.activePolylines.forEach(p => this.map.removeLayer(p));
        this.activePolylines = [];
        if (this.destMarker) this.map.removeLayer(this.destMarker);

        // Add destination marker
        this.destMarker = L.marker([lat, lon]).addTo(this.map).bindPopup(`<b>${name}</b>`).openPopup();
        this.map.flyTo([lat, lon], 14);

        const url = `https://router.project-osrm.org/route/v1/driving/${this.userLocation[1]},${this.userLocation[0]};${lon},${lat}?overview=full&geometries=geojson&alternatives=true`;
        
        try {
            const res = await fetch(url);
            const data = await res.json();
            
            if (data.code === 'Ok') {
                this.currentRoutes = data.routes;
                this.currentRouteIndex = 0;
                this.drawRoute(0);
                
                if (this.currentRoutes.length > 1) {
                    this.btnAlt.classList.remove('hidden');
                } else {
                    this.btnAlt.classList.add('hidden');
                }
            }
        } catch (e) {
            console.error("Routing Error:", e);
        }
    }

    drawRoute(index) {
        // Clear current polylines
        this.activePolylines.forEach(p => this.map.removeLayer(p));
        this.activePolylines = [];

        const route = this.currentRoutes[index];
        const coordinates = route.geometry.coordinates.map(c => [c[1], c[0]]);
        
        // Draw path
        const polyline = L.polyline(coordinates, {
            color: index === 0 ? '#00ff88' : '#00ccff',
            weight: 8,
            opacity: 0.8,
            lineJoin: 'round'
        }).addTo(this.map);

        this.activePolylines.push(polyline);
        this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

        // Update UI
        this.infoPanel.classList.remove('hidden');
        this.distanceEl.innerText = `${(route.distance / 1000).toFixed(1)} km`;
        this.timeEl.innerText = `${Math.round(route.duration / 60)} min`;
    }

    handleHandGesture(hand) {
        if (!this.isOpen || !this.map || this.isPlacementMode) return;

        if (hand.isPinching && hand.pinchDistance < 0.08) {
            if (this.lastPinchPos) {
                const dx = -(hand.x - this.lastPinchPos.x) * 2; 
                const dy = -(hand.y - this.lastPinchPos.y) * 2;
                if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                    this.map.panBy([dx, dy], { animate: false });
                }
            }
            this.lastPinchPos = { x: hand.x, y: hand.y };
        } else {
            this.lastPinchPos = null;
        }
    }
}
