# 🍇 Grape (TreasureGrape Ultimate)

![Status](https://img.shields.io/badge/Status-Release--v5.3-blueviolet?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Mobile%20%7C%20AR-orange?style=for-the-badge)
![Author](https://img.shields.io/badge/Designed%20By-pheonix14-blue?style=for-the-badge)

**Grape** (TreasureGrape Ultimate) is a high-performance, spatial computing interface designed for next-generation augmented and virtual reality experiences on the web. Crafted with a premium dark glass-morphism aesthetic and powered by spatial intelligence, it transforms a standard mobile or desktop browser into an immersive, futuristic command center.

Designed and developed by **pheonix14**.

---

## 🚀 Key Features

### 🎵 Media Hub (Music & Visuals)
- **High-Fidelity Audio**: Real-time frequency visualizer with high-energy ambient/industrial tracks.
- **Streaming & Uploads**: Supports streaming directly from YouTube audio tracks and drag-and-drop local uploads (`.mp3`, `.wav`, `.ogg`).
- **Mini-Player**: A minimized, non-intrusive HUD visualizer for keeping tracks visible and active in the background.

### 🗺️ Spatial Intelligence Map
- **Sector Intel**: Fast, interactive GIS sector tracking utilizing **Leaflet.js**.
- **Distance Profile & Routes**: Calculates distance, coordinates, and real-time movement telemetry profiles.
- **Supabase Persistence**: Integrates with a Supabase database for loading points of interest, updating user reward points, and saving local user settings.

### 🧤 Spatial Hand Tracking
- **MediaPipe CV Engine**: Low-latency, touchless browser interactions using standard device cameras.
- **Gesture Control**: Interact with floating interface decks using spatial pinch commands and movement offsets.
- **Calibration Options**: Mirror and alignment controls to tune tracking to your current environment.

### 🕶️ Stereoscopic (Cardboard) Mode
- **Dual Viewport Render**: Side-by-side rendering optimized for standard mobile VR/AR (Cardboard-style) headsets.
- **IPD Calibration Deck**: Calibrate Inter-Pupillary Distance (IPD) and vertical offset to ensure clean depth perception.
- **Immersive Pilot Cockpit**: Immersive wrap-around environment with real-time hardware baseline statistics.

---

## ⚙️ Project Structure (A-Z)

| File / Directory | Purpose |
| :--- | :--- |
| `main.py` | Core FastAPI application server. Implements auth API, transaction processing, location proximity scoring, and static file endpoints. |
| `run.py` | Auto-reloading hot-dev runner for launching the FastAPI server with dynamic free port mapping. |
| `Dockerfile` | Multi-stage build definition for containerized deployments. |
| `Procfile` | Configuration for running on Cloud Application Platforms (e.g. Heroku, Dokku). |
| `render.yaml` | Infrastructure-as-code configuration for Render hosting. |
| `wasmer.toml` | WebAssembly package configuration. |
| `static/home.html` | Premium landing, hardware telemetry, and calibration bootstrapper page. |
| `static/grape.html` | Main spatial computing cockpit dashboard interface. |
| `static/css/style.css` | Premium CSS design system: glass-morphism panels, glow indicators, animations. |
| `static/js/cardboard.js` | Dual-view rendering mechanics and IPD calibration routines. |
| `static/js/keyboard.js` | Virtual keyboard and alphanumeric inputs for the touchless UI. |
| `static/js/main.js` | Central system bootstrapper. Orchestrates media, maps, and tracking modules. |
| `static/js/map.js` | Spatial mapping, sector loading, and routing telemetry. |
| `static/js/mic.js` | Microphone integration and voice processing handler. |
| `static/js/music.js` | Audio system interface, local file parser, and canvas audio visualizer. |
| `static/js/settings.js` | UI controls, canvas scaling, and themes. |
| `static/js/tracker.js` | MediaPipe hand tracker initializer and hand gesture interpreter. |
| `static/js/ui.js` | Dashboard panels, draggable windows, and interactive UI nodes. |
| `static/media/` | Pre-bundled audio tracks for immediate high-fidelity testing. |

---

## 🛠️ Tech Stack & Dependencies

- **Backend**: FastAPI (Python 3.10+)
- **Database/Auth**: Supabase (PostgreSQL)
- **Frontend Core**: Vanilla HTML5, Vanilla JavaScript (ES6+), Tailwind CSS (Aesthetics utility classes)
- **Computer Vision**: Google MediaPipe (Hands v0.10)
- **Maps**: Leaflet.js
- **Icons**: Lucide Icons (CDN)

---

## 💾 Supabase Schema Setup

To use the dynamic features (Auth, Proximity Rewards, Settings), set up the following tables in your Supabase project:

### 1. `users` Table
```sql
CREATE TABLE users (
    user_id TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    points INT DEFAULT 100,
    level INT DEFAULT 1,
    is_admin BOOLEAN DEFAULT FALSE,
    is_guide BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 2. `locations` Table
```sql
CREATE TABLE locations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    category TEXT DEFAULT 'POINT OF INTEREST',
    reward_per_visit INT DEFAULT 100
);
```

### 3. `transactions` Table
```sql
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    txn_id TEXT UNIQUE NOT NULL,
    user_id TEXT REFERENCES users(user_id),
    amount INT NOT NULL,
    category TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### 4. `configs` Table
```sql
CREATE TABLE configs (
    user_id TEXT PRIMARY KEY REFERENCES users(user_id),
    settings JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

---

## 🔧 Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/pheonix14/grape-of-apple.git
   cd grape-of-apple
   ```

2. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-anon-or-service-role-key
   PORT=8000
   ```

3. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Launch Development Server**:
   ```bash
   python run.py
   ```
   *The server dynamically detects a free port starting from `8000` and starts FastAPI with watchdog auto-reloading enabled.*

---

## 🎨 Design Themes

Toggle themes dynamically in the settings deck:
- **Normal**: Sleek, high-transparency dark glassmorphism.
- **Legacy**: Neon cyan cyberdeck visual mode.
- **Ares RB**: Red & black high-intensity combat telemetry colors.
- **Ares RW/BW**: Clean minimalist white background with high-contrast red or blue elements.

---

## 📜 Credits & License

- Core design, layout, and software architecture by **pheonix14**.
- Distributed under the **MIT License**. See `LICENSE` for more details.
