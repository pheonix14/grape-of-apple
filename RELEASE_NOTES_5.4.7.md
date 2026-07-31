# Grape OS Release Notes - Version 5.4.7

**Release Date**: 2026-07-31  
**Repository**: `https://github.com/pheonix14/grape-of-apple.git`  
**Tag**: `5.4.7` / `v5.4.7`

---

## What's New in v5.4.7

### 1. Browser Speech Synthesis Audio Autoplay Unlock
- Resolved text-to-speech (TTS) voice muting issues on Chromium browsers (Chrome, Edge, Safari).
- Added global user gesture audio unlock listener (`window.addEventListener('click', ...)` and `touchstart`) to call `speechSynthesis.resume()` on initial interaction.
- Implemented robust `speechSynthesis.cancel()` + `speechSynthesis.resume()` queue management in `AIController.speak(text)` and `MicAssistant`.
- Added default English voice detection fallback to guarantee speech playback when custom voices are unselected.

### 2. 4-Minute Continuous Stress Test Completion
- Completed 4-minute non-stop workload benchmark (`scratch/stress_test_4min.py`).
- Total jobs executed: 400+ across AI conversations, database mutations, location scans, and app launch directives.
- Maintained 100.0% success rate with peak memory footprint under ~50.4 MB RAM (well below the 300 MB limit).
