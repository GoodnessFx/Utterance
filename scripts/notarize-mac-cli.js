/**
 * notarize-mac-cli.js — Submit built DMGs to Apple notarization
 *
 * Usage:
 *   export APPLE_ID="you@example.com"
 *   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
 *   export APPLE_TEAM_ID="22YS7RJ4G6"
 *   node scripts/notarize-mac-cli.js
 */
const { notarize } = require('@electron/notarize');
const path = require('path');
const fs = require('fs');
const pkg = require('../package.json');

const version = pkg.version;
const appleId = process.env.APPLE_ID;
const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;
const teamId = process.env.APPLE_TEAM_ID;

if (!appleId || !appleIdPassword || !teamId) {
  console.error('❌ Missing env vars. Set:');
  console.error('   export APPLE_ID="your@apple.id"');
  console.error('   export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"');
  console.error('   export APPLE_TEAM_ID="XXXXXXXXXX"');
  process.exit(1);
}

console.log(`Apple ID:  ${appleId}`);
console.log(`Team ID:   ${teamId}`);
console.log(`Password:  ${appleIdPassword ? '(set)' : '(MISSING)'}`);

// Find all DMG files in dist/
const distDir = path.join(__dirname, '..', 'dist');
const dmgFiles = fs.readdirSync(distDir)
  .filter(f => f.endsWith('.dmg'))
  .map(f => path.join(distDir, f));

if (!dmgFiles.length) {
  console.error('No .dmg files found in dist/. Run a build first.');
  process.exit(1);
}

console.log(`\nFound ${dmgFiles.length} DMG(s) to notarize:`);
dmgFiles.forEach(f => console.log(' -', path.basename(f)));

async function run() {
  for (const dmgPath of dmgFiles) {
    const name = path.basename(dmgPath);
    console.log(`\n[notarize] Submitting: ${name}`);
    console.log('[notarize] This may take 1-5 minutes...');
    try {
      await notarize({
        tool: 'notarytool',
        appBundleId: 'com.anchorcast.app',
        appPath: dmgPath,
        appleId,
        appleIdPassword,
        teamId,
      });
      console.log(`[notarize] ✓ ${name} — notarized successfully`);
    } catch (err) {
      console.error(`[notarize] ✗ ${name} — failed:`);
      console.error('  ', err.message);
      // Show detailed error if available
      if (err.message.includes('credentials')) {
        console.error('\nTip: Make sure you are using an app-specific password, not your Apple ID password.');
        console.error('Create one at: https://account.apple.com/account/manage → App-Specific Passwords');
      }
    }
  }

  console.log('\n[notarize] Done. Staple and verify:');
  dmgFiles.forEach(f => {
    const name = path.basename(f);
    console.log(`  xcrun stapler staple "dist/${name}"`);
  });
  console.log('\nVerify:');
  dmgFiles.forEach(f => {
    const name = path.basename(f);
    console.log(`  spctl -a -vvv --type install "dist/${name}"`);
  });
}

run();
