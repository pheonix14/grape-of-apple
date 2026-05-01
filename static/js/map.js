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
        this.routingControl = null;
        this.allRoutes = [];
        this.currentRouteIndex = 0;
        this.infoPanel = document.getElementById('map-route-info');
        this.distanceEl = document.getElementById('route-distance');
        this.timeEl = document.getElementById('route-time');
        this.userLocation = [37.7749, -122.4194]; 
        this.isPlacementMode = false;
        this.placedMarkers = [];

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
                    this.map.setView(this.userLocation, 15);
                    L.marker(this.userLocation).addTo(this.map).bindPopup("My Location").openPopup();
                }
            });
        }

        if (this.btnMarker) {
            this.btnMarker.addEventListener('click', () => {
                this.isPlacementMode = !this.isPlacementMode;
                this.btnMarker.classList.toggle('bg-red-500/60');
                if (this.isPlacementMode) {
                    console.log("Map Placement Mode: Active");
                }
            });
        }

        if (this.btnClear) {
            this.btnClear.addEventListener('click', () => {
                this.placedMarkers.forEach(m => this.map.removeLayer(m));
                this.placedMarkers = [];
            });
        }

        if (this.btnAlt) {
            this.btnAlt.addEventListener('click', () => {
                if (this.allRoutes.length > 1) {
                    this.currentRouteIndex = (this.currentRouteIndex + 1) % this.allRoutes.length;
                    const selectedRoute = this.allRoutes[this.currentRouteIndex];
                    // Manually trigger route selection in Leaflet Routing Machine
                    this.routingControl.spliceWaypoints(0, 2, selectedRoute.waypoints[0], selectedRoute.waypoints[selectedRoute.waypoints.length-1]);
                    this.updateRouteUI(selectedRoute);
                }
            });
        }

        if (this.btnZoomIn) {
            this.btnZoomIn.addEventListener('click', () => {
                this.zoomInBy(1);
            });
        }
        if (this.btnZoomOut) {
            this.btnZoomOut.addEventListener('click', () => {
                this.zoomOutBy(1);
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
                        this.searchInput.value = "";
                        this.searchInput.placeholder = "Location not found...";
                        setTimeout(() => {
                            this.searchInput.placeholder = "Search locations...";
                        }, 2000);
                    }
                }
            });
        }
    }

    zoomInBy(amount = 1) {
        if (this.map) {
            const currentZoom = this.map.getZoom();
            this.map.setZoom(currentZoom + parseInt(amount));
        }
    }

    zoomOutBy(amount = 1) {
        if (this.map) {
            const currentZoom = this.map.getZoom();
            this.map.setZoom(currentZoom - parseInt(amount));
        }
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
            setTimeout(() => {
                this.map.invalidateSize();
            }, 300);
        }
    }

    initMap() {
        this.map = L.map('map-container', {
            zoomControl: false 
        }).setView(this.userLocation, 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CartoDB'
        }).addTo(this.map);

        this.map.on('click', (e) => {
            console.log("Map clicked at:", e.latlng);
            if (this.isPlacementMode) {
                // Remove previous manual markers (one place only)
                this.placedMarkers.forEach(m => this.map.removeLayer(m));
                this.placedMarkers = [];

                const marker = L.marker([e.latlng.lat, e.latlng.lng], {
                    draggable: true,
                    title: "Destination"
                }).addTo(this.map);
                
                marker.bindPopup(`<b>Destination Set</b><br>Lat: ${e.latlng.lat.toFixed(4)}<br>Lng: ${e.latlng.lng.toFixed(4)}`).openPopup();
                this.placedMarkers.push(marker);

                // Auto-disable mode after placing
                this.isPlacementMode = false;
                this.btnMarker.classList.remove('bg-red-500/60');
            }
        });

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                this.userLocation = [pos.coords.latitude, pos.coords.longitude];
                this.map.setView(this.userLocation, 13);
                L.circleMarker(this.userLocation, { color: '#0ff', radius: 8 }).addTo(this.map).bindPopup("You are here");
            });
        }

        setTimeout(() => this.map.invalidateSize(), 400);
    }

    async loadLocations() {
        try {
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

    updateRouteUI(route) {
        if (!route) return;
        this.infoPanel.classList.remove('hidden');
        const dist = (route.summary.totalDistance / 1000).toFixed(1);
        const time = Math.round(route.summary.totalTime / 60);
        this.distanceEl.innerText = `${dist} km`;
        this.timeEl.innerText = `${time} min`;
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
            show: false,
            addWaypoints: false,
            router: L.Routing.osrmv1({
                serviceUrl: 'https://router.project-osrm.org/route/v1',
                profile: 'driving'
            }),
            showAlternatives: true,
            lineOptions: {
                styles: [{color: '#00ff88', opacity: 0.8, weight: 8}]
            },
            altLineOptions: {
                styles: [{color: '#00ccff', opacity: 0.4, weight: 6}]
            }
        }).addTo(this.map);

        this.routingControl.on('routesfound', (e) => {
            this.allRoutes = e.routes;
            this.currentRouteIndex = 0;
            this.updateRouteUI(this.allRoutes[0]);
            
            if (this.allRoutes.length > 1) {
                this.btnAlt.classList.remove('hidden');
            } else {
                this.btnAlt.classList.add('hidden');
            }
        });
    }

    async searchMultipleLocations(query) {
        const { data, error } = await this.supabase
            .from('locations')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(3); 
        
        return data || [];
    }

    handleHandGesture(hand) {
        if (!this.isOpen || !this.map || this.isPlacementMode) return;

        if (hand.isPinching && hand.pinchDistance < 0.05) {
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
