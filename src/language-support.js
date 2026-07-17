// Utterance — Multi-Language Support Module
// Manages UI translations, Whisper language detection, and verse display languages.

'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const SUPPORTED_LANGUAGES = {
  en: { name: 'English', whisperModel: 'small.en', flag: 'en' },
  es: { name: 'Espanol', whisperModel: 'small', flag: 'es' },
  fr: { name: 'Francais', whisperModel: 'small', flag: 'fr' },
  de: { name: 'Deutsch', whisperModel: 'small', flag: 'de' },
  pt: { name: 'Portugues', whisperModel: 'small', flag: 'pt' },
  zh: { name: 'Chinese', whisperModel: 'small', flag: 'zh' },
  ja: { name: 'Japanese', whisperModel: 'small', flag: 'ja' },
  ko: { name: 'Korean', whisperModel: 'small', flag: 'ko' },
  ar: { name: 'Arabic', whisperModel: 'small', flag: 'ar' },
  hi: { name: 'Hindi', whisperModel: 'small', flag: 'hi' },
  ru: { name: 'Russian', whisperModel: 'small', flag: 'ru' },
  it: { name: 'Italian', whisperModel: 'small', flag: 'it' },
  nl: { name: 'Dutch', whisperModel: 'small', flag: 'nl' },
  pl: { name: 'Polish', whisperModel: 'small', flag: 'pl' },
  sv: { name: 'Swedish', whisperModel: 'small', flag: 'sv' },
  uk: { name: 'Ukrainian', whisperModel: 'small', flag: 'uk' },
  tr: { name: 'Turkish', whisperModel: 'small', flag: 'tr' },
  th: { name: 'Thai', whisperModel: 'small', flag: 'th' },
  vi: { name: 'Vietnamese', whisperModel: 'small', flag: 'vi' },
  he: { name: 'Hebrew', whisperModel: 'small', flag: 'he' },
};

const UI_STRINGS = {
  en: {
    appTitle: 'Utterance',
    dashboard: 'Dashboard',
    settings: 'Settings',
    projection: 'Projection',
    detected: 'Detected',
    scripture: 'Scripture',
    sermon: 'Sermon',
    media: 'Media',
    loading: 'Loading...',
    startRecording: 'Start Recording',
    stopRecording: 'Stop Recording',
    noVersesDetected: 'No verses detected yet',
    setupComplete: 'Setup Complete',
    welcome: 'Welcome to Utterance',
    welcomeMessage: 'The sermon companion that displays scripture as it is spoken.',
    getStarted: 'Get Started',
    language: 'Language',
    translation: 'Translation',
    chooseLanguage: 'Choose your language',
    chooseTranslation: 'Choose a Bible translation',
    enterPin: 'Enter your PIN',
    setPin: 'Set a PIN to lock settings',
    selectDisplay: 'Select Display',
    primaryDisplay: 'Primary Display',
    externalDisplay: 'External Display',
    projectionReady: 'Projection Ready',
    lockSettings: 'Lock Settings',
    unlockSettings: 'Unlock Settings',
    exportSettings: 'Export Settings',
    importSettings: 'Import Settings',
    savedToClipboard: 'Copied to clipboard',
    savedToFile: 'Saved to file',
    settingsRestored: 'Settings restored successfully',
  },
  es: {
    appTitle: 'Utterance',
    dashboard: 'Panel',
    settings: 'Configuracion',
    projection: 'Proyeccion',
    detected: 'Detectado',
    scripture: 'Escritura',
    sermon: 'Sermon',
    media: 'Medios',
    loading: 'Cargando...',
    startRecording: 'Iniciar Grabacion',
    stopRecording: 'Detener Grabacion',
    noVersesDetected: 'No se han detectado versiculos',
    setupComplete: 'Configuracion Completa',
    welcome: 'Bienvenido a Utterance',
    welcomeMessage: 'El companero del sermon que muestra la Escritura cuando se habla.',
    getStarted: 'Comenzar',
    language: 'Idioma',
    translation: 'Traduccion',
    chooseLanguage: 'Elija su idioma',
    chooseTranslation: 'Elija una traduccion de la Biblia',
    enterPin: 'Ingrese su PIN',
    setPin: 'Establezca un PIN para bloquear la configuracion',
    selectDisplay: 'Seleccionar Pantalla',
    primaryDisplay: 'Pantalla Principal',
    externalDisplay: 'Pantalla Externa',
    projectionReady: 'Proyeccion Lista',
    lockSettings: 'Bloquear Configuracion',
    unlockSettings: 'Desbloquear Configuracion',
    exportSettings: 'Exportar Configuracion',
    importSettings: 'Importar Configuracion',
    savedToClipboard: 'Copiado al portapapeles',
    savedToFile: 'Guardado en archivo',
    settingsRestored: 'Configuracion restaurada exitosamente',
  },
  fr: {
    appTitle: 'Utterance',
    dashboard: 'Tableau de bord',
    settings: 'Parametres',
    projection: 'Projection',
    detected: 'Detecte',
    scripture: 'Ecriture',
    sermon: 'Sermon',
    media: 'Media',
    loading: 'Chargement...',
    startRecording: 'Demarrer l\'enregistrement',
    stopRecording: 'Arreter l\'enregistrement',
    noVersesDetected: 'Aucun verset detecte',
    setupComplete: 'Configuration terminee',
    welcome: 'Bienvenue sur Utterance',
    welcomeMessage: 'Le compagnon de sermon qui affiche l\'Ecriture lorsqu\'elle est prononcee.',
    getStarted: 'Commencer',
    language: 'Langue',
    translation: 'Traduction',
    chooseLanguage: 'Choisissez votre langue',
    chooseTranslation: 'Choisissez une traduction de la Bible',
    enterPin: 'Entrez votre code PIN',
    setPin: 'Definissez un code PIN pour verrouiller les parametres',
    selectDisplay: 'Selectionner l\'affichage',
    primaryDisplay: 'Affichage principal',
    externalDisplay: 'Affichage externe',
    projectionReady: 'Projection prete',
    lockSettings: 'Verrouiller les parametres',
    unlockSettings: 'Deverrouiller les parametres',
    exportSettings: 'Exporter les parametres',
    importSettings: 'Importer les parametres',
    savedToClipboard: 'Copie dans le presse-papiers',
    savedToFile: 'Enregistre dans un fichier',
    settingsRestored: 'Parametres restaures avec succes',
  },
};

