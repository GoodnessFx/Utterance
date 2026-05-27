# Changelog

All notable changes to **AnchorCast** are documented here.

---

## [1.3.0] — 2026-05 *(Upcoming)*

### Added

**Auto-Update**
- App checks for updates automatically every 6 hours and on startup (5-second delay)
- Gold banner appears when a new version is available — shows download progress bar
- Green banner when update is ready — "Restart & Install" button applies the update instantly
- Update packages are small (~30 MB) — Python and Whisper model are never re-downloaded
- Separate update channels per platform and architecture (Windows, Mac ARM64, Mac Intel)

**macOS Support**
- AnchorCast now runs natively on macOS — Apple Silicon (M1/M2/M3) and Intel
- Bundled portable Python 3.12 for offline Whisper AI transcription on Mac
- Whisper model bundled in Full builds; downloaded on first use in Light builds
- Mac-specific PATH restoration — Electron no longer strips Homebrew and user paths
- `after-pack.js` hook restores executable permissions on bundled Python binaries after build
- Traffic light buttons (close/min/max) no longer overlap the AnchorCast title bar
- Cmd+C / Cmd+V / Cmd+X / Cmd+A / Cmd+Z clipboard shortcuts now work in all text fields
- Cmd+P freed for Paste — projection shortcut moved to Cmd+Shift+P

**Remote Control — Sign Out**
- Sign Out button added to the Remote Control UI header
- Clicking Sign Out clears the session token server-side and locally, returns to PIN screen
- `POST /api/signout` endpoint invalidates the session token and clears IP lockout

**Build Variants**
- **Full installer** (~600 MB Windows / ~500 MB Mac) — Python + Whisper model bundled, ready immediately
- **Light installer** (~200 MB Windows / ~150 MB Mac) — Python bundled, model downloaded on first use
- **Update package** (~30 MB) — app code only, silent auto-update for existing users
- Separate build configs: `electron-builder-win-full.json`, `electron-builder-win-light.json`, `electron-builder-win-update.json`, and Mac equivalents

**Dynamic Versioning**
- Version number is now read from `package.json` in a single place
- About, Settings, Bible Manager, Help, and Welcome pages all update automatically on release
- No more manually updating version strings across multiple files

### Fixed

- **HDMI disconnect** — Projection window now parks off-screen silently when projector is unplugged; auto-restores fullscreen and content when reconnected (no user action needed)
- **Win+D minimizing projection** — `minimizable: false` + minimize event intercept prevents Win+D and taskbar from minimizing the projection screen
- **Canvas word-wrap** — Verse text no longer clips at the right edge of Program Preview and Live Display canvases
- **Remote Control auth** — X-Remote-Role header no longer trusted as authentication; sessions properly invalidated on PIN change
- **History window Copy button** — Fixed with 3-method fallback (Electron IPC → navigator.clipboard → execCommand)
- **Remote Control Copy URL / Share buttons** — Same 3-method clipboard fix applied
- **Projection timer z-index** — Timer now renders above song slides (z-index raised from 7 to 50)
- **Media context menu** — Smart viewport positioning prevents menu from rendering off-screen; z-index raised to 9999
- **Whisper not found on Mac** — Fixed Electron stripping PATH on launch, preventing detection of Homebrew Python
- **Wrong userData path on Mac** — Fixed `anchorcast` vs `AnchorCast` case mismatch causing models not to be found
- **Whisper server not killed on app close** — `stopWhisperServer()` now called on `before-quit`; orphaned processes cleaned up via `pkill` on Mac
- **PayPal donation link** — Updated to correct URL across About, Registration Status, and donate modal

### Improvements

**Deepgram Transcription (Live)**
- `utterance_end_ms` reduced from 1200ms to 600ms — final results appear faster
- `no_delay: true` added — minimises Deepgram server-side buffering
- Audio send buffer batches chunks to 100ms before sending — reduces WebSocket overhead
- Audio worklet flush size increased from 2048 to 4096 samples — fewer, larger sends

**Local Whisper Transcription**
- Audio chunk size reduced from 4.5s to 3.5s — slightly faster transcription turnaround
- Overlap reduced from 0.75s to 0.5s
- Clicking "Start Transcript" before Whisper model has loaded now shows a loading state and auto-starts when ready, instead of showing a false "not installed" error
- `whisperLocalReady` check removed from source toggle — Local can always be selected; Whisper starts on demand

**AI Detection**
- Navigation buffer suppresses verse :1 false positives when preacher announces a chapter
- Dedup window upgraded to 5 minutes; 60-minute presented suppression (re-allows at ≥97% confidence)
- Sentence loop collapse added to `normalizeTranscriptText` (Deepgram streaming glitch fix)
- Chapter-range fix: "Genesis 5 and 6" no longer fires Genesis 5:6
- Offline Whisper hallucination guard added
- 30+ biblical word corrections from live sermons added to all 3 correction layers

**Projection**
- Guard interval pauses during GPU teardown on HDMI events — prevents white screen freeze
- `mainWindow` guard in `window-all-closed` prevents premature app quit during display changes

---

## [1.2.0] — 2026-04

### Added

**Timer — Single Source of Truth**
- Centralized timer state lives in the main process — the timer no longer depends on the projection window being open to run
- Projection window rebuilds the running timer correctly from `startedAt` + server time when closed and reopened — no more restarting from zero
- Timer is blocked from starting if the projection screen is not open, with a clear actionable error message
- **Flash Faster button** — hold to speed up the red warning blink on both the preview and projection screen
- Timer enters a red warning phase during the final 60 seconds, not only at 00:00
- End message displayed on projection when countdown expires: *"Thank you. Kindly conclude your session."*
- Count-up mode hides the Duration section (not relevant to count-up)

