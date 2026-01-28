@echo off
setlocal EnableDelayedExpansion

REM ============================================================================
REM CalyCode Native Host Installer (Development)
REM ============================================================================
REM This script is for developers working on the CLI itself.
REM It assumes the CLI is already available via 'xano' command (linked or built).
REM
REM For end-users, use the production installer instead:
REM   Run install.bat from the installer/ directory, or:
REM   irm https://get.calycode.com/install.ps1 | iex
REM ============================================================================

set MIN_NODE_VERSION=18

echo.
echo CalyCode Native Host Installer (Development)
echo =============================================
echo.

REM 1. Check for Node.js
echo [INFO] Checking Node.js environment...

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=1" %%v in ('node --version') do set NODE_VERSION=%%v
    echo [INFO] Node.js !NODE_VERSION! detected.

    REM Extract major version and check (v18, v19, v20, v21, v22, etc.)
    echo !NODE_VERSION! | findstr /r "^v1[8-9] ^v2[0-9]" >nul
    if !ERRORLEVEL! EQU 0 (
        goto :SetupNativeHost
    ) else (
        echo [WARN] Node.js version is too old. v%MIN_NODE_VERSION%+ required.
    )
) else (
    echo [WARN] Node.js not found.
)

:InstallNode
echo.
echo [INFO] Attempting to install Node.js via Winget...

where winget >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Winget not found.
    echo         Please install Node.js v%MIN_NODE_VERSION%+ manually from https://nodejs.org/
    pause
    exit /b 1
)

winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install Node.js via Winget.
    echo         Please install Node.js v%MIN_NODE_VERSION%+ manually from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js installed successfully.
echo [WARN] You may need to restart this terminal for PATH changes to take effect.

REM Try to add common Node.js paths to current session
if exist "C:\Program Files\nodejs\node.exe" (
    set "PATH=%PATH%;C:\Program Files\nodejs"
)

:SetupNativeHost
echo.

REM Check if xano command exists (assumes dev environment is set up)
where xano >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] The 'xano' command is not available.
    echo         Please ensure you have linked or built the CLI.
    echo.
    echo         Try running: npm link
    echo         Or build:    pnpm build
    pause
    exit /b 1
)

echo [INFO] Initializing Native Host...
call xano opencode init
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to initialize native host.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Setup complete!
echo [INFO] You can now use the OpenCode extension in Chrome.
echo [INFO] If the extension asks, please reload it.
echo.
pause
