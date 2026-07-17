// Utterance — Settings Export/Import Module
// Lets churches backup/restore settings across machines.
// Exports: translations, language preference, themes, learned phrases.
// Does NOT export PINs (user must re-enter on new machine).

'use strict';

const fs = require('fs');
const path = require('path');

const EXPORT_VERSION = 1;

function exportSettings(dataDir, options = {}) {
  const SETTINGS_FILE = path.join(dataDir, 'settings.json');
  const THEMES_FILE = path.join(dataDir, 'themes.json');
  const DETECTION_PHRASES_FILE = path.join(dataDir, 'detection_review', 'learned_phrases.json');

  const settings = _readJSON(SETTINGS_FILE, {});
  const themes = _readJSON(THEMES_FILE, []);
  const learnedPhrases = _readJSON(DETECTION_PHRASES_FILE, { phrases: [] });

  // Strip sensitive data
  const safeSettings = { ...settings };
  const sensitiveKeys = [
    'remotePin', 'remoteAdminPin', 'remoteScripturePin',
    'remoteSongsPin', 'remoteMediaPin', 'remoteMonitorPin',
    'deepgramApiKey', 'claudeApiKey', 'geniusApiKey',
  ];
  for (const key of sensitiveKeys) {
    delete safeSettings[key];
  }

  const exportData = {
    _format: 'utterance-settings',
    _version: EXPORT_VERSION,
    _exportedAt: new Date().toISOString(),
    _appVersion: options.appVersion || '2.0.0',
    settings: safeSettings,
    themes: Array.isArray(themes) ? themes : [],
    learnedPhrases: learnedPhrases.phrases || [],
    customSettings: {
      primaryLanguage: settings.primaryLanguage || 'en',
      translation: settings.translation || 'KJV',
      whisperModel: settings.whisperModel || 'small.en',
      theme: settings.theme || 'sanctuary',
      simpleMode: settings.simpleMode || false,
      displayTarget: settings.displayTarget || null,
    },
  };

  return exportData;
}

function importSettings(filePath, dataDir) {
  const result = { success: false, imported: [], warnings: [] };

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    if (!data || data._format !== 'utterance-settings') {
      result.warnings.push('Unrecognized file format. This may not be an Utterance settings file.');
      return result;
    }

    if (data._version > EXPORT_VERSION) {
      result.warnings.push(`File was exported from a newer version (v${data._version}). Some settings may not import correctly.`);
    }

    // Import settings (without overwriting PINs and API keys)
    if (data.settings && typeof data.settings === 'object') {
      const SETTINGS_FILE = path.join(dataDir, 'settings.json');
      const current = _readJSON(SETTINGS_FILE, {});
      const sensitiveKeys = new Set([
        'remotePin', 'remoteAdminPin', 'remoteScripturePin',
        'remoteSongsPin', 'remoteMediaPin', 'remoteMonitorPin',
        'deepgramApiKey', 'claudeApiKey', 'geniusApiKey',
      ]);

      const merged = { ...current };
      for (const [key, value] of Object.entries(data.settings)) {
        if (!sensitiveKeys.has(key)) {
          merged[key] = value;
        }
      }

      // Apply custom settings
      if (data.customSettings) {
        Object.assign(merged, data.customSettings);
      }

      _writeJSON(SETTINGS_FILE, merged);
      result.imported.push('Settings');
    }

    // Import themes
    if (data.themes && Array.isArray(data.themes) && data.themes.length > 0) {
      const THEMES_FILE = path.join(dataDir, 'themes.json');
      _writeJSON(THEMES_FILE, data.themes);
      result.imported.push(`${data.themes.length} theme(s)`);
    }

    // Import learned phrases
    if (data.learnedPhrases && Array.isArray(data.learnedPhrases) && data.learnedPhrases.length > 0) {
      const phrasesDir = path.join(dataDir, 'detection_review');
      const phrasesFile = path.join(phrasesDir, 'learned_phrases.json');
      try { fs.mkdirSync(phrasesDir, { recursive: true }); } catch (_) {}
      _writeJSON(phrasesFile, { phrases: data.learnedPhrases });
      result.imported.push(`${data.learnedPhrases.length} learned phrase(s)`);
    }

    result.warnings.push('PINs and API keys were NOT imported for security. Please set them in Settings.');
    result.success = true;
    return result;

  } catch (e) {
    result.warnings.push(`Import failed: ${e.message}`);
    return result;
  }
}

function _readJSON(file, def = {}) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (_) {}
  return def;
}

function _writeJSON(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (_) {}
}

module.exports = { exportSettings, importSettings };
