# Utterance Security Model

## Overview

Utterance is designed as a **local-first, offline-capable** application. By default, no audio, transcripts, or verse data leave the machine. All processing (Whisper transcription, verse detection, embedding matching) runs locally.

## Threat Model

### What an attacker on the same network CAN do (if remote is enabled):

1. **Port scan** the HTTP server port (default 8080) and discover the remote control interface
2. **Attempt PIN brute-force** — mitigated by:
   - PBKDF2 PIN hashing (100k iterations, SHA-256) — never stored in plaintext
   - Rate limiting: 15 failed attempts triggers 5-minute lockout per IP
   - Session tokens expire after 8 hours
3. **Access the remote control API** if they know the PIN — limited to the role granted (admin/scripture/songs/media/monitor)
4. **Inject malformed data** via API endpoints — mitigated by:
   - Input validation on all POST endpoints
   - Path sanitization on Bible translation imports (no arbitrary file read)
   - CSP headers on all served HTML pages
   - Media protocol restricted to allowed directories and file extensions

### What is BLOCKED:

1. **Audio/transcript data exfiltration** — all data stays local unless user explicitly enables cloud STT (Deepgram)
2. **Arbitrary file read via crafted JSON import** — Bible translation import validates file paths and only writes to the designated Bibles directory
3. **Cross-site scripting (XSS)** — CSP headers enforced on projection, settings, and remote pages
4. **Media protocol path traversal** — the `media://` protocol handler restricts access to `APPDATA_ROOT` and `assets/` directories, with an extension allowlist
5. **Session hijacking** — tokens are random 24-byte hex strings, stored in memory only, cleared on disconnect
6. **Replay attacks** — session tokens include expiration timestamps

## Security Features

### PIN Authentication
- **Algorithm**: PBKDF2-SHA256, 100,000 iterations, random 16-byte salt
- **Format**: `pbkdf2:sha256:100000:<salt>:<hash>`
- **Role-based access**: Admin, Scripture, Songs, Media, Monitor — each with separate PINs
- **Rate limiting**: 15 failures per IP → 5-minute cooldown
- **Timing-safe comparison**: Prevents timing attacks on PIN verification

### Content Security Policy (CSP)
Applied to all HTTP-served pages:
```
default-src 'self' http://127.0.0.1:* http://localhost:*
script-src 'self' 'unsafe-inline'
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
font-src 'self' https://fonts.gstatic.com data:
img-src 'self' data: blob: http://127.0.0.1:* https:
media-src 'self' blob: data: http://127.0.0.1:* file:
connect-src 'self' http://127.0.0.1:* <external APIs>
worker-src 'self' blob:
```

### Media Protocol (`media://`)
- Registered as privileged scheme (secure, fetchAPI, bypassCSP, stream)
- **Path restriction**: Only serves files from `APPDATA_ROOT` and `assets/` directories
- **Extension allowlist**: mp4, webm, mov, mkv, avi, wmv, mp3, wav, ogg, flac, jpg, png, gif, webp, svg
- **Range request support**: Required for video seek/playback

### Session Management
- Tokens generated via `crypto.randomBytes(24)` — 48-character hex string
- Stored in memory only (Map), never persisted to disk
- Include role and expiration timestamp (default 8 hours)
- Cleared on disconnect and app quit

### Translation Import Security
- File paths validated against path traversal attacks (`../`, absolute paths)
- Written only to designated Bible directory
- Filename sanitized (remove special characters, max 40 chars)
- No arbitrary file read possible via crafted JSON

## New in v2.0.0

### Crash Reporter
- Writes readable local logs to `userData/UtteranceData/logs/`
- Logs never leave the machine unless user explicitly shares
- Captures uncaught exceptions and unhandled rejections with timestamps and stack traces

### Semantic Verse Detection
- All embedding computation runs locally via ONNX Runtime
- No verse text sent to external services
- Cloud STT (Deepgram) remains opt-in only

### Settings Export/Import
- Export produces a single JSON file with version field
- No secrets or PINs included in export (PINs must be re-entered)
- Import validates file structure before applying

### Mobile Remote
- Same PIN + session token authentication model
- No weakened auth for mobile convenience
- CSP headers enforced on mobile web views

## Recommendations for Deployment

1. **Change the default PIN** immediately after first install
2. **Disable remote access** if not needed (Settings → Remote Control)
3. **Keep the app updated** — check for updates regularly
4. **Review logs** periodically at `userData/UtteranceData/logs/` for suspicious activity
5. **Use HTTPS** if exposing the remote interface beyond the local network (reverse proxy)

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly via:
- GitHub Issues (for non-sensitive bugs)
- Email (for security vulnerabilities — see README for contact)
