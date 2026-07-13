# Tactical Intelligence Hub: Neural AR OS

![Tactical AR Interface](https://img.shields.io/badge/OS-Spatial-blue?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Stack-Flask%20%7C%20JS%20%7C%20Tailwind-green?style=for-the-badge)
![Hand Tracking](https://img.shields.io/badge/Tracking-MediaPipe-orange?style=for-the-badge)

A high-performance, spatial operating system designed for lensless **8cm Stereoscopic AR** viewing. This project transforms a mobile or desktop interface into an immersive tactical HUD with real-time hand tracking, voice assistant integration, and wrap-around 3D environments.

---

## 🚀 Core Features

### 1. **Stereoscopic AR Engine**
- **Parallel-Stream Architecture**: Dual video/canvas layers eliminate DOM conflicts, providing a stable 3D view for AR boxes.
- **8cm Physics Calibration**: Specialized IPD and convergence management for near-field direct viewing.
- **Neural Mirroring**: Dynamic coordinate mapping ensures hand-tracking remains synchronized whether mirroring is active or disabled.

### 2. **Neural Hand Tracking**
- **Gesture Navigation**: Interact with panels via high-precision "Pinching" (Index + Thumb).
- **Spatial Cursor**: Dual-projected cursors for stereoscopic accuracy in AR mode.
- **Panel Tilt Physics**: UI panels react dynamically to hand position, providing depth and tactile feedback.

### 3. **Pilot Room (Cockpit Mode)**
- **Concave HUD**: A 1200px perspective engine that angles the side panels 30 degrees toward the center.
- **Flight Instrumentation**: Includes a tactical grid overlay and a centered focus crosshair for high-speed navigation.

### 4. **Neural Voice Assistant**
- **Synchronized Persona**: Locked to a high-quality female synthesis profile with situational awareness logic.
- **Minimized HUD**: Compact transcription overlay that prioritizes screen real-estate for mission data.

### 5. **Media & Intelligence Hubs**
- **Media Hub**: High-fidelity glass-morphism player with audio visualizers and YouTube stream support.
- **Tactical Map**: Real-time location intelligence with pulsing sector nodes and route planning.

---

## 🛠️ Technology Stack

- **Backend**: Python (Flask)
- **Frontend**: HTML5, Tailwind CSS (JIT), Vanilla JavaScript
- **Hand Tracking**: Google MediaPipe (Hands)
- **Voice Engine**: Web Speech API
- **Mapping**: Leaflet.js
- **Styling**: Vision Pro Inspired Glass-morphism

---

## 🔧 Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone [repository-url]
   cd tactical-intel-hub
   ```

2. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Launch the OS**:
   ```bash
   python run.py
   ```

4. **Access the HUD**:
   Open your browser to `http://localhost:5000` (or the IP address of your host machine for mobile testing).

---

## 📱 Optimization Notes

- **Mobile Landscape**: The system includes a **Neural Landscape Protocol** that automatically reconfigures icons, text, and panel dimensions when the device is rotated.
- **AR Box Mode**: For best results, use a direct-viewing AR box with an 8cm focal distance. Engagement is controlled via the **Control Center**.

---

## 📂 Architecture

- `static/js/main.js`: Core initialization and gesture/coordinate synchronization.
- `static/js/tracker.js`: MediaPipe hand tracking implementation.
- `static/js/ui.js`: Spatial cursor and panel interaction logic.
- `static/js/cardboard.js`: Stereoscopic parallel-stream management.
- `static/js/mic.js`: Voice synthesis and recognition engine.
- `static/css/style.css`: 3D transformations, themes (Ares/Legacy), and cockpit mode.

---

## 🛡️ License
Distributed under the MIT License. See `LICENSE` for more information.


*developed by pheonix14*
