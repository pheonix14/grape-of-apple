# Grape OS Release Notes - Version 5.4.5

**Release Date**: 2026-07-31  
**Repository**: `https://github.com/pheonix14/grape-of-apple.git`  
**Tag**: `5.4.5` / `v5.4.5`

---

## What's New in v5.4.5

### 1. Intelligent AI Assistant & HuggingFace Integration
- Pre-configured HuggingFace token `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` stored in `.env` and default frontend initialization.
- Automatic failover across top HuggingFace models (`Qwen/Qwen2.5-7B-Instruct`, `Llama-3.2-1B-Instruct`, `Mistral-7B-Instruct`) and smart local spatial brain.

### 2. Live Database Telemetry Integration
- Connected `BrainEngine` directly to `DataEngine` (`users.csv`, `locations.csv`, `transactions.csv`).
- Natural query support for points balance, registered operatives, sectors/locations, and travel history.

### 3. Voice & Text Natural Language App Execution
- Intent action parser (`[ACTION:OPEN_APP:...]`) enabling the AI to run Grape OS apps directly from spoken or typed prompts:
  - *"Open Map"* -> Launches Spatial Map window
  - *"Play Music"* -> Opens Music Player
  - *"Show Travel Reports"* -> Displays Logistics & Sitrep Hub
  - *"Open Compass"* -> Launches Spatial Compass
  - *"Open Identity"* -> Opens Tactical Auth Portal
  - *"Open Settings"* -> Opens System Control Center

### 4. Speech-to-Text (STT), Text-to-Speech (TTS) & Captions
- Instant voice playback using Web Speech Synthesis.
- Automatic word-level screen captions rendered on `global-captions` box.
- Unified Layer 0 Mic assistant bridge with `window.aiController`.
