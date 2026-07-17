; Utterance NSIS Installer Hooks
; VC++ is bundled in the installer — no internet needed for it.
; ctranslate2.dll requires msvcp140.dll/vcruntime140.dll (not in the wheel).

!macro customHeader
!macroend

!macro customInstall

  ; ── Kill running Utterance ───────────────────────────────────────────────
  ExecWait 'taskkill /F /IM "Utterance.exe" /T' $0

  ; ── Visual C++ 2015-2022 Redistributable ─────────────────────────────────
  ; Bundled in installer — works completely offline.
  DetailPrint "Checking Visual C++ 2015-2022 Redistributable..."

  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Version"
  StrCmp $0 "" vc_try2 vc_found
  vc_try2:
  ReadRegStr $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Version"
  StrCmp $0 "" vc_try3 vc_found
  vc_try3:
  ReadRegStr $0 HKLM "SOFTWARE\Classes\Installer\Dependencies\VC,redist.x64,amd64,14.32,bundle" "Version"
  StrCmp $0 "" vc_try4 vc_found
  vc_try4:
  ReadRegStr $0 HKLM "SOFTWARE\Classes\Installer\Dependencies\VC,redist.x64,amd64,14.36,bundle" "Version"
  StrCmp $0 "" vc_missing vc_found

  vc_missing:
    DetailPrint "Installing Visual C++ 2015-2022 Redistributable (bundled, no internet needed)..."

    ; Try bundled file first — completely offline
    IfFileExists "$INSTDIR\resources\vc_redist.x64.exe" vc_use_bundled vc_try_download

    vc_use_bundled:
      DetailPrint "Using bundled vc_redist.x64.exe..."
      ExecWait '"$INSTDIR\resources\vc_redist.x64.exe" /install /quiet /norestart' $0
      DetailPrint "Visual C++ installed from bundled file (code $0)."
      Goto models_section

    vc_try_download:
      ; [NSH-1] Use GetTempFileName for a unique, ACL-protected temp path
      ; (prevents TOCTOU race on predictable $TEMP\dl_vc.ps1)
      GetTempFileName $R0
      DetailPrint "Bundled vc_redist not found — downloading from Microsoft..."
      FileOpen $1 "$R0" w
      FileWrite $1 '$$vcDest = [System.IO.Path]::GetTempFileName() + ".exe"$\n'
      FileWrite $1 'Invoke-WebRequest -Uri "https://aka.ms/vs/17/release/vc_redist.x64.exe" -OutFile $$vcDest -UseBasicParsing$\n'
      ; [NSH-2] Verify SHA256 hash before executing downloaded binary
      FileWrite $1 '$$expected = "9B9DD72C27AB1DB081DE56BB7B73B07B0001E7CDCB5BE2B060FC21B3E3B9CF50"$\n'
      FileWrite $1 '$$actual = (Get-FileHash -Path $$vcDest -Algorithm SHA256).Hash$\n'
      FileWrite $1 'if ($$actual -ne $$expected) { Remove-Item $$vcDest -Force; exit 2 }$\n'
      FileWrite $1 'Start-Process -FilePath $$vcDest -ArgumentList "/install","/quiet","/norestart" -Wait$\n'
      FileWrite $1 'Remove-Item $$vcDest -Force$\n'
      FileClose $1
      ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$R0"' $0
      Delete "$R0"
      IntCmp $0 0 vc_dl_ok vc_dl_fail vc_dl_fail
      vc_dl_ok:
        DetailPrint "Visual C++ installed from download."
        Goto models_section
      vc_dl_fail:
        DetailPrint "VC++ not available (no internet or hash mismatch). AI transcription may not work."
        Goto models_section

  vc_found:
    DetailPrint "Visual C++ Redistributable already installed."
    Goto models_section

  ; ── Whisper Models ────────────────────────────────────────────────────────
  models_section:
  CreateDirectory "$APPDATA\Utterance\UtteranceData\WhisperModels"

  IfFileExists "$INSTDIR\resources\models\models--Systran--faster-whisper-small.en" models_bundled models_not_bundled

  models_bundled:
    DetailPrint "Copying bundled Whisper models to AppData..."
    ExecWait 'robocopy "$INSTDIR\resources\models" "$APPDATA\Utterance\UtteranceData\WhisperModels" /E /NFL /NDL /NJH /NJS /NC /NS /NP' $0
    DetailPrint "Whisper models copied (robocopy code $0)."
    Goto verify_engine

  models_not_bundled:
    IfFileExists "$APPDATA\Utterance\UtteranceData\WhisperModels\models--Systran--faster-whisper-small.en" verify_engine models_ask

  models_ask:
    MessageBox MB_YESNO|MB_ICONQUESTION \
      "No speech model was bundled with this installer.$\n$\n\
Download the Whisper Small English model now? (~244 MB)$\n\
  - Saved to AppData, only downloaded once$\n\
  - Works fully offline after download$\n$\n\
Click No to download automatically on first use." \
      IDNO done

    DetailPrint "Downloading Whisper small.en model (~244 MB)..."
    ; Check python is available before attempting download
    IfFileExists "$INSTDIR\resources\python\python.exe" do_model_download no_python_for_model

    no_python_for_model:
      DetailPrint "Python not found at expected location — model will download on first use."
      Goto verify_engine

    do_model_download:
    ; [NSH-3] Use GetTempFileName for unique ACL-protected paths
    ; (prevents TOCTOU race on predictable $TEMP\ac_get_model.py / ac_run_model.ps1)
    GetTempFileName $R1
    GetTempFileName $R2
    FileOpen $1 "$R1" w
    FileWrite $1 "import os, warnings, logging$\n"
    FileWrite $1 "os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'$\n"
    FileWrite $1 "os.environ['HF_HUB_DISABLE_PROGRESS_BARS'] = '1'$\n"
    FileWrite $1 "os.environ['TRANSFORMERS_VERBOSITY'] = 'error'$\n"
    FileWrite $1 "os.environ['HF_TOKEN'] = ''$\n"
    FileWrite $1 "warnings.filterwarnings('ignore')$\n"
    FileWrite $1 "logging.disable(logging.CRITICAL)$\n"
    FileWrite $1 "from faster_whisper import WhisperModel$\n"
    FileWrite $1 "d = os.path.join(os.environ['APPDATA'], 'Utterance', 'UtteranceData', 'WhisperModels')$\n"
    FileWrite $1 "os.makedirs(d, exist_ok=True)$\n"
    FileWrite $1 "WhisperModel('small.en', device='cpu', compute_type='int8', download_root=d)$\n"
    FileClose $1
    FileOpen $2 "$R2" w
    FileWrite $2 "Start-Process -FilePath '$INSTDIR\resources\python\python.exe' "
    FileWrite $2 "-ArgumentList '-W','ignore','$R1' "
    FileWrite $2 "-WindowStyle Hidden -Wait$\n"
    FileClose $2
    ExecWait 'powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$R2"' $0
    Delete "$R1"
    Delete "$R2"
    IntCmp $0 0 model_dl_ok model_dl_fail model_dl_fail
    model_dl_ok:
      DetailPrint "Whisper model downloaded."
      Goto verify_engine
    model_dl_fail:
      DetailPrint "Model download failed (code $0) — will retry on first use."

  ; ── Verify AI Engine or offer setup_whisper.bat fallback ─────────────────
  verify_engine:
  IfFileExists "$INSTDIR\resources\python\python.exe" do_verify no_bundled_python

  no_bundled_python:
    ; Python not bundled — offer to run setup_whisper.bat to install it
    IfFileExists "$INSTDIR\resources\setup_whisper.bat" offer_setup done
    offer_setup:
      MessageBox MB_YESNO|MB_ICONQUESTION \
        "The Local AI Transcription engine (Python + Whisper) was not bundled$\n\
with this installer.$\n$\n\
Run the setup wizard now to install it? (~200 MB download)$\n\
  - Downloads portable Python 3.12$\n\
  - Installs faster-whisper AI engine$\n$\n\
You can also do this later from inside the app." \
        IDNO done
      ExecWait '"$INSTDIR\resources\setup_whisper.bat"' $0
      Goto done

  do_verify:
    DetailPrint "Verifying AI transcription engine..."
    ExecWait '"$INSTDIR\resources\python\python.exe" -c "from faster_whisper import WhisperModel"' $0
    IntCmp $0 0 done verify_warn verify_warn
    verify_warn:
      DetailPrint "AI engine verification failed."
      MessageBox MB_OK|MB_ICONINFORMATION \
        "The AI transcription engine could not be verified.$\n$\n\
Please restart Windows, then reopen Utterance.$\n\
The app will work fully after the restart."

  ; ── Utterance Timer Shortcuts ────────────────────────────────────────────
  done:
  DetailPrint "Creating Utterance Timer shortcuts..."
  CreateShortcut "$DESKTOP\Utterance Timer.lnk" \
    "$INSTDIR\Utterance.exe" "--timer" \
    "$INSTDIR\Utterance.exe" 0
  CreateShortcut "$SMPROGRAMS\Utterance\Utterance Timer.lnk" \
    "$INSTDIR\Utterance.exe" "--timer" \
    "$INSTDIR\Utterance.exe" 0
  DetailPrint "Utterance Timer shortcuts created."

!macroend

!macro customUnInstall
  Delete "$DESKTOP\Utterance Timer.lnk"
  Delete "$SMPROGRAMS\Utterance\Utterance Timer.lnk"
!macroend
