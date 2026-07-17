# ✝ Utterance v2.0.0
### *Live Verse Detection for Sermons — Free & Open-Source*

<p align="center">
  <a href="https://github.com/GoodnessFx/Utterance/stargazers">
    <img src="https://img.shields.io/github/stars/GoodnessFx/Utterance?style=for-the-badge" />
  </a>
  <a href="https://github.com/GoodnessFx/Utterance/releases">
    <img src="https://img.shields.io/github/v/release/GoodnessFx/Utterance?style=for-the-badge&label=version" />
  </a>
  <a href="https://github.com/GoodnessFx/Utterance/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/GoodnessFx/Utterance?style=for-the-badge" />
  </a>
  <a href="https://github.com/GoodnessFx/Utterance/issues">
    <img src="https://img.shields.io/github/issues/GoodnessFx/Utterance?style=for-the-badge" />
  </a>
</p>

<p align="center">
  <strong>Utterance listens to your preacher, detects Bible verses in real time, and displays them on your projection screen — automatically.</strong><br/>
  Songs · Scripture · Media · Timer · Transcription · NDI — all in one free app.
</p>

> 🆓 **Free forever. No subscription. No trial. No credit card.**

---

## 🎬 Live Demos

### 🔥 AI Scripture Detection — verses appear the instant the preacher speaks them
![Scripture Detection](./assets/gifs/scripture-detection.gif)

### 🎵 Song Projection Workflow
![Song Projection](./assets/gifs/songs-projection.gif)

### ⏱ Countdown Timer — synced to projection, no lag
![Timer Sync](./assets/gifs/timer-sync.gif)

### 📱 Wi-Fi Remote Control — control from any phone or tablet
![Remote Control](./assets/gifs/remote-control.gif)

---

## ⚡ Quick Start

```bash
git clone https://github.com/GoodnessFx/Utterance.git
cd Utterance
npm install
npm start
```

On Windows, double-click `start.bat`.

---

## 📥 Download

