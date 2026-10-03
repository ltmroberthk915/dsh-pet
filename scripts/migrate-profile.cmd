@echo off
setlocal
echo Restoring saved DSH Pet configuration after the package rename.
echo A backup is created before changing the desktop profile.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0migrate-profile.ps1" -Apply
set "PET_RESULT=%ERRORLEVEL%"
pause
exit /b %PET_RESULT%
