@echo off
REM ============================================================================
REM CalyCode CLI Installer (Windows)
REM ============================================================================
REM This is a wrapper script that launches the PowerShell installer.
REM For direct PowerShell usage, run:
REM   irm https://get.calycode.com/install.ps1 | iex
REM ============================================================================

setlocal

echo.
echo   CalyCode CLI Installer
echo   ======================
echo.

REM Check if PowerShell is available
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PowerShell is required but not found in PATH.
    echo         Please install PowerShell or run the installer manually.
    pause
    exit /b 1
)

REM Get the directory where this script is located
set "SCRIPT_DIR=%~dp0"

REM Check if the PowerShell script exists locally
if exist "%SCRIPT_DIR%install.ps1" (
    echo [INFO] Running local PowerShell installer...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%install.ps1" %*
) else (
    echo [INFO] Downloading and running PowerShell installer...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://get.calycode.com/install.ps1 | iex"
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation failed with error code %ERRORLEVEL%
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Press any key to exit...
pause >nul
