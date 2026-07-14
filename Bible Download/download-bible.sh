#!/usr/bin/env bash
set -euo pipefail

echo "AnchorCast - Bible Data Downloader"
echo "=================================="
echo

LANGUAGES_URL="https://bolls.life/static/bolls/app/views/languages.json"
TRANSLATION_BASE_URL="https://bolls.life/static/translations"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/anchorcast-bible.XXXXXX")"
LANGUAGES_FILE="$TMP_DIR/languages.json"
MENU_FILE="$TMP_DIR/english_bibles.txt"
MAP_FILE="$TMP_DIR/english_bibles.map"

cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

download_file() {
    local url="$1"
    local output="$2"

    if command -v curl >/dev/null 2>&1; then
        curl --fail --location --silent --show-error --output "$output" "$url"
    elif command -v wget >/dev/null 2>&1; then
        wget --quiet --output-document="$output" "$url"
    else
        echo "ERROR: Neither curl nor wget is installed."
        exit 1
    fi
}

echo "Retrieving the current English Bible translation list..."
echo

download_file "$LANGUAGES_URL" "$LANGUAGES_FILE"

if command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
    PYTHON_CMD="python"
else
    echo "ERROR: Python is required to parse the translation list."
    exit 1
fi

"$PYTHON_CMD" - "$LANGUAGES_FILE" "$MENU_FILE" "$MAP_FILE" <<'PY'
import json
import sys
from pathlib import Path

languages_path = Path(sys.argv[1])
menu_path = Path(sys.argv[2])
map_path = Path(sys.argv[3])

with languages_path.open("r", encoding="utf-8-sig") as f:
    catalog = json.load(f)

english = next(
    (entry for entry in catalog if entry.get("language") == "English"),
    None,
)

if not english:
    raise SystemExit("No English translation list was found.")

translations = english.get("translations", [])

menu_lines = []
map_lines = []

for i, item in enumerate(translations, start=1):
    slug = item.get("short_name", "").strip()
    full_name = item.get("full_name", "").strip()
    menu_lines.append(f"{i:2}. {slug:<10} {full_name}")
    map_lines.append(f"{i}|{slug}|{full_name}")

menu_path.write_text("\n".join(menu_lines) + "\n", encoding="utf-8")
map_path.write_text("\n".join(map_lines) + "\n", encoding="utf-8")
PY

echo "Available English Bible translations"
echo "------------------------------------"
cat "$MENU_FILE"
echo

while true; do
    read -r -p "Enter the corresponding number, or Q to quit: " selection

    if [[ "$selection" =~ ^[Qq]$ ]]; then
        echo
        echo "Download cancelled."
        exit 0
    fi

    if [[ ! "$selection" =~ ^[0-9]+$ ]]; then
        echo
        echo "Invalid selection. Enter one of the numbers shown above."
        echo
        continue
    fi

    selected_line="$(awk -F'|' -v n="$selection" '$1 == n { print; exit }' "$MAP_FILE")"

    if [[ -z "$selected_line" ]]; then
        echo
        echo "Selection $selection is outside the available range."
        echo
        continue
    fi

    IFS='|' read -r _ SLUG FULL_NAME <<< "$selected_line"
    break
done

echo
echo "Selected: $FULL_NAME [$SLUG]"
echo

ZIP_FILE="${SLUG}.zip"
RAW_JSON="${SLUG}_raw.json"
FINAL_JSON="${SLUG}_flattened.json"
BOLLS_URL="${TRANSLATION_BASE_URL}/${SLUG}.zip"
EXTRACT_DIR="$TMP_DIR/extracted"

rm -f "$ZIP_FILE" "$RAW_JSON"

echo "Downloading from:"
echo "$BOLLS_URL"
echo

download_file "$BOLLS_URL" "$ZIP_FILE"

echo "Download completed."
echo "Extracting Bible data..."

mkdir -p "$EXTRACT_DIR"

if command -v unzip >/dev/null 2>&1; then
    unzip -q -o "$ZIP_FILE" -d "$EXTRACT_DIR"
else
    "$PYTHON_CMD" - "$ZIP_FILE" "$EXTRACT_DIR" <<'PY'
import sys
import zipfile
from pathlib import Path

zip_path = Path(sys.argv[1])
extract_dir = Path(sys.argv[2])

with zipfile.ZipFile(zip_path, "r") as zf:
    zf.extractall(extract_dir)
PY
fi

EXTRACTED_JSON="$(find "$EXTRACT_DIR" -type f -name '*.json' | head -n 1 || true)"

if [[ -z "$EXTRACTED_JSON" ]]; then
    echo "ERROR: No JSON file was found inside the downloaded ZIP."
    rm -f "$ZIP_FILE"
    exit 1
fi

cp "$EXTRACTED_JSON" "$RAW_JSON"
rm -f "$ZIP_FILE"

echo "Extracted: $RAW_JSON"
echo

if [[ -f "flatten_bible_json.py" ]]; then
    echo "Converting to the AnchorCast b/c/v/t format..."
    echo "Preserving verse line breaks..."
    echo

    "$PYTHON_CMD" "flatten_bible_json.py" \
        "$RAW_JSON" \
        -o "$FINAL_JSON" \
        --preserve-line-breaks

    rm -f "$RAW_JSON"

    echo
    echo "SUCCESS!"
    echo "$FINAL_JSON is ready for AnchorCast."
else
    echo "WARNING: flatten_bible_json.py was not found in this folder."
    echo "The downloaded file remains unconverted:"
    echo "$RAW_JSON"
    echo
    echo "Place flatten_bible_json.py in this folder and run:"
    echo "$PYTHON_CMD flatten_bible_json.py \"$RAW_JSON\" --preserve-line-breaks"
fi

echo
