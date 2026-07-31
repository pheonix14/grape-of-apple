# Grape OS Release Notes - Version 5.4.4

**Release Date**: 2026-07-31  
**Repository**: `https://github.com/pheonix14/grape-of-apple.git`  
**Tag**: `5.4.4` / `v5.4.4`

---

## What's New in v5.4.4

### 1. Spatial UI Layer Restructuring (Layer 1 & Layer 0)
- **Layer 1 Music App**: Elevated Music Player (`#music-player` z-[1500]) and Mini Visualizer (`#mini-player` z-[1600]) to Layer 1, ensuring the media hub floats on top of other app windows.
- **Layer 0 Base Widgets**: Re-anchored Messages Hub (`#message-hub` z-[20]) and Voice Assistant Mic container (`#btn-mic-toggle` parent z-[25]) to Layer 0.

### 2. Voice Assistant Mic Sizing Integration
- **Dynamic Icon Scaling**: Linked Voice Assistant Mic button (`#btn-mic-toggle`) to `.app-icon-size` and `--app-size` CSS variable, enabling seamless size adjustments from Control Center Settings.

### 3. Spatial Map App Controls & Interactivity
- **Vertical Controls Column**: Replaced top horizontal controls bar with a sleek vertical column on the right side of the map app (`top-1/2 right-4 -translate-y-1/2 flex-col scale-90`).
- **10% Scale Reduction**: Reduced map control button sizes by 10% for improved field-of-view visibility.
- **Enhanced Touch & Pinch Interactivity**: Optimized Leaflet map touch zoom, scroll wheel zoom, double-click zoom, and added spatial pinch-panning support.
- **Location-Conditional Info `(i)` Button**: Info `(i)` button (`#btn-intel-toggle`) is hidden by default and displays **ONLY** when a target location or marker is specifically selected.
