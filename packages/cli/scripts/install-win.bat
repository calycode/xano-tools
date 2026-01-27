@echo off
setlocal

echo [INFO] Checking for Node.js...

:: Check if Node is installed and check version
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Node.js not found. Installing via WinGet...
    winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Node.js via WinGet.
        echo Please install Node.js manually from https://nodejs.org/
        pause
        exit /b 1
    )
    :: Refresh environment variables for the current session
    call RefreshEnv.cmd >nul 2>&1
    if %errorlevel% neq 0 (
        :: Fallback if RefreshEnv is missing, just try to add common paths
        set "PATH=%PATH%;C:\Program Files\nodejs"
    )
)

echo [INFO] Node.js detected. Installing CalyCode Native Host...
call npx -y @calycode/cli@latest opencode init

echo [INFO] Setup complete! You can close this window.
pause
