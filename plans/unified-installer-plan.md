# Unified Installation Script Plan

> **Date:** 2026-01-27
> **Status:** Planning
> **Goal:** Provide simple one-liner installation for all platforms

---

## Objective

Create a unified installation experience that allows users to run:

```bash
# Unix (macOS/Linux)
curl -fsSL https://get.calycode.com/install.sh | bash

# Windows (PowerShell)
irm https://get.calycode.com/install.ps1 | iex

# Windows (CMD - download and run)
curl -fsSL https://get.calycode.com/install.bat -o install.bat && install.bat
```

---

## Current State Summary

### Existing Scripts (6 total)

| Script                          | Status     | Notes                                |
| ------------------------------- | ---------- | ------------------------------------ |
| `scripts/install-unix.sh`       | REDUNDANT  | Duplicate of dev version             |
| `scripts/install-win.bat`       | REDUNDANT  | Less complete than installer version |
| `scripts/dev/install-unix.sh`   | KEEP (dev) | For local development                |
| `scripts/dev/install-win.bat`   | KEEP (dev) | For local development                |
| `scripts/installer/install.sh`  | UPGRADE    | Base for unified Unix script         |
| `scripts/installer/install.bat` | REPLACE    | Convert to PowerShell                |

### Issues with Current Approach

1. **Batch files are limited** - `.bat` files have poor error handling and no modern features
2. **No PowerShell script** - Windows users with modern shells can't use a one-liner
3. **No version pinning support** - Can't install specific versions
4. **No update mechanism** - Can't easily update an existing installation
5. **No uninstall script** - Users have no clean way to remove

---

## Proposed Solution

### New Script Structure

```
scripts/
├── dev/                          # Developer scripts (unchanged)
│   ├── install-unix.sh
│   └── install-win.bat
└── installer/                    # Production installers
    ├── install.sh                # Enhanced Unix script
    ├── install.ps1               # New PowerShell script (replaces .bat)
    └── install.bat               # Wrapper that launches PowerShell
```

### Key Design Principles

1. **Single source of truth** - One script per platform family
2. **Idempotent** - Safe to run multiple times
3. **Non-destructive** - Doesn't break existing setups
4. **Verbose by default** - Users see what's happening
5. **Exit codes** - Proper exit codes for CI/CD integration
6. **Offline detection** - Clear error when no internet

---

## Script Specifications

### 1. Unix Installer (`install.sh`)

**Features:**

- Works on macOS, Linux (Debian/Ubuntu, RHEL/Fedora, Arch)
- Detects and installs Node.js if missing (via Homebrew, apt, dnf, pacman)
- Installs `@calycode/cli` globally
- Runs `xano opencode init` to set up native messaging
- Supports `--version` flag for specific version
- Supports `--uninstall` flag to remove

**Script Flow:**

```
┌─────────────────────────────────────────┐
│          Check Prerequisites            │
│  - curl or wget available               │
│  - Not running as root (warn if so)     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Check Node.js                  │
│  - Minimum version: 18                  │
│  - Detect nvm, fnm, volta, asdf         │
│  - Install if missing via:              │
│    - macOS: Homebrew                    │
│    - Debian: NodeSource                 │
│    - RHEL: NodeSource                   │
│    - Arch: pacman                       │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Install CLI                    │
│  - npm install -g @calycode/cli@latest  │
│  - Or specific version if requested     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Configure Native Host          │
│  - xano opencode init                   │
│  - Creates manifest in:                 │
│    - macOS: ~/Library/Application       │
│             Support/Google/Chrome/...   │
│    - Linux: ~/.config/google-chrome/... │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Verify Installation            │
│  - Check xano --version                 │
│  - Print success message                │
└─────────────────────────────────────────┘
```

**Example Implementation Skeleton:**

