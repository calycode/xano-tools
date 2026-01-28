#Requires -Version 5.1
<#
.SYNOPSIS
    CalyCode CLI Installer for Windows

.DESCRIPTION
    Installs the CalyCode CLI and configures Chrome Native Messaging Host.
    
.PARAMETER Version
    The version to install (default: latest)

.PARAMETER SkipNativeHost
    Skip Chrome native messaging host configuration

.PARAMETER Uninstall
    Remove CalyCode CLI and native host configuration

.EXAMPLE
    # Install from web (PowerShell)
    irm https://get.calycode.com/install.ps1 | iex

    # Install specific version
    .\install.ps1 -Version 1.2.3

    # Uninstall
    .\install.ps1 -Uninstall

.NOTES
    Author: CalyCode Team
    Website: https://calycode.com
#>

[CmdletBinding()]
param(
    [Parameter()]
    [string]$Version = "latest",
    
    [Parameter()]
    [switch]$SkipNativeHost,
    
    [Parameter()]
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"  # Speeds up Invoke-WebRequest

# Configuration
$MinNodeVersion = 18
$PackageName = "@calycode/cli"
$NativeHostId = "com.calycode.cli"

# Colors and formatting
function Write-Log {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO"
    )
    
    $colors = @{
        INFO    = "Cyan"
        WARN    = "Yellow"
        ERROR   = "Red"
        SUCCESS = "Green"
    }
    
    Write-Host "[$Level] " -ForegroundColor $colors[$Level] -NoNewline
    Write-Host $Message
}

function Write-Header {
    param([string]$Message)
    Write-Host ""
    Write-Host $Message -ForegroundColor Cyan
    Write-Host ("-" * $Message.Length) -ForegroundColor Cyan
}

function Write-Banner {
    Write-Host ""
    Write-Host "   ____      _        ____          _      " -ForegroundColor Cyan
    Write-Host "  / ___|__ _| |_   _ / ___|___   __| | ___ " -ForegroundColor Cyan
    Write-Host " | |   / _`` | | | | | |   / _ \ / _`` |/ _ \" -ForegroundColor Cyan
    Write-Host " | |__| (_| | | |_| | |__| (_) | (_| |  __/" -ForegroundColor Cyan
    Write-Host "  \____\__,_|_|\__, |\____\___/ \__,_|\___|" -ForegroundColor Cyan
    Write-Host "               |___/                       " -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  CalyCode CLI Installer (Windows)" -ForegroundColor White
    Write-Host "  =================================" -ForegroundColor White
    Write-Host ""
}

# Check if running as administrator
function Test-Administrator {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Get Node.js version as integer
function Get-NodeVersion {
    try {
        $versionString = (node --version 2>$null)
        if ($versionString -match '^v(\d+)') {
            return [int]$Matches[1]
        }
    }
    catch { }
    return 0
}

# Check if Node.js meets minimum version
function Test-NodeJS {
    $currentVersion = Get-NodeVersion
    
    if ($currentVersion -ge $MinNodeVersion) {
        $fullVersion = (node --version)
        Write-Log "Node.js $fullVersion detected" "INFO"
        return $true
    }
    elseif ($currentVersion -gt 0) {
        $fullVersion = (node --version)
        Write-Log "Node.js $fullVersion is too old (need v${MinNodeVersion}+)" "WARN"
        return $false
    }
    else {
        Write-Log "Node.js is not installed" "WARN"
        return $false
    }
}

# Refresh PATH environment variable in current session
function Update-PathEnvironment {
    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = "$machinePath;$userPath"
    
    # Also try to add common Node.js paths
    $commonPaths = @(
        "$env:ProgramFiles\nodejs",
        "$env:APPDATA\npm",
        "$env:LOCALAPPDATA\Programs\nodejs"
    )
    
    foreach ($path in $commonPaths) {
        if ((Test-Path $path) -and ($env:Path -notlike "*$path*")) {
            $env:Path = "$path;$env:Path"
        }
    }
}

# Install Node.js
function Install-NodeJS {
    Write-Header "Installing Node.js..."
    
    # Try Winget first (Windows 10 1709+ / Windows 11)
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Log "Installing Node.js LTS via Winget..." "INFO"
        
        $result = winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Node.js installed successfully via Winget" "SUCCESS"
            Update-PathEnvironment
            return $true
        }
        else {
            Write-Log "Winget installation returned code: $LASTEXITCODE" "WARN"
        }
    }
    else {
        Write-Log "Winget not available" "WARN"
    }
    
    # Try Chocolatey as fallback
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Log "Installing Node.js LTS via Chocolatey..." "INFO"
        
        choco install nodejs-lts -y 2>&1 | Out-Null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Log "Node.js installed successfully via Chocolatey" "SUCCESS"
            
            # Refresh environment if available
            if (Test-Path "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1") {
                Import-Module "$env:ChocolateyInstall\helpers\chocolateyProfile.psm1"
                Update-SessionEnvironment
            }
            else {
                Update-PathEnvironment
            }
            
            return $true
        }
    }
    else {
        Write-Log "Chocolatey not available" "WARN"
    }
    
    # Manual installation prompt
    Write-Log "Automatic Node.js installation failed." "ERROR"
    Write-Host ""
    Write-Host "Please install Node.js manually:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://nodejs.org/" -ForegroundColor White
    Write-Host "  2. Run the installer" -ForegroundColor White
    Write-Host "  3. Restart this script" -ForegroundColor White
    Write-Host ""
    
    return $false
}