**Standalone AnchorCast Timer**
- `AnchorCast Timer` installs alongside the main app as a separate shortcut (`AnchorCast.exe --timer`)
- Standalone timer opens its own projection window automatically on a secondary display when the timer starts
- Standalone projection supports custom background control (solid color, image, video), clock & date overlay, and Flash Faster
- `npm run build:timer` produces a fully independent standalone installer

**Clock & Date Display**
- Optional clock overlay on the projection screen — 12h or 24h format, show/hide date, 5 position options, custom color
- Clock state persists correctly when the projection window is closed and reopened
- Clock defaults to Top Left position to avoid overlapping the edge timer

**Projection Background Control** *(Standalone Timer only)*
- Set projection background to Default, Solid color, Image, or Video from the timer control window
- Greyed out with a clear message when running inside the main AnchorCast app

**Projection Pipeline**
- Timer rendering interval tightened to 100ms for smoother countdown display
- Coalesced duplicate render-state updates into a single frame — fewer redraws, less lag
- Skipped exact duplicate scripture / song / media redraws
- Direct projection events now routed through shared pipeline — scripture and song changes feel faster

**Whisper AI — Installer & Runtime**
- `vc_redist.x64.exe` bundled in the installer — Visual C++ installs silently with no user action required
- `python\` folder and `faster-whisper` bundled in the installer — AI transcription works immediately after install with no internet required
- `models\` folder bundled if present at build time; installer offers to download the model (~244 MB) if not bundled
- App detects a missing model on startup and shows the correct banner immediately, rather than silently downloading for 1–2 minutes
- "Set Up Now" button uses the bundled Python directly — no console window, no `setup_whisper.bat` confusion
- All HuggingFace Hub warnings (`HF_TOKEN`, symlinks) suppressed from Whisper server output
- `AppData\Roaming\AnchorCast\` path is now consistent between the installer and the app (fixed a `anchorcast` vs `AnchorCast` case mismatch)
- Whisper models stored in `AppData\Roaming\AnchorCast\AnchorCastData\WhisperModels\` — survives reinstalls and app updates

**Transcript & Sermon Notes**
- Transcript auto-saves to history every time recording stops — `💾 Transcript auto-saved` toast confirmation
- Close safeguard dialog when closing the app with an unsaved transcript — options to Generate Notes, Close anyway, or Stay
- Sermon Notes modal includes a Transcript Picker — browse saved transcripts, select one, or use the current live transcript
- Generate Sermon Notes uses whichever transcript is selected (saved or live)

**Settings — Whisper Model Manager**
- Model manager in **Settings → Audio & AI** shows all 6 Whisper models (tiny.en, base.en, small.en, tiny, base, small) with Fast / Balanced / Accurate labels
- ✓ green badge for installed models; ↓ Download button for uninstalled models
- Downloads run in the background with live progress; model selection dropdown updates automatically on completion

### Fixed

- Startup Whisper banner now correctly identifies what is actually missing — Python not installed, faster-whisper not installed, or only the model file missing
- Projection timer restarting from zero after closing and reopening the projection window
- Main-app timer incorrectly showing a failure toast when the timer started successfully but projection was not open
- Flash Faster button not activating during the warning phase — was only working at 00:00
- NSIS `IfFileExists` using `*.*` which does not match folders — model copy silently skipped during install
- Model download dialog not appearing during installation when models were not bundled
- `anchorcast` vs `AnchorCast` AppData path case mismatch causing the app not to find models after install
- VC++ detection now checks 4 registry paths — correctly detected when installed via Visual Studio 2022, Office, or games
- Blank CMD window appearing during model download — now fully hidden via PowerShell `-WindowStyle Hidden`
- HuggingFace Hub warnings (`HF_TOKEN`, symlinks) appearing in setup terminal output
- NDI `.dylib` (macOS) no longer incorrectly bundled in Windows builds

---

## [1.1.0] — Previous

### Added

Full initial platform release including:

- Live transcription — local Whisper AI + cloud Deepgram
- AI verse detection with approval workflow
- Bundled KJV Bible; multi-translation import support
- Live projection with multi-monitor management
- NDI output and MJPEG stream fallback
- Wi-Fi phone remote with PIN-based role access
- Countdown and count-up timer with projection display
- Song Manager with Genius lyrics search and EasyWorship import
- Theme Designer with per-category themes
- Presentation Editor (1920×1080 canvas)
- Service schedule with drag-and-drop ordering
- Context search (AI-assisted topic-to-verse)
- Sermon History with auto-save
- Adaptive Memory — learns vocabulary and accent patterns per speaker
- Verse Detection Review — approve, reject, teach custom trigger phrases
- Sermon Intelligence — AI title suggestions, keyword analysis, structure insights
- Live Smart Suggestions — real-time scripture and song recommendations
- Analytics Dashboard — cross-service historical stats
- Operator Command Center — compact floating live-service panel
- Post-Service Report — auto-generated service summary
- Service Replay Timeline — replayable event timeline with scrubber
- Service Archive — searchable history by title, speaker, verse, or transcript
- Auto Service Builder — history-based service planning suggestions
- Clip Generator — sermon highlight packages for social media
- Offline-first architecture — local AI, local Bible, no cloud required

---

## [Project Notes]

### Architecture
- Electron desktop mode with IPC-based state management
- Web mode via Express + REST/SSE (most features supported)
- Local JSON-based persistence — no database required
- Projection, timer, remote control, and detection systems share centralized state through the main process

### Focus areas since v1.2.0
- macOS native support (Apple Silicon + Intel)
- Auto-update infrastructure with separate Full / Light / Update build variants
- Deepgram and local Whisper latency improvements
- Remote Control security hardening
- Projection stability (HDMI disconnect, Win+D, canvas rendering)
