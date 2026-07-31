# Grape OS Release Notes - Version 5.4.1

**Release Date**: 2026-07-31  
**Repository**: `https://github.com/pheonix14/grape-of-apple.git`  
**Tag**: `5.4.1` / `v5.4.1`

---

## What's New in v5.4.1

### 1. Button Skins & UI Customization
- **Default Button Skin**: Added a dedicated `Default` skin button to the Button Skins control panel, enabling instant restoration of native styling.
- **Independent Panel Scaling**: Added dedicated `Panel + / -` control buttons in the Control Center utility bar to adjust Control Center and popup panel dimensions separately from sidebar icon size.
- **Dynamic Text Scaling**: Fixed `Text + / -` controls to dynamically update root font size and scaling across all system text elements.
- **Proportional Symbol & Icon Resizing**: Configured SVG icons and symbols to automatically scale proportionally with `--app-size` and `--panel-scale`.

### 2. Backend Modularization Architecture
- **`brainengine.py`**: Integrated Hugging Face Inference API (`Qwen/Qwen2.5-7B-Instruct` / `mistralai/Mistral-7B-Instruct-v0.3`) for intelligent voice assistant query processing, conversational AI, and intent detection with smart local fallback.
- **`dataengine.py`**: Built a robust data management engine handling local CSV files (`users.csv`, `configs.csv`, `locations.csv`, `transactions.csv`) with native REST integration support for Supabase databases.
- **`skin_handler.py`**: Created skin state management and preset definitions (`default`, `ares-rb`, `ares-blue`, `ares-rw`, `legacy`).

### 3. Voice Mic AI Integration
- Enhanced speech recognition in `mic.js` to route general questions and spoken prompts directly to Hugging Face AI engine `/api/brain/query` with automatic text-to-speech feedback via Web Speech Synthesis.

---

## Verification & Compatibility
- Full backward compatibility maintained for all existing API routes and spatial tools.
- Tested locally on Python 3.x with FastAPI and Uvicorn.