**[GitHub Releases](https://github.com/GoodnessFx/Utterance/releases)** — all versions and build variants

| Platform | Variant | Size | Description |
|----------|---------|------|-------------|
| Windows | **Full** | ~600 MB | Python + Whisper model bundled — works offline immediately |
| Windows | **Light** | ~200 MB | Python bundled — downloads Whisper model on first use |
| macOS Apple Silicon | **Full** | ~500 MB | For M1/M2/M3/M4 Macs, model bundled |
| macOS Apple Silicon | **Light** | ~150 MB | For M1/M2/M3/M4 Macs, downloads model on first use |
| macOS Intel | **Full** | ~500 MB | For Intel Macs, model bundled |
| macOS Intel | **Light** | ~150 MB | For Intel Macs, downloads model on first use |

---

## ✨ Features

### 🎙 AI Transcription & Scripture
- **Real-time sermon transcription** — local Whisper AI (offline) or Deepgram cloud (online)
- **Automatic Bible verse detection** — detects direct quotes, paraphrased references, and spoken-number references
- **Semantic verse matching** — ONNX-based embeddings detect paraphrased scripture even without a direct quote (new in v2.0)
- **Cross-reference awareness** — knows which verses are commonly co-quoted, improving context detection (new in v2.0)
- **Adaptive Memory** — learns speaker vocabulary, accents, and correction patterns over time
- **Detection Review** — approve, reject, or teach custom trigger phrases for future services

### 🌍 Multi-Language Support (new in v2.0)
- **21 interface languages** — English, Spanish, French, German, Portuguese, Chinese, Japanese, Korean, Arabic, Hindi, Russian, Italian, Dutch, Polish, Swedish, Ukrainian, Turkish, Thai, Vietnamese, Hebrew
- **Whisper language selection** — configure transcription language independently from UI language
- **Public domain Bible translations** — one-click download for ASV, WEB, and YLT (no internet required after download)

### 🎵 Worship Tools
- **Song Manager** — full library with lyrics editor, auto slide formatting, and Genius lyrics search
- **Import songs** — paste raw lyrics for instant AI formatting, or import from compatible song library files
- **Theme Designer** — custom fonts, colors, backgrounds, and logos; per-category themes for Scripture, Songs, and Presentations
- **Presentation Editor** — 1920×1080 canvas designer with text, images, shapes, and backgrounds
- **Service Schedule** — drag-and-drop planner to stage verses, songs, and media in order

### 📺 Projection System
- **Live preview + projection** — operator sees the next slide while the congregation sees the current one
- **Multi-monitor support** — auto-detect external displays, select target monitor in settings (new in v2.0)
- **NDI output** — send to OBS, vMix, or Wirecast for live streaming
- **MJPEG fallback** — for any browser-based streaming client
- **Logo, alerts, and live captions** — overlay layers managed independently of the main display
- **Simplified Operator Mode** — streamlined dashboard for non-technical operators with only essential controls (new in v2.0)

### 📱 Remote Control
- Access at `http://[your-ip]:8080/remote` from any phone or tablet on Wi-Fi
- Live projection preview, Scripture / Songs / Media / Slides mode tabs
- Prev / Next / Clear / Go Live — full control from anywhere in the building
- PIN authentication with role-based access (admin, scripture, songs, media, monitor)

### ⏱ Timer System
- **Countdown and count-up** modes with custom title, font, color, and position
- **Displayed on the projection screen** — fully synced, no lag
- **Flashes red** when time expires and shows a closing message to the speaker
- **Clock & date overlay** for pre-service display
- **Standalone Utterance Timer** — installs alongside the main app as a separate shortcut

### 📝 Sermon Intelligence
- **Live transcript** — auto-saved after every session
- **AI Sermon Notes** — generate structured notes from the transcript with one click
- **Sermon Intelligence** — AI title suggestions, keyword analysis, and structure insights
- **Service Archive** — searchable history of every service by title, speaker, or verse
- **Analytics Dashboard** — cross-service stats: most-used books, quoted verses, speaker patterns

### 💾 Settings Export/Import (new in v2.0)
- **Export settings** — backup translation, language, theme, and learned phrases to a JSON file
- **Import settings** — restore settings on a new machine (PINs excluded for security)
- **Cross-machine setup** — share church configurations between multiple installations

### 🔒 Security & Reliability
- **Offline-first** — works entirely without internet using local AI and local Bible data
- **KJV bundled** by default; ASV, WEB, YLT downloadable; import any translation via JSON
- **Hardened security** — PBKDF2 PIN hashing (100k iterations), session tokens, role-based access, rate limiting, CSP headers
- **Crash safety** — local crash logging with automatic log cleanup (new in v2.0)
- **Auto-update** — checks for new versions from GitHub releases (new in v2.0)
- **Setup wizard** — guided first-run experience for language, display, and PIN configuration (new in v2.0)

---

## 💻 Desktop vs Web Mode

| Feature | Desktop | Web |
|---|---|---|
| Bible display + projection | ✅ | ✅ |
| Song management + Genius search | ✅ | ✅ |
| Theme designer | ✅ | ✅ |
| Presentation editor | ✅ | ✅ |
| Service schedule | ✅ | ✅ |
| Remote control | ✅ PIN + roles | ✅ open |
| NDI output | ✅ | ❌ |
| Local Whisper transcription | ✅ | ❌ |
| Deepgram cloud transcription | ✅ | ✅ |
| Countdown timer | ✅ | ❌ |
| PPTX import | ✅ | ❌ |
| Multi-display management | ✅ | ❌ |
| Settings export/import | ✅ | ✅ |
| Auto-update | ✅ | ❌ |

---

## ⌨ Keyboard Shortcuts

| Action | Shortcut |
|---|---|
| Toggle Go Live | `Ctrl+L` |
| Send Preview → Live | `Enter` |
| Next / Prev verse | `↓ / ↑` |
| Clear display | `Ctrl+Backspace` |
| Open Projection | `Ctrl+Shift+P` |
| Open Settings | `Ctrl+,` |
| Help | `F1` |
| Developer Tools | `F12` / `Ctrl+Shift+I` |

---

## 🔨 Build

### Windows
```bash
npm run build:win:full     # Full installer — Python + Whisper model bundled
npm run build:win:light    # Light installer — Python bundled, model downloads on first use
```

### macOS
```bash
# Apple Silicon (M1/M2/M3/M4)
npm run build:mac:full:arm
npm run build:mac:light:arm

# Intel
npm run build:mac:full:x64
npm run build:mac:light:x64
```

### Auto-Update packages (publish to GitHub)
```bash
GH_TOKEN=your_token npm run build:update:win
GH_TOKEN=your_token npm run build:update:mac   # runs arm64 + x64
```

### Standalone Timer
```bash
npm run build:timer
```

> **Windows:** Run `setup_whisper.bat` before building to create the `python\` folder. Place `vc_redist.x64.exe` in the project root for a fully offline installer. Models in a `models\` folder are bundled automatically.

> **macOS:** Set `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` environment variables to notarize. Swap the `python/` folder to the correct architecture before each build.

---

## 🗂 Project Structure

```
src/
├── main.js                    # Electron main process — IPC, projection, timer, NDI
├── timer-main.js              # Standalone Utterance Timer entry point
├── preload.js                 # Electron IPC bridge (contextBridge)
├── crash-reporter.js          # Local crash logging with uncaughtException handlers
├── auto-updater.js            # GitHub releases auto-update with download UI
├── multi-monitor.js           # Display detection, selection, projection targeting
├── language-support.js        # 21-language UI translation manager
├── settings-export.js         # Export/import settings (strips PINs for security)
├── bible-downloader.js        # Downloads public domain translations (ASV/WEB/YLT)
└── renderer/
    ├── index.html             # Main operator dashboard
    ├── projection.html        # Projection output window
    ├── settings.html          # Settings UI with Language/Display/Backup sections
    ├── setup-wizard.html      # First-run setup wizard
    ├── countdown-window.html  # Timer control window
    └── js/
        ├── app.js             # Main app logic and operator workflow
        ├── ai-detection.js    # Bible verse detection engine (6 methods including semantic)
        ├── bible.js           # Bible database + n-gram indexes + cross-refs
        ├── semantic-detection.js  # ONNX embedding-based verse matching
        ├── simple-dashboard.js    # Simplified operator mode
        ├── transcript-memory.js   # Self-improving transcript memory
        └── electron-shim.js       # Web-mode compatibility layer

server.js              # Express web server (web mode)
whisper_server.py      # Local Whisper AI transcription server
installer.nsh          # NSIS installer hooks (VC++, models, timer shortcut)
data/
├── crossrefs.json     # Cross-reference data for co-quoted verses
├── kjv.json           # Bundled KJV Bible
ndi-addon/             # Native NDI SDK addon
assets/                # App icons, splash screen, demo GIFs
```

---

## 📋 Requirements

- **Node.js** 18+
- **Electron** 33+ (desktop mode)
- **Python 3.10–3.12** — optional, for local Whisper transcription (bundled in the Windows installer and macOS DMG)
- **NDI 6 SDK** — optional, for NDI output
- **Apple Developer ID** — optional, for macOS notarization (required for GitHub distribution)

---

## 🌍 Open Source & Contributing

Utterance is MIT licensed and open to contributions from developers, designers, church media operators, and testers.

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines and [CHANGELOG.md](CHANGELOG.md) for the full version history.

```bash
git clone https://github.com/GoodnessFx/Utterance.git
```

---

## ⚠️ Disclaimer

See [DISCLAIMER.md](DISCLAIMER.md) for important information regarding third-party services, AI accuracy, data privacy, and limitations of the software.

---

## ❤️ Mission

To give every church, regardless of size or budget, powerful, reliable, and free tools for worship and the Word.

---

## What's New in v2.0

| Feature | Description |
|---------|-------------|
| **Rebrand** | AnchorCast → Utterance throughout the entire codebase |
| **Full Bible Coverage** | Cross-reference data for 65+ commonly co-quoted verse pairs |
| **Semantic Verse Detection** | ONNX embeddings detect paraphrased scripture without direct quotes |
| **Multi-Language UI** | 21 interface languages with downloadable translations |
| **Public Domain Translations** | One-click download for ASV, WEB, and YLT |
| **Simplified Operator Mode** | Streamlined dashboard for non-technical operators |
| **Setup Wizard** | Guided first-run: language, display, PIN configuration |
| **Crash Safety** | Local crash logging with automatic cleanup |
| **Settings Export/Import** | Backup and restore settings across machines |
| **Multi-Monitor Display** | Auto-detect and select target projection display |
| **Auto-Update** | Background version checking with one-click install |
| **Security Hardening** | PBKDF2 hashing, session tokens, rate limiting, CSP headers |

---

*Built with love for churches everywhere. ✝*
