; AnchorCast Update Installer Hooks
; This is used ONLY for auto-update packages (no Python/model bundled).
; Skips all AI engine setup dialogs — Python already exists in resources.

!macro customHeader
!macroend

!macro customInstall

  ; ── Kill running AnchorCast ───────────────────────────────────────────────
  ExecWait 'taskkill /F /IM "AnchorCast.exe" /T' $0

  ; ── AnchorCast Timer Shortcuts ────────────────────────────────────────────
  CreateShortcut "$DESKTOP\AnchorCast Timer.lnk" \
    "$INSTDIR\AnchorCast.exe" "--timer" \
    "$INSTDIR\AnchorCast.exe" 0
  CreateShortcut "$SMPROGRAMS\AnchorCast\AnchorCast Timer.lnk" \
    "$INSTDIR\AnchorCast.exe" "--timer" \
    "$INSTDIR\AnchorCast.exe" 0

!macroend

!macro customUnInstall
  Delete "$DESKTOP\AnchorCast Timer.lnk"
  Delete "$SMPROGRAMS\AnchorCast\AnchorCast Timer.lnk"
!macroend
