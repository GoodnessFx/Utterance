/**
 * after-pack.js — electron-builder afterPack hook
 * Manually copies the python folder into Resources with all symlinks dereferenced.
 * electron-builder can mangle symlinks and skip large dylib files on Mac.
 */
const path = require('path');
const fs   = require('fs');

function copyDereferenced(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });

  for (const entry of fs.readdirSync(src)) {
    const srcPath  = path.join(src, entry);
    const destPath = path.join(dest, entry);

    // Resolve symlink to real path
    const realPath = fs.existsSync(srcPath) ? fs.realpathSync(srcPath) : srcPath;
    const stat = fs.existsSync(realPath) ? fs.statSync(realPath) : null;

    if (!stat) {
      console.log(`[after-pack] Skipping broken symlink: ${srcPath}`);
      continue;
    }

    if (stat.isDirectory()) {
      copyDereferenced(realPath, destPath);
    } else {
      fs.copyFileSync(realPath, destPath);
      // Restore executable bit for binaries
      const mode = stat.mode;
      if (mode & 0o111) {
        fs.chmodSync(destPath, mode | 0o111);
      }
    }
  }
}

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;

  const projectRoot  = context.packager.projectDir;
  const appName      = context.packager.appInfo.productFilename || 'AnchorCast';
  const resourcesPath = path.join(
    context.appOutDir,
    `${appName}.app`,
    'Contents',
    'Resources'
  );

  console.log('[after-pack] Resources path:', resourcesPath);

  // ── Re-copy python with all symlinks dereferenced ─────────────────────
  const pythonSrc  = path.join(projectRoot, 'python');
  const pythonDest = path.join(resourcesPath, 'python');

  if (!fs.existsSync(pythonSrc)) {
    console.warn('[after-pack] ⚠ python/ folder not found in project root');
    return;
  }

  console.log('[after-pack] Re-copying python/ with symlinks dereferenced...');

  // Remove what electron-builder copied (may have broken symlinks)
  if (fs.existsSync(pythonDest)) {
    fs.rmSync(pythonDest, { recursive: true, force: true });
  }

  copyDereferenced(pythonSrc, pythonDest);

  // Verify the key binary exists and has correct size
  const py312 = path.join(pythonDest, 'bin', 'python3.12');
  const dylib  = path.join(pythonDest, 'lib', 'libpython3.12.dylib');

  if (fs.existsSync(py312)) {
    const size = fs.statSync(py312).size;
    console.log(`[after-pack] ✓ python3.12: ${(size/1024).toFixed(0)} KB`);
  } else {
    console.warn('[after-pack] ⚠ python3.12 not found after copy!');
  }

  if (fs.existsSync(dylib)) {
    const size = fs.statSync(dylib).size;
    console.log(`[after-pack] ✓ libpython3.12.dylib: ${(size/1024/1024).toFixed(1)} MB`);
  } else {
    console.warn('[after-pack] ⚠ libpython3.12.dylib not found after copy!');
  }

  console.log('[after-pack] ✓ Python copy complete');
};