# Install CalyCode CLI
function Install-CalyCodeCLI {
    Write-Header "Installing CalyCode CLI..."
    
    $package = if ($Version -eq "latest") { "$PackageName@latest" } else { "$PackageName@$Version" }
    
    Write-Log "Installing $package globally..." "INFO"
    
    try {
        $npmOutput = npm install -g $package 2>&1
        
        if ($LASTEXITCODE -ne 0) {
            throw "npm install failed with exit code $LASTEXITCODE"
        }
        
        Write-Log "Package installed successfully" "SUCCESS"
        
        # Verify installation
        Update-PathEnvironment
        
        if (Get-Command xano -ErrorAction SilentlyContinue) {
            $cliVersion = (xano --version 2>$null) -replace '\n', ''
            Write-Log "CLI version: $cliVersion" "INFO"
        }
        else {
            Write-Log "The 'xano' command is not in PATH. You may need to restart your terminal." "WARN"
        }
        
        return $true
    }
    catch {
        Write-Log "Failed to install $package : $_" "ERROR"
        return $false
    }
}

# Configure native messaging host
function Initialize-NativeHost {
    if ($SkipNativeHost) {
        Write-Log "Skipping native host configuration (-SkipNativeHost)" "INFO"
        return $true
    }
    
    Write-Header "Configuring Chrome Native Messaging Host..."
    
    if (-not (Get-Command xano -ErrorAction SilentlyContinue)) {
        Write-Log "Cannot configure native host: 'xano' command not found in PATH" "WARN"
        Write-Log "Please restart your terminal and run: xano opencode init" "WARN"
        return $false
    }
    
    try {
        xano opencode init
        return $true
    }
    catch {
        Write-Log "Native host configuration failed: $_" "ERROR"
        return $false
    }
}

# Uninstall function
function Invoke-Uninstall {
    Write-Header "Uninstalling CalyCode CLI..."
    
    # Remove npm package
    if (Get-Command xano -ErrorAction SilentlyContinue) {
        Write-Log "Removing $PackageName package..." "INFO"
        npm uninstall -g $PackageName 2>$null
    }
    
    # Remove native host configuration
    $homeDir = $env:USERPROFILE
    $calyDir = Join-Path $homeDir ".calycode"
    
    # Remove wrapper script
    $wrapperPath = Join-Path $calyDir "bin\calycode-host.bat"
    if (Test-Path $wrapperPath) {
        Write-Log "Removing wrapper script..." "INFO"
        Remove-Item $wrapperPath -Force
    }
    
    # Remove manifest
    $manifestPath = Join-Path $calyDir "$NativeHostId.json"
    if (Test-Path $manifestPath) {
        Write-Log "Removing manifest file..." "INFO"
        Remove-Item $manifestPath -Force
    }
    
    # Remove registry key
    $regKey = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$NativeHostId"
    if (Test-Path $regKey) {
        Write-Log "Removing registry key..." "INFO"
        Remove-Item $regKey -Force
    }
    
    # Remove logs directory
    $logsDir = Join-Path $calyDir "logs"
    if (Test-Path $logsDir) {
        Write-Log "Removing logs directory..." "INFO"
        Remove-Item $logsDir -Recurse -Force
    }
    
    Write-Log "CalyCode CLI has been uninstalled." "SUCCESS"
    Write-Host ""
    Write-Host "Note: The ~/.calycode directory may still contain configuration files." -ForegroundColor Yellow
}

# Print completion message
function Write-Completion {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  CalyCode CLI installed successfully!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Getting Started:" -ForegroundColor Cyan
    Write-Host "    xano --help              Show available commands"
    Write-Host "    xano opencode init       Reconfigure Chrome extension"
    Write-Host "    xano opencode serve      Start local AI server"
    Write-Host ""
    Write-Host "  Documentation:" -ForegroundColor Cyan
    Write-Host "    https://calycode.com/docs"
    Write-Host ""
    Write-Host "  Note: Reload your Chrome extension to connect." -ForegroundColor Yellow
    Write-Host ""
}

# Main function
function Main {
    Write-Banner
    
    # Handle uninstall
    if ($Uninstall) {
        Invoke-Uninstall
        return
    }
    
    Write-Log "Installing version: $Version" "INFO"
    
    # Check/install Node.js
    if (-not (Test-NodeJS)) {
        if (-not (Install-NodeJS)) {
            exit 1
        }
        
        # Re-check after installation
        if (-not (Test-NodeJS)) {
            Write-Log "Node.js installation completed but not found in PATH." "ERROR"
            Write-Log "Please restart your terminal and run this script again." "ERROR"
            exit 1
        }
    }
    
    # Install CLI
    if (-not (Install-CalyCodeCLI)) {
        exit 1
    }
    
    # Configure native host
    Initialize-NativeHost
    
    # Done
    Write-Completion
}

# Run main
Main
