import { CONFIG } from './config.js';

export class MapController {
    constructor() {
        this.supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        this.window = document.getElementById('map-window');
        this.btnClose = document.getElementById('btn-map-close');
        
        // Map UI controls
        this.btnZoomIn = document.getElementById('btn-map-zoom-in');
        this.btnZoomOut = document.getElementById('btn-map-zoom-out');
        this.searchInput = document.getElementById('map-search-input');
        this.btnSearch = document.getElementById('btn-map-search');

        this.map = null;
        this.routingControl = null;
        this.userLocation = [37.7749, -122.4194]; 

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
        });

        if (this.btnZoomIn) {
            this.btnZoomIn.addEventListener('click', () => {
                if (this.map) this.map.zoomIn();
            });
        }
        if (this.btnZoomOut) {
            this.btnZoomOut.addEventListener('click', () => {
                if (this.map) this.map.zoomOut();
            });
        }
        if (this.btnSearch) {
            this.btnSearch.addEventListener('click', async () => {
                const q = this.searchInput.value.trim();
                if (q) {
                    const matches = await this.searchMultipleLocations(q);
                    if (matches.length > 0) {
                        this.routeTo(matches[0].latitude, matches[0].longitude);
                    } else {
                        alert("Location not found.");
                    }
                }
            });
        }
    }

    openMap() {
        this.window.classList.remove('hidden');
        this.isOpen = true;
        
        if (!this.map) {
            setTimeout(() => {
                this.initMap();
                this.loadLocations();
                this.map.invalidateSize();
            }, 300); 
        } else {
            setTimeout(() => {
                this.map.invalidateSize();
            }, 300);
        }
    }

    initMap() {
        this.map = L.map('map-container', {
            zoomControl: false // Hide default zoom controls to use our big buttons
        }).setView(this.userLocation, 13);
        
        // Always load dark mode map
        const tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
            
        L.tileLayer(tileUrl, {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                this.userLocation = [pos.coords.latitude, pos.coords.longitude];
                this.map.setView(this.userLocation, 13);
                L.circleMarker(this.userLocation, { color: '#0ff', radius: 8 }).addTo(this.map).bindPopup("You are here");
            });
        }
    }

    async loadLocations() {
        try {
            // Load every coordinate from supabase locations table
            const { data: locations, error: locErr } = await this.supabase.from('locations').select('*');
            if (locations) {
                locations.forEach(loc => {
                    if (loc.latitude && loc.longitude) {
                        const marker = L.marker([loc.latitude, loc.longitude]).addTo(this.map);
                        marker.bindPopup(`<b>${loc.name || 'Location'}</b><br>${loc.description || ''}`);
                    }
                });
            }
        } catch (e) {
            console.error("Error fetching Supabase data:", e);
        }
    }

    routeTo(lat, lng) {
        if (!this.map) this.initMap();
        this.openMap();
        
        if (this.routingControl) {
            this.map.removeControl(this.routingControl);
        }

        this.routingControl = L.Routing.control({
            waypoints: [
                L.latLng(this.userLocation[0], this.userLocation[1]),
                L.latLng(lat, lng)
            ],
            routeWhileDragging: false,
            show: false 
        }).addTo(this.map);
    }

    async searchMultipleLocations(query) {
        const { data, error } = await this.supabase
            .from('locations')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(3); 
        
        return data || [];
    }

    // Called by the mic assistant (legacy single search)
    async searchLocationByVoice(query) {
        const data = await this.searchMultipleLocations(query);
        if (data && data.length > 0) {
            const loc = data[0];
            if (loc.latitude && loc.longitude) {
                this.routeTo(loc.latitude, loc.longitude);
                return `Routing to ${loc.name}`;
            }
        }
        return `I couldn't find ${query} in the database.`;
    }

    // Handle spatial hand drag to pan map
    handleHandGesture(hand) {
        if (!this.isOpen || !this.map) return;

        // If pinching, act as a drag
        if (hand.isPinching && hand.pinchDistance < 0.05) {
            if (this.lastPinchPos) {
                // Calculate delta in pixels (hand coords are window pixel space)
                const dx = -(hand.x - this.lastPinchPos.x) * 2; // Multiply for speed
                const dy = -(hand.y - this.lastPinchPos.y) * 2;
                
                // Only pan if there is significant movement
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
