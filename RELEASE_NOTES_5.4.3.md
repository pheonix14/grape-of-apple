# Grape OS Release Notes - Version 5.4.3

**Release Date**: 2026-07-31  
**Repository**: `https://github.com/pheonix14/grape-of-apple.git`  
**Tag**: `5.4.3` / `v5.4.3`

---

## What's New in v5.4.3

### 1. Instant 0ms Theme & Customization Loading (Fix for Loading Delays)
- **Zero-Latency Booting**: Fixed the 3-4 minute or asynchronous delay when loading saved user customizations by rendering local settings synchronously before DOM paint.
- **Non-Blocking Background Sync**: Background network requests to `/api/user/config/{user_id}` now run completely out-of-band without blocking the initial page load or theme rendering.

### 2. Backend `theme.py` Module
- **`theme.py`**: Introduced dedicated `ThemeEngine` class providing instant cached preset definitions (`themes`, `skins`, `defaults`) and configuration sanitization.
- **Endpoints**: Added `/api/theme/presets` and merged theme preset metadata into `/api/skins/presets`.
