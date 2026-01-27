#!/bin/bash
set -e

# ==========================================
# CalyCode Native Host Installer (macOS/Linux)
# ==========================================

# Colors for output
red='\033[0;31m'; green='\033[0;32m'; yellow='\033[1;33m'; nc='\033[0m'

log() { echo -e "${green}[INFO]${nc} $1"; }
warn() { echo -e "${yellow}[WARN]${nc} $1"; }
err() { echo -e "${red}[ERROR]${nc} $1" >&2; exit 1; }

# 1. Check/Install Node.js (v18+)
log "Checking Node.js environment..."

if command -v node >/dev/null 2>&1 && node --version | grep -E '^v(18|19|2[0-9])' >/dev/null; then
  log "Node.js $(node --version) detected ✓"
else
  warn "Node.js v18+ not found. Attempting installation..."
  
  OS="$(uname -s)"
  case "$OS" in
    Darwin*)
      if ! command -v brew >/dev/null 2>&1; then
        warn "Homebrew not found. Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      fi
      brew install node
      ;;
    Linux*)
      # Basic check for Debian/Ubuntu vs RHEL/Fedora
      if [ -f /etc/debian_version ]; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
      elif [ -f /etc/redhat-release ]; then
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo dnf install -y nodejs
      else
        err "Unsupported Linux distribution. Please install Node.js v18+ manually."
      fi
      ;;
    *)
      err "Unsupported OS: $OS. Please install Node.js v18+ manually."
      ;;
  esac
  
  # Verify installation
  if ! command -v node >/dev/null 2>&1; then
      err "Node.js installation failed. Please install Node.js manually and try again."
  fi
  log "Node.js $(node --version) installed successfully ✓"
fi

# 2. Run Setup
log "Installing CalyCode CLI globally..."
# We use sudo for global install if needed, but try without first or if using nvm
if command -v npm >/dev/null 2>&1; then
  npm install -g @calycode/cli@latest || sudo npm install -g @calycode/cli@latest
else
  err "npm not found. Please ensure Node.js is installed correctly."
fi

log "Initializing Native Host..."
xano opencode init


# 3. Start Server (Optional - usually 'init' registers it, but 'serve' validates it works)
# We don't necessarily want to block the terminal here forever if the user just wanted to install.
# 'opencode init' sets up the manifest. The browser launches the host automatically.
# However, if you want to verify it works, we can run a quick check or just exit.

log "✅ Setup complete! You can now use the OpenCode extension in Chrome."
log "If the extension asks, please reload it."
