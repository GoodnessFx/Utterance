// Utterance — Auto-Update Manager
// Checks for updates from GitHub releases. Downloads and installs silently.
// No Squirrel dependency — uses built-in Electron autoUpdater + nsis.

'use strict';

const { app, dialog, shell, BrowserWindow } = require('electron');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const GITHUB_REPO = 'utterance-app/utterance';
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
let _mainWindow = null;
let _updateDataDir = null;

function init(mainWindow, dataDir) {
  _mainWindow = mainWindow;
  _updateDataDir = dataDir;

  // Check for updates periodically
  _checkForUpdates();
  setInterval(_checkForUpdates, CHECK_INTERVAL_MS);
}

async function _checkForUpdates() {
  try {
    const currentVersion = app.getVersion();
    const latest = await _fetchLatestRelease();
    if (!latest) return;

    if (_isNewer(latest.version, currentVersion)) {
      console.log(`[AutoUpdate] New version available: ${latest.version} (current: ${currentVersion})`);
      _notifyUser(latest);
    }
  } catch (e) {
    console.warn('[AutoUpdate] Check failed:', e.message);
  }
}

function _fetchLatestRelease() {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
    const options = {
      headers: { 'User-Agent': 'Utterance-Update-Check' },
      timeout: 10000,
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const release = JSON.parse(data);
          const installer = release.assets?.find(a =>
            a.name.endsWith('.exe') && !a.name.includes('blockmap') && !a.name.includes('.yaml')
          );
          if (!installer) return resolve(null);
          resolve({
            version: release.tag_name?.replace(/^v/, '') || '',
            notes: release.body || '',
            url: installer.browser_download_url,
            size: installer.size,
          });
        } catch (e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

function _isNewer(latest, current) {
  const parse = v => v.split('.').map(Number);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const lv = l[i] || 0;
    const cv = c[i] || 0;
    if (lv > cv) return true;
    if (lv < cv) return false;
  }
  return false;
}

function _notifyUser(release) {
  const sizeMB = (release.size / 1024 / 1024).toFixed(1);
  const result = dialog.showMessageBoxSync(_mainWindow, {
    type: 'info',
    title: 'Update Available',
    message: `Utterance ${release.version} is available`,
    detail: `A new version (${sizeMB} MB) is ready to download.\n\n${release.notes.slice(0, 300)}${release.notes.length > 300 ? '...' : ''}`,
    buttons: ['Download & Install', 'Later', 'View Release Notes'],
    defaultId: 0,
    cancelId: 1,
  });

  if (result === 0) {
    _downloadAndInstall(release);
  } else if (result === 2) {
    shell.openExternal(`https://github.com/${GITHUB_REPO}/releases/tag/v${release.version}`);
  }
}

function _downloadAndInstall(release) {
  const installDir = path.join(app.getPath('temp'), `Utterance-${release.version}-setup.exe`);
  const file = fs.createWriteStream(installDir);

  const progressWin = new BrowserWindow({
    width: 400,
    height: 180,
    resizable: false,
    frame: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false },
  });

  progressWin.loadURL(`data:text/html,
    <html><body style="background:#1a1a3e;color:#e8e6f0;font-family:system-ui;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;">
      <p style="font-size:16px;margin-bottom:16px;">Downloading Utterance ${release.version}...</p>
      <div style="width:80%;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;">
        <div id="bar" style="height:100%;width:0%;background:#7c6af0;border-radius:3px;transition:width 0.3s;"></div>
      </div>
      <p id="pct" style="margin-top:8px;font-size:12px;color:#8a82a6;">0%</p>
    </body></html>`);

  https.get(release.url, { headers: { 'User-Agent': 'Utterance-Updater' } }, (res) => {
    if (res.statusCode === 302 || res.statusCode === 301) {
      https.get(res.headers.location, (res2) => _pipeDownload(res2, file, installDir, progressWin));
    } else {
      _pipeDownload(res, file, installDir, progressWin);
    }
  }).on('error', (e) => {
    progressWin.close();
    dialog.showErrorBox('Download Failed', e.message);
  });
}

function _pipeDownload(res, file, installDir, progressWin) {
  const totalBytes = parseInt(res.headers['content-length'] || '0', 10);
  let received = 0;

  res.on('data', (chunk) => {
    file.write(chunk);
    received += chunk.length;
    if (totalBytes > 0) {
      const pct = Math.round((received / totalBytes) * 100);
      try {
        progressWin.webContents.executeJavaScript(`document.getElementById('bar').style.width='${pct}%';document.getElementById('pct').textContent='${pct}%';`);
      } catch (_) {}
    }
  });

  res.on('end', () => {
    file.end();
    progressWin.close();

    const result = dialog.showMessageBoxSync({
      type: 'info',
      title: 'Update Ready',
      message: 'Download complete. Install now?',
      detail: 'Utterance will close and the installer will launch.',
      buttons: ['Install Now', 'Install Later'],
    });

    if (result === 0) {
      spawn(installDir, [], { detached: true, stdio: 'ignore' }).unref();
      app.quit();
    }
  });

  res.on('error', (e) => {
    file.end();
    progressWin.close();
    try { fs.unlinkSync(installDir); } catch (_) {}
    dialog.showErrorBox('Download Failed', e.message);
  });
}

module.exports = { init };