```bash
#!/bin/bash
set -euo pipefail

VERSION="${CALYCODE_VERSION:-latest}"
INSTALL_DIR="${CALYCODE_INSTALL_DIR:-}"

# Colors
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; exit 1; }

# Check for required commands
check_requirements() {
    command -v curl >/dev/null 2>&1 || command -v wget >/dev/null 2>&1 || \
        error "curl or wget is required"
}

# Check/install Node.js
ensure_node() {
    if command -v node >/dev/null 2>&1; then
        NODE_VER=$(node --version | cut -d'.' -f1 | tr -d 'v')
        if [ "$NODE_VER" -ge 18 ]; then
            log "Node.js $(node --version) detected"
            return 0
        fi
        warn "Node.js version too old (need v18+)"
    fi
    install_node
}

# Platform-specific Node installation
install_node() {
    case "$(uname -s)" in
        Darwin*)
            if command -v brew >/dev/null 2>&1; then
                brew install node
            else
                warn "Installing Homebrew first..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
                brew install node
            fi
            ;;
        Linux*)
            if [ -f /etc/debian_version ]; then
                curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
                sudo apt-get install -y nodejs
            elif [ -f /etc/redhat-release ]; then
                curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
                sudo dnf install -y nodejs
            elif [ -f /etc/arch-release ]; then
                sudo pacman -S nodejs npm
            else
                error "Unsupported Linux distribution. Please install Node.js v18+ manually."
            fi
            ;;
        *)
            error "Unsupported OS: $(uname -s)"
            ;;
    esac
}

# Install CalyCode CLI
install_cli() {
    log "Installing @calycode/cli@${VERSION}..."
    npm install -g "@calycode/cli@${VERSION}" || sudo npm install -g "@calycode/cli@${VERSION}"
}

# Configure native messaging
configure_native_host() {
    log "Configuring native messaging host..."
    xano opencode init
}

# Main
main() {
    log "CalyCode CLI Installer"
    log "======================"

    check_requirements
    ensure_node
    install_cli
    configure_native_host

    log "Installation complete!"
    log "You can now use 'xano' commands in your terminal."
    log "Reload your Chrome extension to connect."
}

main "$@"
```

---

### 2. Windows Installer (`install.ps1`)

**Features:**

- Works on PowerShell 5.1+ (Windows 10/11 built-in)
- Detects and installs Node.js via Winget or Chocolatey
- Installs `@calycode/cli` globally
- Sets up native messaging (registry + manifest)
- Supports `-Version` parameter
- Supports `-Uninstall` switch

**Script Flow:**

```
┌─────────────────────────────────────────┐
│          Check Execution Policy         │
│  - Warn if restricted                   │
│  - Provide bypass instructions          │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Check Node.js                  │
│  - Minimum version: 18                  │
│  - Install via Winget (preferred)       │
│  - Fallback to Chocolatey               │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Refresh PATH                   │
│  - Import refreshenv from Chocolatey    │
│  - Or manual PATH update                │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Install CLI                    │
│  - npm install -g @calycode/cli@latest  │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Configure Native Host          │
│  - xano opencode init                   │
│  - Creates registry key                 │
│  - Creates manifest in ~/.calycode/     │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│          Verify & Complete              │
│  - Test xano --version                  │
│  - Show success dialog (optional)       │
└─────────────────────────────────────────┘
```

**Example Implementation Skeleton:**

```powershell
#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$Version = "latest",
    [switch]$Uninstall
)

$ErrorActionPreference = "Stop"

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $colors = @{ INFO = "Green"; WARN = "Yellow"; ERROR = "Red" }
    Write-Host "[$Level] $Message" -ForegroundColor $colors[$Level]
}

function Test-NodeJS {
    try {
        $nodeVersion = (node --version 2>$null)
        if ($nodeVersion -match '^v(\d+)') {
            return [int]$Matches[1] -ge 18
        }
    } catch { }
    return $false
}

function Install-NodeJS {
    Write-Log "Installing Node.js LTS..."

    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install -e --id OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nodejs-lts -y
    } else {
        throw "Neither Winget nor Chocolatey found. Please install Node.js manually from https://nodejs.org/"
    }

    # Refresh PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path", "User")
}

function Install-CalyCodeCLI {
    Write-Log "Installing @calycode/cli@$Version..."
    npm install -g "@calycode/cli@$Version"
}

function Initialize-NativeHost {
    Write-Log "Configuring native messaging host..."
    xano opencode init
}

# Main
try {
    Write-Log "CalyCode CLI Installer"
    Write-Log "======================"

    if (-not (Test-NodeJS)) {
        Install-NodeJS
        if (-not (Test-NodeJS)) {
            throw "Node.js installation failed. Please restart your terminal and try again."
        }
    }
    Write-Log "Node.js $(node --version) detected"

    Install-CalyCodeCLI
    Initialize-NativeHost

    Write-Log "Installation complete!"
    Write-Log "You can now use 'xano' commands in your terminal."
    Write-Log "Reload your Chrome extension to connect."

} catch {
    Write-Log $_.Exception.Message "ERROR"
    exit 1
}
```

