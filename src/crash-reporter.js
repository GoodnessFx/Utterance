// Utterance — Local Crash Reporter
// Writes readable crash logs to userData/UtteranceData/logs/
// No telemetry leaves the machine unless user explicitly shares a log file.

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

class CrashReporter {
  constructor(userDataPath) {
    this.logDir = path.join(userDataPath, 'UtteranceData', 'logs');
    this.maxLogFiles = 30;
    this._ensureLogDir();
  }

  _ensureLogDir() {
    try { fs.mkdirSync(this.logDir, { recursive: true }); } catch (_) {}
  }

  _logFileName() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `crash-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.log`;
  }

  _appVersion() {
    try {
      const pkg = require(path.join(__dirname, '..', 'package.json'));
      return pkg.version || 'unknown';
    } catch (_) { return 'unknown'; }
  }

  _systemInfo() {
    return [
      `Utterance v${this._appVersion()}`,
      `Platform: ${process.platform} ${process.arch}`,
      `OS: ${os.release()} (${os.type()})`,
      `Node: ${process.version}`,
      `Electron: ${process.versions?.electron || 'N/A'}`,
      `Chrome: ${process.versions?.chrome || 'N/A'}`,
      `Time: ${new Date().toISOString()}`,
      `Memory: ${Math.round(os.totalmem() / 1024 / 1024)}MB total, ${Math.round(os.freemem() / 1024 / 1024)}MB free`,
      `CPUs: ${os.cpus().length}`,
      '',
    ].join('\n');
  }

  _writeLog(type, error, extra = '') {
    try {
      const lines = [
        `=== Utterance ${type} ===`,
        this._systemInfo(),
        extra ? `--- Additional Info ---\n${extra}\n` : '',
        `--- Error ---`,
        error ? (error.stack || error.message || String(error)) : 'No error object',
        '',
        `=== End of Log ===`,
        '',
      ].filter(Boolean).join('\n');

      const filePath = path.join(this.logDir, this._logFileName());
      fs.writeFileSync(filePath, lines, 'utf8');
      console.log(`[CrashReporter] ${type} logged to: ${filePath}`);
      this._cleanupOldLogs();
      return filePath;
    } catch (e) {
      console.error('[CrashReporter] Failed to write log:', e.message);
      return null;
    }
  }

  _cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir)
        .filter(f => f.startsWith('crash-') && f.endsWith('.log'))
        .sort()
        .reverse();
      for (const f of files.slice(this.maxLogFiles)) {
        try { fs.unlinkSync(path.join(this.logDir, f)); } catch (_) {}
      }
    } catch (_) {}
  }

  init() {
    process.on('uncaughtException', (error) => {
      console.error('[CrashReporter] Uncaught exception:', error);
      this._writeLog('UNCAUGHT_EXCEPTION', error);
    });

    process.on('unhandledRejection', (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      console.error('[CrashReporter] Unhandled rejection:', error);
      this._writeLog('UNHANDLED_REJECTION', error);
    });

    process.on('warning', (warning) => {
      if (warning.name === 'DeprecationWarning') return;
      try {
        const lines = [
          `=== Utterance WARNING ===`,
          this._systemInfo(),
          `--- Warning ---`,
          `${warning.name}: ${warning.message}`,
          warning.stack || '',
          '',
        ].filter(Boolean).join('\n');
        const filePath = path.join(this.logDir, this._logFileName());
        fs.writeFileSync(filePath, lines, 'utf8');
      } catch (_) {}
    });

    console.log('[CrashReporter] Initialized — logs at:', this.logDir);
  }

  logError(context, error) {
    const extra = `Context: ${context}`;
    return this._writeLog('ERROR', error, extra);
  }

  logEvent(message, data = null) {
    try {
      const lines = [
        `=== Utterance EVENT ===`,
        this._systemInfo(),
        `--- Event ---`,
        message,
        data ? JSON.stringify(data, null, 2) : '',
        '',
      ].filter(Boolean).join('\n');
      const filePath = path.join(this.logDir, this._logFileName());
      fs.writeFileSync(filePath, lines, 'utf8');
    } catch (_) {}
  }

  getLogDir() { return this.logDir; }

  getLogFiles() {
    try {
      return fs.readdirSync(this.logDir)
        .filter(f => f.endsWith('.log'))
        .sort()
        .reverse()
        .map(f => ({
          name: f,
          path: path.join(this.logDir, f),
          size: fs.statSync(path.join(this.logDir, f)).size,
          modified: fs.statSync(path.join(this.logDir, f)).mtime,
        }));
    } catch (_) { return []; }
  }
}

module.exports = { CrashReporter };
