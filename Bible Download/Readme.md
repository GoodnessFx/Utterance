# Bible Data Files

## Required: `kjv.json`

Place the complete KJV Bible JSON file here as `kjv.json`.

### Expected format

``` json
[
  {"b":1,"c":1,"v":1,"t":"In the beginning God created the heaven and the earth."},
  {"b":1,"c":1,"v":2,"t":"And the earth was without form..."}
]
```

Where:

-   **b** = Book number (1--66)
-   **c** = Chapter
-   **v** = Verse
-   **t** = Verse text

------------------------------------------------------------------------

# Downloading Bible translations

AnchorCast includes two download scripts:

## Windows

``` text
download-bible-menu-fixed.bat
```

Double-click the script or run:

``` bat
download-bible-menu-fixed.bat
```

The script will:

1.  Download the latest translation catalog from:

``` text
https://bolls.life/static/bolls/app/views/languages.json
```

2.  Display all available **English** Bible translations as a numbered
    menu.

Example:

``` text
 1. YLT
 2. CJB
 3. KJV
 4. NKJV
 5. WEB
```

3.  Prompt you to select a translation by number.

4.  Download the selected translation from:

``` text
https://bolls.life/static/translations/<slug>.zip
```

5.  Extract the JSON.

6.  Automatically convert it into the AnchorCast format using:

``` text
flatten_bible_json.py
```

7.  Produce:

``` text
<SLUG>_flattened.json
```

The conversion preserves verse line breaks for translations that contain
poetic formatting (such as MSG).

## Linux / macOS

``` text
download-bible.sh
```

Downloads the public-domain KJV dataset.

------------------------------------------------------------------------

# Converting existing Bible JSON files

If you already have a Bible JSON file, convert it using:

``` bash
python flatten_bible_json.py Bible_Version.json
```

Example:

``` bash
python flatten_bible_json.py MSG.json
```

To preserve verse line breaks:

``` bash
python flatten_bible_json.py MSG.json --preserve-line-breaks
```

The converter automatically detects:

-   Flat verse lists
-   Nested `books → chapters → verses`
-   Common Bible JSON structures

No manual editing is required.

------------------------------------------------------------------------

# After downloading

Open AnchorCast, in setting menu, Bible versions, uploaded the downloaded / converted bible verson,

