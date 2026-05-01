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
        this.btnStop = document.getElementById('btn-map-stop');
        this.btnMinimize = document.getElementById('btn-map-minimize');
        this.routeList = document.getElementById('route-list');
        this.searchResultsPanel = document.getElementById('map-search-results');
        
        // Intel Panel
        this.intelPanel = document.getElementById('tactical-intel');
        this.intelName = document.getElementById('intel-name');
        this.intelCategory = document.getElementById('intel-category');
        this.intelStories = document.getElementById('intel-stories');
        this.intelReviews = document.getElementById('intel-reviews');
        this.intelReports = document.getElementById('intel-reports');
        this.btnIntelClose = document.getElementById('btn-intel-close');
        this.btnIntelDest = document.getElementById('btn-intel-destination');

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
        this.isMinimized = false;
        this.isNavigating = false;
        this.lastPinchPos = null;
        this.hoverTimer = null;
        this.hoverTargetId = null;
        this.currentIntelLoc = null; // Store for 'Set Destination' button

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
                const crosshair = document.getElementById('map-crosshair');
                if (crosshair) {
                    if (this.isPlacementMode) crosshair.classList.add('active');
                    else crosshair.classList.remove('active');
                }
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

        if (this.btnIntelClose) {
            this.btnIntelClose.addEventListener('click', () => {
                this.intelPanel.classList.add('hidden');
            });
        }

        if (this.btnIntelDest) {
            this.btnIntelDest.addEventListener('click', () => {
                if (this.currentIntelLoc) {
                    const loc = this.currentIntelLoc;
                    this.setDestination(loc.lat, loc.lon, loc.name, loc.id, loc.category);
                }
            });
        }

        if (this.btnStop) {
            this.btnStop.addEventListener('click', () => this.stopNavigation());
        }

        if (this.btnMinimize) {
            this.btnMinimize.addEventListener('click', () => this.toggleMinimize());
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

        const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div class="star-node"></div>`,
            iconSize: [24, 24], iconAnchor: [12, 12]
        });
        this.userMarker = L.marker(this.userLocation, { icon: icon }).addTo(this.map).bindPopup("Current Position");

        this.map.on('click', (e) => {
            if (this.isPlacementMode) {
                // In crosshair mode, we use center, but click still works
                this.setDestination(e.latlng.lat, e.latlng.lng, "Tactical Target");
                this.isPlacementMode = false;
                this.btnMarker.classList.remove('bg-red-500/60');
                document.getElementById('map-crosshair').classList.remove('active');
            }
        });

        this.map.on('moveend', () => this.updateMarkers());
        this.map.on('zoomend', () => this.updateMarkers());

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
            // Limit to 100 locations as requested
            const { data: locations, error } = await this.supabase
                .from('locations')
                .select('*')
                .limit(100);
            
            if (error) {
                console.error("Supabase Error:", error);
                return;
            }

            if (locations) {
                console.log(`Neural Link established: ${locations.length} sectors detected.`);
                
                // STATIC GREEN DOT ICON (High Visibility, Upscaled for Pointer)
                const huntIcon = L.divIcon({
                    className: 'static-green-dot',
                    html: '<div class="star-node interactable" style="background-color:#00ff88; width:20px; height:20px; border-radius:50%; border:3px solid white; box-shadow:0 0 15px #00ff88;"></div>',
                    iconSize: [24, 24], iconAnchor: [12, 12]
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
                                <button class="popup-btn" style="background:#bc13fe; color:#fff;" onclick="window.mapController.loadTacticalIntel('${loc.id}', '${loc.name.replace(/'/g, "\\'")}', '${loc.category}', ${loc.lat}, ${loc.lon})">
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
                
                this.updateMarkers(); // Initial placement and scaling
            }
        } catch (e) { console.error("Neural loading failure:", e); }
    }

    updateMarkers() {
        if (!this.map) return;
        
        // If navigating, hide all hunt markers
        if (this.isNavigating) {
            this.huntMarkers.forEach(hm => {
                if (this.map.hasLayer(hm.marker)) this.map.removeLayer(hm.marker);
            });
            return;
        }

        const zoom = this.map.getZoom();
        const bounds = this.map.getBounds();

        // Calculate dynamic size based on zoom (Bigger than pointer when zoomed in)
        // Zoom 2 -> 6px, Zoom 13 -> 24px, Zoom 18 -> 60px
        const baseSize = Math.max(6, Math.pow(zoom, 1.4)); 
        const iconSize = [baseSize, baseSize];
        const iconAnchor = [baseSize / 2, baseSize / 2];

        this.huntMarkers.forEach(hm => {
            const isVisible = bounds.contains(hm.marker.getLatLng());
            
            if (isVisible) {
                if (!this.map.hasLayer(hm.marker)) hm.marker.addTo(this.map);
                
                // Update icon size dynamically
                const newIcon = L.divIcon({
                    className: 'static-green-dot',
                    html: `<div class="star-node interactable" style="background-color:#00ff88; width:${baseSize-4}px; height:${baseSize-4}px; border-radius:50%; border:${Math.max(1, baseSize/10)}px solid white; box-shadow:0 0 ${baseSize/2}px #00ff88;"></div>`,
                    iconSize: iconSize,
                    iconAnchor: iconAnchor
                });
                hm.marker.setIcon(newIcon);

                // Update Labels
                const showLabels = zoom >= 13;
                if (showLabels) hm.marker.openTooltip();
                else hm.marker.closeTooltip();
            } else {
                if (this.map.hasLayer(hm.marker)) this.map.removeLayer(hm.marker);
            }
        });
    }

    updateMarkerLabels() {
        // Now handled by updateMarkers()
    }

    setDestination(lat, lng, name = "Target Locked", locId = null, category = "Tactical Sector") {
        this.isNavigating = true;
        this.selectedDestination = { lat, lng, name };
        
        // Show Stop Button, Hide Clear
        if (this.btnStop) this.btnStop.classList.remove('hidden');
        if (this.btnClear) this.btnClear.classList.add('hidden');
        
        // Remove existing destination marker
        if (this.destinationMarker) this.map.removeLayer(this.destinationMarker);
        
        // Blue Mission Target Icon
        const missionIcon = L.divIcon({
            className: 'mission-target',
            html: '<div class="star-node" style="background-color:#00f2ff; width:30px; height:30px; border-radius:50%; border:4px solid white; box-shadow:0 0 20px #00f2ff; animation: pulse-blue 2s infinite ease-in-out;"></div>',
            iconSize: [34, 34], iconAnchor: [17, 17]
        });

        this.destinationMarker = L.marker([lat, lng], { icon: missionIcon }).addTo(this.map);
        this.destinationMarker.bindPopup(`<b style="color:#00f2ff; text-transform:uppercase;">${name}</b><br><span style="font-size:10px;">MISSION TARGET LOCK</span>`).openPopup();

        // Update markers (will hide them because isNavigating is true)
        this.updateMarkers();
        
        // Start Routing
        this.generatePaths(lat, lng);
        
        // Zoom to mission view
        this.map.flyTo([lat, lng], 14);

        if (locId) {
            this.loadTacticalIntel(locId, name, category, lat, lng);
        }
    }

    stopNavigation() {
        this.isNavigating = false;
        this.selectedDestination = null;
        
        // Clear route
        this.activePolylines.forEach(p => this.map.removeLayer(p));
        this.activePolylines = [];
        
        // Clear destination marker
        if (this.destinationMarker) this.map.removeLayer(this.destinationMarker);
        this.destinationMarker = null;
        
        // Reset UI
        if (this.btnStop) this.btnStop.classList.add('hidden');
        if (this.btnClear) this.btnClear.classList.remove('hidden');
        if (this.infoPanel) this.infoPanel.classList.add('hidden');
        
        // Restore markers
        this.updateMarkers();
        
        // Expand map if minimized
        if (this.isMinimized) this.toggleMinimize();
    }

    toggleMinimize() {
        this.isMinimized = !this.isMinimized;
        const zoomContainer = this.btnZoomIn.parentElement;

        if (this.isMinimized) {
            this.window.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
            this.window.style.width = "400px";
            this.window.style.height = "300px";
            this.window.style.top = "40px";
            this.window.style.right = "40px";
            this.window.style.left = "auto";
            this.window.style.bottom = "auto";
            this.window.style.padding = "10px";
            this.window.classList.add('shadow-2xl', 'border-blue-500/50');
            
            // 1. Hide Minimize/Restore Button (Rely on Double-Pinch)
            this.btnMinimize.style.display = "none";
            
            // 2. Wide Utility Row (Zoom + Locate)
            zoomContainer.style.flexDirection = "row";
            zoomContainer.style.position = "absolute";
            zoomContainer.style.top = "310px";
            zoomContainer.style.right = "0";
            zoomContainer.style.width = "400px";
            zoomContainer.style.height = "50px";
            zoomContainer.style.padding = "0";
            zoomContainer.classList.add('gap-2');
            
            // Style individual buttons for wide mode
            [this.btnZoomIn, this.btnZoomOut, this.btnLocate].forEach(btn => {
                if (btn) {
                    btn.style.flex = "1";
                    btn.style.width = "auto";
                    btn.style.height = "100%";
                    btn.style.borderRadius = "12px";
                }
            });

            // Hide Search and Trash
            if (this.searchInput) this.searchInput.parentElement.classList.add('hidden');
            if (this.btnClear) this.btnClear.classList.add('hidden');
            if (this.btnSearch) this.btnSearch.classList.add('hidden');
        } else {
            this.window.style.width = "100%";
            this.window.style.height = "100%";
            this.window.style.top = "0";
            this.window.style.left = "0";
            this.window.style.padding = "6rem"; // p-24
            this.window.classList.remove('shadow-2xl', 'border-blue-500/50');
            
            // Reset Utility Row (Restore to Top-Center Horizontal Bar)
            zoomContainer.style.flexDirection = "row";
            zoomContainer.style.position = "absolute";
            zoomContainer.style.top = "32px";
            zoomContainer.style.left = "50%";
            zoomContainer.style.transform = "translateX(-50%)";
            zoomContainer.style.right = "auto";
            zoomContainer.style.bottom = "auto";
            zoomContainer.style.width = "auto";
            zoomContainer.style.height = "auto";
            zoomContainer.classList.add('gap-4');
            
            [this.btnZoomIn, this.btnZoomOut, this.btnLocate, this.btnClear, this.btnStop, this.btnMinimize].forEach(btn => {
                if (btn) {
                    btn.style.flex = "none";
                    btn.style.width = "5rem"; // w-20
                    btn.style.height = "4rem"; // h-16
                    btn.style.borderRadius = "1rem"; // rounded-2xl
                }
            });
            
            // Show UI Elements
            if (this.searchInput) this.searchInput.parentElement.classList.remove('hidden');
            if (this.btnSearch) this.btnSearch.classList.remove('hidden');
            if (this.btnClear && !this.isNavigating) this.btnClear.classList.remove('hidden');

            // Reset Minimize Button
            this.btnMinimize.style.display = "flex";
            this.btnMinimize.style.position = "relative";
            this.btnMinimize.style.top = "auto";
            this.btnMinimize.style.right = "auto";
            this.btnMinimize.innerHTML = '<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 12H6"></path></svg>';
        }
        setTimeout(() => this.map.invalidateSize(), 600);
    }

    async loadTacticalIntel(locId, name, category, lat, lon) {
        this.currentIntelLoc = { id: locId, name, category, lat, lon };
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
        if (!this.map || this.isRouting) return;
        this.isRouting = true;
        console.log(`🛰️ Fast-tracking tactical route to: ${lat}, ${lng}...`);
        
        const modes = [
            { id: 'driving', name: 'Driving', color: '#00f2ff' }, // Tactical Blue
            { id: 'foot', name: 'Walking', color: '#00ff88' }    // Stealth Green
        ];

        this.activePolylines.forEach(p => this.map.removeLayer(p));
        this.activePolylines = [];
        if (this.routeList) this.routeList.innerHTML = "";

        for (const mode of modes) {
            // OSRM expects {lon},{lat};{lon},{lat}
            const start = `${this.userLocation[1]},${this.userLocation[0]}`;
            const end = `${lng},${lat}`;
            const url = `https://router.project-osrm.org/route/v1/${mode.id}/${start};${end}?overview=full&geometries=geojson&alternatives=true`;
            
            try {
                const res = await fetch(url);
                const data = await res.json();
                
                if (data.code === 'Ok' && data.routes.length > 0) {
                    data.routes.forEach((route, idx) => {
                        const latlngs = route.geometry.coordinates.map(c => [c[1], c[0]]);
                        const isPrimary = (idx === 0 && mode.id === 'driving');
                        
                        const polyline = L.polyline(latlngs, {
                            color: mode.color,
                            weight: isPrimary ? 8 : 4,
                            opacity: isPrimary ? 0.9 : 0.3,
                            dashArray: idx === 0 ? null : '10, 10'
                        }).addTo(this.map);

                        if (isPrimary) polyline.bringToFront();

                        polyline.routeData = route;
                        this.activePolylines.push(polyline);
                        
                        const dist = (route.distance / 1000).toFixed(1);
                        const card = document.createElement('div');
                        card.className = "glass-panel p-4 rounded-2xl border border-white/10 hover:bg-white/10 cursor-pointer transition-all";
                        
                        if (isPrimary) {
                            card.classList.add('border-blue-400', 'bg-blue-400/10');
                            this.updateRouteUI(route);
                        }
                        
                        card.innerHTML = `<div class="flex justify-between items-center"><span class="font-bold text-sm uppercase tracking-wider">${mode.name} ${idx > 0 ? '#' + (idx + 1) : ''}</span><span class="text-xs opacity-60">${dist} km</span></div>`;
                        card.onclick = () => this.selectPath(polyline, card);
                        polyline.on('click', (e) => { L.DomEvent.stopPropagation(e); this.selectPath(polyline, card); });
                        if (this.routeList) this.routeList.appendChild(card);
                    });
                    console.log(`✅ ${mode.name} roadway synchronized.`);
                } else {
                    console.warn(`⚠️ No ${mode.name} roadway found for this sector.`);
                }
            } catch (err) { 
                console.error(`❌ OSRM Tactical Failure (${mode.id}):`, err); 
            }
        }
        this.isRouting = false;
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
        if (this.timeEl) {
            this.timeEl.classList.remove('hidden');
            const mins = Math.round(route.duration / 60);
            this.timeEl.innerText = `${mins} min`;
        }
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
                div.className = "glass-panel p-3 rounded-xl border border-white/10 hover:bg-white/20 cursor-pointer text-sm font-bold transition-all interactable";
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
        
        // --- COORDINATE SYNC: Offset pointer by map container position ---
        const mapRect = document.getElementById('map-container').getBoundingClientRect();
        const localX = hand.x - mapRect.left;
        const localY = hand.y - mapRect.top;

        // Detect if hand is over the Intel Panel (Right side: approx > 60% width)
        const isOverIntel = hand.x > window.innerWidth * 0.6;
        
        // Detect if hand is over the Minimap (when minimized)
        const isOverMap = hand.x >= mapRect.left && hand.x <= mapRect.right &&
                           hand.y >= mapRect.top && hand.y <= mapRect.bottom;

        // --- DOUBLE PINCH DETECTION ---
        if (hand.isPinching && !this.wasPinching) {
            const now = Date.now();
            if (this.isMinimized && isOverMap && (now - this.lastPinchTime < 400)) {
                this.toggleMinimize();
                this.lastPinchTime = 0; // Reset
                return;
            }
            this.lastPinchTime = now;
        }
        this.wasPinching = hand.isPinching;

        // --- HOVER DETECTION (2 SECONDS) ---
        const hoveredMarker = this.getMarkerAt(localX, localY);
        if (hoveredMarker && !this.isMovingMinimap) {
            if (this.hoverTargetId !== hoveredMarker.data.id) {
                this.hoverTargetId = hoveredMarker.data.id;
                clearTimeout(this.hoverTimer);
                const zoom = this.map.getZoom();
                const lockTime = zoom > 15 ? 1500 : 2000;
                this.hoverTimer = setTimeout(() => {
                    const loc = hoveredMarker.data;
                    this.loadTacticalIntel(loc.id, loc.name, loc.category, loc.lat, loc.lon);
                }, lockTime);
            }
        } else {
            if (!this.clearPending) {
                this.clearPending = true;
                setTimeout(() => {
                    if (!this.getMarkerAt(localX, localY)) {
                        this.hoverTargetId = null;
                        clearTimeout(this.hoverTimer);
                    }
                    this.clearPending = false;
                }, 150); 
            }
        }

        // --- MOVEMENT & PANNING & PLACEMENT ---
        if (hand.isPinching && hand.pinchDistance < 0.08) {
            if (this.isPlacementMode) {
                // DROP MARKER AT CROSSHAIR POSITION (CENTER)
                const center = this.map.getCenter();
                this.setDestination(center.lat, center.lng, "Custom Sector");
                this.isPlacementMode = false;
                if (this.btnMarker) this.btnMarker.classList.remove('bg-red-500/60');
                document.getElementById('map-crosshair').classList.remove('active');
                this.lastPinchPos = null;
                return;
            }

            if (this.lastPinchPos) {
                const dx = hand.x - this.lastPinchPos.x;
                const dy = hand.y - this.lastPinchPos.y;

                if (this.isMinimized && isOverMap && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                    // MOVE MINIMAP WINDOW
                    this.isMovingMinimap = true;
                    const newTop = parseInt(this.window.style.top || 40) + dy;
                    const newRight = parseInt(this.window.style.right || 40) - dx;
                    this.window.style.top = `${newTop}px`;
                    this.window.style.right = `${newRight}px`;
                } else if (isOverIntel && this.intelPanel) {
                    // SCROLL INTEL
                    this.intelPanel.scrollTop -= dy * 1.5; 
                } else if (!this.isMovingMinimap) {
                    // PAN MAP
                    const mapDx = -dx * 2;
                    const mapDy = -dy * 2;
                    if (Math.abs(mapDx) > 1 || Math.abs(mapDy) > 1) this.map.panBy([mapDx, mapDy], { animate: false });
                }
            }
            this.lastPinchPos = { x: hand.x, y: hand.y };
        } else {
            this.lastPinchPos = null;
            this.isMovingMinimap = false;
        }
    }

    getMarkerAt(lx, ly) {
        if (!this.map) return null;
        const point = L.point(lx, ly);
        const zoom = this.map.getZoom();
        
        // Massive threshold for easy locking
        const threshold = Math.max(50, Math.pow(zoom, 1.5) / 2 + 40); 

        for (let hm of this.huntMarkers) {
            if (!this.map.hasLayer(hm.marker)) continue;
            // Get position relative to the map container
            const markerPos = this.map.latLngToContainerPoint(hm.marker.getLatLng());
            const dist = point.distanceTo(markerPos);
            
            if (dist < threshold) return hm;
        }
        return null;
    }
}
