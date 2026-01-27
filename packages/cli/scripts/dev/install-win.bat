@echo off
setlocal EnableDelayedExpansion

REM ==========================================
REM CalyCode Native Host Installer (Windows)
REM ==========================================

echo [INFO] Checking Node.js environment...

REM 1. Check for Node.js
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=1" %%v in ('node --version') do set NODE_VERSION=%%v
    echo [INFO] Node.js !NODE_VERSION! detected.

    REM Simple version check (starts with v18, v19, v2...)
    echo !NODE_VERSION! | findstr /r "^v1[8-9] ^v2" >nul
    if !ERRORLEVEL! EQU 0 (
        goto :InstallCLI
    ) else (
        echo [WARN] Node.js version is too old. v18+ required.
    )
) else (
    echo [WARN] Node.js not found.
)

:InstallNode
echo [WARN] Attempting to install Node.js via Winget...
where winget >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Winget not found. Please install Node.js manually from https://nodejs.org/
    pause
    exit /b 1
)

winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Node.js. Please install manually.
    pause
    exit /b 1
)

REM Refresh env vars is tricky in batch without restart.
REM We assume winget adds to path, but current shell won't see it.
REM We might need to tell user to restart.
echo [INFO] Node.js installed.
echo [WARN] You may need to restart this terminal or your computer for changes to take effect.
echo [INFO] Attempting to locate new node executable...

REM Try to find where it was likely installed to use immediately
if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

:InstallCLI
echo.

echo [INFO] Initializing Native Host...
call xano opencode init
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to run setup.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Setup complete! You can now use the OpenCode extension in Chrome.
echo [INFO] If the extension asks, please reload it.
echo.
pause
