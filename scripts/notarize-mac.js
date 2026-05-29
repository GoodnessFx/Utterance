/**
 * notarize-mac.js — afterSign hook for electron-builder
 * Compatible with electron-builder 24.x
 *
 * electron-builder 24 calls afterSign with a context object that may have
 * a different shape than newer versions. This script handles both cases.
 */
const path = require('path');

exports.default = async function notarizeMac(context) {
  // electron-builder 24 may pass context directly or as { packager, appOutDir, ... }
  const electronPlatformName = context?.electronPlatformName
    || context?.packager?.platform?.nodeName
    || process.platform;

  if (electronPlatformName !== 'darwin' && process.platform !== 'darwin') {
    return;
  }

  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  const teamId = process.env.APPLE_TEAM_ID;

  if (!appleId || !appleIdPassword || !teamId) {
    console.warn('[notarize] Skipping — APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, or APPLE_TEAM_ID not set.');
    console.warn('[notarize] App will work locally but GitHub downloads may be blocked by Gatekeeper.');
    return;
  }

  // Resolve app path from context
  const appOutDir = context?.appOutDir;
  const appName = context?.packager?.appInfo?.productFilename || 'AnchorCast';
  const appBundleId = context?.packager?.appInfo?.appId || 'com.anchorcast.app';

  if (!appOutDir) {
    console.warn('[notarize] appOutDir not available in context — skipping notarization.');
    return;
  }

  const appPath = path.join(appOutDir, `${appName}.app`);

  console.log(`[notarize] Notarizing: ${appPath}`);
  console.log(`[notarize] Bundle ID: ${appBundleId} | Team: ${teamId}`);

  try {
    const { notarize } = require('@electron/notarize');
    await notarize({
      appBundleId,
      appPath,
      appleId,
      appleIdPassword,
      teamId,
    });
    console.log('[notarize] ✓ Notarization complete');
  } catch (err) {
    console.error('[notarize] ✗ Notarization failed:', err.message);
    // Don't throw — allow build to complete even if notarization fails
    // The app will still work locally; GitHub downloads may show Gatekeeper warning
  }
};
