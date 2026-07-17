// Utterance — Simplified Operator Dashboard
// Streamlined UI for non-technical operators during services.
// Shows only essential controls: start/stop, verse display, volume.

'use strict';

window.SimpleDashboard = (() => {
  let _active = false;
  let _container = null;

  function activate(container) {
    _active = true;
    _container = container || document.getElementById('simple-dashboard');
    if (!_container) return;
    _render();
  }

  function deactivate() {
    _active = false;
    if (_container) _container.innerHTML = '';
  }

  function isActive() { return _active; }

  function _render() {
    if (!_container) return;
    _container.innerHTML = `
      <div class="simple-dash">
        <div class="sd-header">
          <div class="sd-logo">UTTERANCE</div>
          <div class="sd-status" id="sd-status">Ready</div>
        </div>
        <div class="sd-main">
          <div class="sd-verse-display" id="sd-verse">
            <div class="sd-verse-text">Press Start to begin</div>
            <div class="sd-verse-ref"></div>
          </div>
          <div class="sd-controls">
            <button class="sd-btn sd-btn-start" id="sd-start" onclick="SimpleDashboard.toggleRecording()">
              <span class="sd-btn-icon">🎤</span>
              <span class="sd-btn-label">Start</span>
            </button>
            <button class="sd-btn sd-btn-clear" onclick="SimpleDashboard.clearVerse()">
              <span class="sd-btn-icon">✕</span>
              <span class="sd-btn-label">Clear</span>
            </button>
            <button class="sd-btn sd-btn-settings" onclick="SimpleDashboard.openSettings()">
              <span class="sd-btn-icon">⚙</span>
              <span class="sd-btn-label">Settings</span>
            </button>
          </div>
        </div>
        <div class="sd-footer">
          <div class="sd-translation" id="sd-translation">KJV</div>
          <div class="sd-detected-count" id="sd-count">0 verses</div>
        </div>
      </div>
      <style>
        .simple-dash {
          display: flex; flex-direction: column; height: 100vh;
          background: linear-gradient(135deg, #0f0c29, #1a1a3e, #24243e);
          color: #e8e6f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          padding: 24px; gap: 16px;
        }
        .sd-header { display: flex; justify-content: space-between; align-items: center; }
        .sd-logo { font-size: 20px; font-weight: 700; color: #c9a84c; letter-spacing: 2px; }
        .sd-status { font-size: 13px; color: #8a82a6; }
        .sd-main { flex: 1; display: flex; flex-direction: column; gap: 16px; }
        .sd-verse-display {
          flex: 1; background: rgba(0,0,0,0.3); border-radius: 16px;
          padding: 32px; display: flex; flex-direction: column; justify-content: center; align-items: center;
          border: 1px solid rgba(201,168,76,0.2); min-height: 200px;
        }
        .sd-verse-text { font-size: 28px; font-weight: 600; text-align: center; line-height: 1.5; }
        .sd-verse-ref { font-size: 16px; color: #c9a84c; margin-top: 16px; font-weight: 500; }
        .sd-controls { display: flex; gap: 12px; }
        .sd-btn {
          flex: 1; padding: 20px; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px;
          background: rgba(255,255,255,0.06); color: #e8e6f0; cursor: pointer;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 600; transition: all 0.2s;
        }
        .sd-btn:hover { background: rgba(255,255,255,0.12); }
        .sd-btn-icon { font-size: 28px; }
        .sd-btn-start.recording { border-color: #ff4444; background: rgba(255,68,68,0.15); }
        .sd-footer { display: flex; justify-content: space-between; font-size: 12px; color: #6a6288; }
      </style>
    `;
  }

  let _recording = false;
  let _verseCount = 0;

  function toggleRecording() {
    _recording = !_recording;
    const btn = document.getElementById('sd-start');
    const status = document.getElementById('sd-status');
    if (btn) {
      btn.classList.toggle('recording', _recording);
      btn.querySelector('.sd-btn-label').textContent = _recording ? 'Stop' : 'Start';
    }
    if (status) status.textContent = _recording ? 'Recording...' : 'Ready';

    if (window.electronAPI?.send) {
      window.electronAPI.send(_recording ? 'simple-start-recording' : 'simple-stop-recording');
    }
  }

  function showVerse(ref, text) {
    _verseCount++;
    const verseEl = document.getElementById('sd-verse');
    const countEl = document.getElementById('sd-count');
    if (verseEl) {
      verseEl.querySelector('.sd-verse-text').textContent = text;
      verseEl.querySelector('.sd-verse-ref').textContent = ref;
    }
    if (countEl) countEl.textContent = `${_verseCount} verse${_verseCount !== 1 ? 's' : ''}`;
  }

  function clearVerse() {
    const verseEl = document.getElementById('sd-verse');
    if (verseEl) {
      verseEl.querySelector('.sd-verse-text').textContent = 'Verse cleared';
      verseEl.querySelector('.sd-verse-ref').textContent = '';
    }
    if (window.electronAPI?.send) {
      window.electronAPI.send('shortcut-clear');
    }
  }

  function openSettings() {
    if (window.electronAPI?.send) {
      window.electronAPI.send('open-settings-modal');
    }
  }

  return { activate, deactivate, isActive, toggleRecording, showVerse, clearVerse, openSettings };
})();
