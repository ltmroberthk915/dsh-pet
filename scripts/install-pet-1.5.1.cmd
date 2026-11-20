@echo off
REM Install dsh-pets-multiworkers 1.5.1 (care panel: 命名 -> 保持对话专宠).
REM Complete shutdown first: quit DSH from the tray, not just closing the window.
setlocal
pwsh -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-pet-1.5.1.ps1" %*
echo.
echo Exit code: %ERRORLEVEL%
pause
