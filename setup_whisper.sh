#!/bin/bash
# AnchorCast — Whisper AI Setup for macOS/Linux
# This script installs Python dependencies and downloads the Whisper model.

set -e

echo "========================================"
echo "  AnchorCast — Whisper AI Setup (Mac)"
echo "========================================"
echo ""

# Find Python 3
PYTHON=""
for bin in python3 /opt/homebrew/bin/python3 /usr/local/bin/python3 /usr/bin/python3; do
  if command -v "$bin" &>/dev/null; then
    PYTHON="$bin"
    break
  fi
done

if [ -z "$PYTHON" ]; then
  echo "ERROR: Python 3 not found."
  echo ""
  echo "Install it with Homebrew:  brew install python3"
  echo "Or download from:          https://www.python.org/downloads/"
  exit 1
fi

echo "Using Python: $($PYTHON --version)"
echo ""

# Check Python version (need 3.8-3.12)
$PYTHON -c "
import sys
v = sys.version_info
if not (v.major == 3 and 8 <= v.minor <= 12):
    print(f'ERROR: Python {v.major}.{v.minor} detected. AnchorCast needs Python 3.8–3.12.')
    sys.exit(1)
print(f'Python version OK: {v.major}.{v.minor}.{v.micro}')
"

echo ""
echo "Installing faster-whisper..."
$PYTHON -m pip install --upgrade faster-whisper

echo ""
echo "faster-whisper installed successfully."
echo ""

# Write success flag for Electron to detect
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
touch "$SCRIPT_DIR/whisper_setup_complete.flag"

echo "========================================"
echo "  Setup complete! Restart AnchorCast."
echo "========================================"