---

### 3. Batch Wrapper (`install.bat`)

Simple wrapper for users who double-click or use CMD:

```batch
@echo off
echo Starting CalyCode installer...
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://get.calycode.com/install.ps1 | iex"
if %ERRORLEVEL% neq 0 (
    echo.
    echo Installation failed. Press any key to exit...
    pause >nul
    exit /b 1
)
echo.
echo Press any key to exit...
pause >nul
```

---

## Hosting Requirements

### Option A: GitHub Pages (Recommended)

```
https://calycode.github.io/cli/install.sh
https://calycode.github.io/cli/install.ps1
https://calycode.github.io/cli/install.bat
```

With custom domain CNAME:

```
https://get.calycode.com/install.sh
https://get.calycode.com/install.ps1
https://get.calycode.com/install.bat
```

### Option B: npm Registry Direct Link

Scripts can also be fetched from npm package:

```bash
npx @calycode/cli@latest --install
```

This would require adding an `--install` flag that runs the native host setup.

---

## Migration Plan

### Phase 1: Consolidation (Immediate)

1. Delete redundant scripts:
   - `scripts/install-unix.sh`
   - `scripts/install-win.bat`

2. Keep development scripts unchanged:
   - `scripts/dev/install-unix.sh`
   - `scripts/dev/install-win.bat`

### Phase 2: New Scripts (Short-term)

1. Create `scripts/installer/install.ps1` (new)
2. Update `scripts/installer/install.bat` (wrapper only)
3. Enhance `scripts/installer/install.sh` (add features)

### Phase 3: Distribution (Medium-term)

1. Set up hosting at `get.calycode.com`
2. Add scripts to CI/CD for automatic publishing
3. Update documentation with new installation instructions

### Phase 4: Optional Enhancements (Long-term)

1. Add version pinning support
2. Add update command (`xano update` or separate update script)
3. Add uninstall support
4. Consider binary distribution (pre-compiled Node.js + CLI)

---

## Testing Checklist

### Unix (`install.sh`)

- [ ] macOS with Homebrew
- [ ] macOS without Homebrew (should install it)
- [ ] Ubuntu/Debian with apt
- [ ] Fedora/RHEL with dnf
- [ ] Arch Linux with pacman
- [ ] WSL2 (Ubuntu)
- [ ] With existing Node.js 18+
- [ ] With old Node.js (should upgrade)
- [ ] With no Node.js (should install)
- [ ] With nvm-managed Node.js
- [ ] Re-run (idempotency)

### Windows (`install.ps1`)

- [ ] Windows 11 with Winget
- [ ] Windows 10 with Winget
- [ ] Windows with Chocolatey only
- [ ] With existing Node.js 18+
- [ ] With old Node.js
- [ ] With no Node.js
- [ ] Re-run (idempotency)
- [ ] From CMD via install.bat wrapper

---

## Security Considerations

1. **HTTPS only** - All download URLs must use HTTPS
2. **Checksum verification** - Consider adding SHA256 verification
3. **Minimal sudo usage** - Only use sudo when absolutely necessary
4. **No arbitrary code execution** - Don't `eval` untrusted content
5. **Clear output** - Users should see exactly what's being installed
6. **Audit logging** - Log all actions to a file for troubleshooting

---

## Appendix: Comparison with Other Projects

| Project  | Unix Install                                                      | Windows Install                            |
| -------- | ----------------------------------------------------------------- | ------------------------------------------ |
| Rust     | `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \| sh` | rustup-init.exe                            |
| Bun      | `curl -fsSL https://bun.sh/install \| bash`                       | PowerShell one-liner                       |
| Deno     | `curl -fsSL https://deno.land/install.sh \| sh`                   | `irm https://deno.land/install.ps1 \| iex` |
| Homebrew | `bash -c "$(curl -fsSL https://raw.github...)"`                   | N/A                                        |

Our approach aligns with industry standards, using `curl | bash` for Unix and `irm | iex` for Windows.
