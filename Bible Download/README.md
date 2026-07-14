# Bible Data Files

## Required format

AnchorCast expects Bible files in the following flattened format:

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

AnchorCast includes download utilities for both Windows and Linux/macOS.

## Windows

Run:

``` text
download-bible.bat
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

6.  Automatically run:

``` text
flatten_bible_json.py
```

7.  Generate:

``` text
<SLUG>_flattened.json
```

------------------------------------------------------------------------

## Linux / macOS

Make the script executable once:

``` bash
chmod +x download-bible.sh
```

Run:

``` bash
./download-bible.sh
```

The Linux/macOS script performs the same workflow as the Windows
version:

-   Downloads the latest English translation list.
-   Displays a numbered menu.
-   Lets you choose a translation.
-   Downloads the ZIP package from Bolls.
-   Extracts the JSON.
-   Runs `flatten_bible_json.py`.
-   Preserves verse line breaks.
-   Produces:

``` text
<SLUG>_flattened.json
```

------------------------------------------------------------------------

# Converting an existing Bible JSON file

If you already have a Bible JSON file:

``` bash
python flatten_bible_json.py Bible_Version.json
```

Example:

``` bash
python flatten_bible_json.py MSG.json
```

To preserve verse line breaks (recommended):

``` bash
python flatten_bible_json.py MSG.json --preserve-line-breaks
```

The converter automatically supports:

-   Flat verse-list JSON
-   Nested `books → chapters → verses` JSON
-   Common Bible JSON schemas

No manual editing is required.

------------------------------------------------------------------------

------------------------------------------------------------------------

# After downloading

1. Open **AnchorCast**.
2. Go to **Settings → Bible Versions**.
3. Click **Upload Bible Version**.
4. Select the downloaded or converted Bible JSON file, for example:

``` text
NKJV_flattened.json
```

5. AnchorCast will import and register the Bible translation.
6. The new Bible version will then be available for scripture search and projection.

> **Important:** AnchorCast only supports Bible files in the required flattened format:
>
> ``` json
> [
>   {"b":1,"c":1,"v":1,"t":"Verse text"}
> ]
> ```

## Examples of files you can upload

- `KJV_flattened.json`
- `NKJV_flattened.json`
- `MSG_flattened.json`
- `NIV_flattened.json`
- `NLT_flattened.json`
- `ESV_flattened.json`
- `NASB_flattened.json`

