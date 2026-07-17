// Utterance — Multi-Monitor Display Manager
// Handles display detection, selection, and projection targeting.

'use strict';

const { screen } = require('electron');

class MultiMonitorManager {
  constructor() {
    this._preferredDisplayId = null;
  }

  setPreferredDisplay(displayId) {
    this._preferredDisplayId = displayId;
  }

  getPreferredDisplay() {
    return this._preferredDisplayId;
  }

  getAllDisplays() {
    return screen.getAllDisplays().map(d => ({
      id: d.id,
      label: d.label || `Display ${d.id}`,
      bounds: d.bounds,
      scaleFactor: d.scaleFactor,
      isPrimary: d.id === screen.getPrimaryDisplay().id,
    }));
  }

  getTargetDisplay(preferredId = null) {
    const displays = screen.getAllDisplays();
    const targetId = preferredId || this._preferredDisplayId;

    if (targetId) {
      const found = displays.find(d => d.id === targetId);
      if (found) return found;
    }

    // Auto-select: prefer external display over primary
    const external = displays.find(d => d.id !== screen.getPrimaryDisplay().id);
    return external || displays[0];
  }

  getExternalDisplays() {
    const primaryId = screen.getPrimaryDisplay().id;
    return screen.getAllDisplays()
      .filter(d => d.id !== primaryId)
      .map(d => ({
        id: d.id,
        label: d.label || `Display ${d.id}`,
        bounds: d.bounds,
        scaleFactor: d.scaleFactor,
      }));
  }
}

module.exports = { MultiMonitorManager };
