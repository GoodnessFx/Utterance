@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo AnchorCast - Bible Data Downloader
echo ====================================
echo.

set "LANGUAGES_URL=https://bolls.life/static/bolls/app/views/languages.json"
set "TRANSLATION_BASE_URL=https://bolls.life/static/translations"
set "LANGUAGES_FILE=%TEMP%\anchorcast_languages_%RANDOM%_%RANDOM%.json"
set "MENU_FILE=%TEMP%\anchorcast_english_bibles_%RANDOM%_%RANDOM%.txt"
set "MAP_FILE=%TEMP%\anchorcast_english_bibles_%RANDOM%_%RANDOM%.map"
set "TEMP_DIR=%TEMP%\anchorcast_bible_%RANDOM%_%RANDOM%"

echo Retrieving the current English Bible translation list...
echo.

curl --fail --location --silent --show-error --output "%LANGUAGES_FILE%" "%LANGUAGES_URL%" 2>nul

if not exist "%LANGUAGES_FILE%" (
    echo curl failed, trying PowerShell...
    powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '%LANGUAGES_URL%' -OutFile '%LANGUAGES_FILE%' -UseBasicParsing -ErrorAction Stop } catch { exit 1 }"
)

if not exist "%LANGUAGES_FILE%" (
    echo.
    echo ERROR: Could not retrieve the Bible translation list.
    echo Check your internet connection and try again.
    echo.
    echo Source:
    echo %LANGUAGES_URL%
    pause
    exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$catalog = Get-Content -LiteralPath '%LANGUAGES_FILE%' -Raw | ConvertFrom-Json;" ^
  "$english = $catalog | Where-Object { $_.language -eq 'English' } | Select-Object -First 1;" ^
  "if (-not $english) { exit 2 };" ^
  "$i = 1;" ^
  "$menu = foreach ($t in $english.translations) { '{0,2}. {1,-10} {2}' -f $i, $t.short_name, $t.full_name; $i++ };" ^
  "$i = 1;" ^
  "$map = foreach ($t in $english.translations) { '{0}|{1}|{2}' -f $i, $t.short_name, $t.full_name; $i++ };" ^
  "[System.IO.File]::WriteAllLines('%MENU_FILE%', $menu, [System.Text.UTF8Encoding]::new($false));" ^
  "[System.IO.File]::WriteAllLines('%MAP_FILE%', $map, [System.Text.UTF8Encoding]::new($false));"

if errorlevel 1 (
    echo.
    echo ERROR: The downloaded catalog did not contain a readable English list.
    del /q "%LANGUAGES_FILE%" "%MENU_FILE%" "%MAP_FILE%" >nul 2>&1
    pause
    exit /b 1
)

echo Available English Bible translations
echo ------------------------------------
type "%MENU_FILE%"
echo.

:SELECT_TRANSLATION
set "SELECTION="
set /p "SELECTION=Enter the corresponding number, or Q to quit: "

if /i "%SELECTION%"=="Q" goto CANCELLED

if "%SELECTION%"=="" (
    echo.
    echo No selection was entered.
    echo.
    goto SELECT_TRANSLATION
)

for /f "delims=0123456789" %%A in ("%SELECTION%") do (
    echo.
    echo Invalid selection. Enter one of the numbers shown above.
    echo.
    goto SELECT_TRANSLATION
)

set "SLUG="
set "FULL_NAME="

for /f "usebackq tokens=1,2,* delims=|" %%A in ("%MAP_FILE%") do (
    if "%%A"=="%SELECTION%" (
        set "SLUG=%%B"
        set "FULL_NAME=%%C"
    )
)

if not defined SLUG (
    echo.
    echo Selection %SELECTION% is outside the available range.
    echo.
    goto SELECT_TRANSLATION
)

echo.
echo Selected: !FULL_NAME! [!SLUG!]
echo.

set "ZIP_FILE=!SLUG!.zip"
set "RAW_JSON=!SLUG!_raw.json"
set "FINAL_JSON=!SLUG!_flattened.json"
set "BOLLS_URL=%TRANSLATION_BASE_URL%/!SLUG!.zip"

echo Downloading from:
echo !BOLLS_URL!
echo.

del /q "!ZIP_FILE!" "!RAW_JSON!" >nul 2>&1

curl --fail --location --output "!ZIP_FILE!" "!BOLLS_URL!" 2>nul

if not exist "!ZIP_FILE!" (
    echo curl failed, trying PowerShell...
    powershell -NoProfile -Command "try { Invoke-WebRequest -Uri '!BOLLS_URL!' -OutFile '!ZIP_FILE!' -UseBasicParsing -ErrorAction Stop } catch { exit 1 }"
)

if not exist "!ZIP_FILE!" (
    echo.
    echo ERROR: Could not download !FULL_NAME!.
    echo The translation may not have a ZIP package, or the server may be unavailable.
    goto CLEANUP_ERROR
)

echo Download completed.
echo Extracting Bible data...

mkdir "%TEMP_DIR%" >nul 2>&1

powershell -NoProfile -Command "try { Expand-Archive -LiteralPath '!ZIP_FILE!' -DestinationPath '%TEMP_DIR%' -Force -ErrorAction Stop } catch { exit 1 }"

if errorlevel 1 (
    echo.
    echo ERROR: The downloaded ZIP could not be extracted.
    goto CLEANUP_ERROR
)

set "EXTRACTED_JSON="
for /r "%TEMP_DIR%" %%F in (*.json) do (
    if not defined EXTRACTED_JSON set "EXTRACTED_JSON=%%F"
)

if not defined EXTRACTED_JSON (
    echo.
    echo ERROR: No JSON file was found inside the downloaded ZIP.
    goto CLEANUP_ERROR
)

copy /y "!EXTRACTED_JSON!" "!RAW_JSON!" >nul

rmdir /s /q "%TEMP_DIR%" >nul 2>&1
del /q "!ZIP_FILE!" >nul 2>&1

echo Extracted: !RAW_JSON!
echo.

if exist "flatten_bible_json.py" (
    where python >nul 2>&1
    if errorlevel 1 (
        echo WARNING: Python was not found in PATH.
        echo The raw JSON remains available as:
        echo !RAW_JSON!
        goto SUCCESS_RAW
    )

    echo Converting to the AnchorCast b/c/v/t format...
    echo Preserving verse line breaks...
    echo.

    python "flatten_bible_json.py" "!RAW_JSON!" -o "!FINAL_JSON!" --preserve-line-breaks

    if errorlevel 1 (
        echo.
        echo ERROR: Download succeeded, but conversion failed.
        echo Raw file retained as: !RAW_JSON!
        goto CLEANUP_KEEP_RAW
    )

    del /q "!RAW_JSON!" >nul 2>&1

    echo.
    echo SUCCESS!
    echo !FINAL_JSON! is ready for AnchorCast.
    goto CLEANUP_SUCCESS
) else (
    echo WARNING: flatten_bible_json.py was not found in this folder.
    echo The downloaded file remains unconverted:
    echo !RAW_JSON!
    echo.
    echo Place flatten_bible_json.py in this folder and run:
    echo python flatten_bible_json.py "!RAW_JSON!" --preserve-line-breaks
    goto SUCCESS_RAW
)

:SUCCESS_RAW
echo.
echo Download completed.
goto CLEANUP_SUCCESS

:CANCELLED
echo.
echo Download cancelled.
goto CLEANUP_SUCCESS

:CLEANUP_ERROR
del /q "!ZIP_FILE!" >nul 2>&1
rmdir /s /q "%TEMP_DIR%" >nul 2>&1
del /q "%LANGUAGES_FILE%" "%MENU_FILE%" "%MAP_FILE%" >nul 2>&1
echo.
pause
exit /b 1

:CLEANUP_KEEP_RAW
del /q "!ZIP_FILE!" >nul 2>&1
rmdir /s /q "%TEMP_DIR%" >nul 2>&1
del /q "%LANGUAGES_FILE%" "%MENU_FILE%" "%MAP_FILE%" >nul 2>&1
echo.
pause
exit /b 1

:CLEANUP_SUCCESS
del /q "%LANGUAGES_FILE%" "%MENU_FILE%" "%MAP_FILE%" >nul 2>&1
del /q "!ZIP_FILE!" >nul 2>&1
rmdir /s /q "%TEMP_DIR%" >nul 2>&1
echo.
pause
endlocal