class LanguageManager {
  constructor(dataDir) {
    this._dataDir = dataDir;
    this._currentLang = this._loadSetting('primaryLanguage') || 'en';
    this._uiStrings = { ...UI_STRINGS };
    this._loadCustomTranslations();
  }

  setLanguage(lang) {
    if (!SUPPORTED_LANGUAGES[lang]) return false;
    this._currentLang = lang;
    this._saveSetting('primaryLanguage', lang);
    return true;
  }

  getLanguage() {
    return this._currentLang;
  }

  t(key) {
    const langStrings = this._uiStrings[this._currentLang];
    if (langStrings && langStrings[key]) return langStrings[key];
    const enStrings = this._uiStrings['en'];
    return (enStrings && enStrings[key]) || key;
  }

  getSupportedLanguages() {
    return Object.entries(SUPPORTED_LANGUAGES).map(([code, info]) => ({
      code,
      name: info.name,
      flag: info.flag,
      isCurrent: code === this._currentLang,
    }));
  }

  getWhisperModelForLang(lang) {
    return SUPPORTED_LANGUAGES[lang]?.whisperModel || 'small';
  }

  getWhisperLanguageCode() {
    return this._currentLang;
  }

  addTranslation(lang, strings) {
    if (!strings || typeof strings !== 'object') return false;
    if (!this._uiStrings[lang]) this._uiStrings[lang] = {};
    Object.assign(this._uiStrings[lang], strings);
    this._saveCustomTranslation(lang, strings);
    return true;
  }

  _loadCustomTranslations() {
    try {
      const customDir = path.join(this._dataDir, 'translations');
      if (!fs.existsSync(customDir)) return;
      const files = fs.readdirSync(customDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const lang = path.basename(file, '.json');
        const data = JSON.parse(fs.readFileSync(path.join(customDir, file), 'utf8'));
        if (!this._uiStrings[lang]) this._uiStrings[lang] = {};
        Object.assign(this._uiStrings[lang], data);
      }
    } catch (_) {}
  }

  _saveCustomTranslation(lang, strings) {
    try {
      const customDir = path.join(this._dataDir, 'translations');
      fs.mkdirSync(customDir, { recursive: true });
      fs.writeFileSync(
        path.join(customDir, `${lang}.json`),
        JSON.stringify(strings, null, 2)
      );
    } catch (_) {}
  }

  _loadSetting(key) {
    try {
      const file = path.join(this._dataDir, 'settings.json');
      if (fs.existsSync(file)) {
        const settings = JSON.parse(fs.readFileSync(file, 'utf8'));
        return settings[key];
      }
    } catch (_) {}
    return null;
  }

  _saveSetting(key, value) {
    try {
      const file = path.join(this._dataDir, 'settings.json');
      let settings = {};
      if (fs.existsSync(file)) {
        settings = JSON.parse(fs.readFileSync(file, 'utf8'));
      }
      settings[key] = value;
      fs.writeFileSync(file, JSON.stringify(settings, null, 2));
    } catch (_) {}
  }
}

module.exports = { LanguageManager, SUPPORTED_LANGUAGES, UI_STRINGS };
