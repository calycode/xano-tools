#!/bin/bash
set -e

# Colors for output
green='\033[0;32m'; yellow='\033[1;33m'; red='\033[0;31m'; nc='\033[0m'

log() { echo -e "${green}[INFO]${nc} $1"; }
warn() { echo -e "${yellow}[WARN]${nc} $1"; }
err() { echo -e "${red}[ERROR]${nc} $1" >&2; exit 1; }

# Check Node.js (v18+)
if command -v node >/dev/null 2>&1; then
  NODE_VER=$(node --version | cut -d. -f1 | sed 's/v//')
  if [ "$NODE_VER" -ge 18 ]; then
     log "Node.js $(node --version) detected ✓"
  else
     warn "Node.js is too old ($(node --version)). v18+ required."
     INSTALL_NODE=true
  fi
else
  warn "Node.js not found."
  INSTALL_NODE=true
fi

if [ "$INSTALL_NODE" = true ]; then
  log "Attempting to install Node.js..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      if ! command -v brew >/dev/null 2>&1; then
          warn "Homebrew not found. Installing Homebrew..."
          /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
      fi
      brew install node
  elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
      # Linux
      if command -v apt-get >/dev/null 2>&1; then
          curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
          sudo apt-get install -y nodejs
      elif command -v dnf >/dev/null 2>&1; then
          sudo dnf install -y nodejs
      else
          err "Could not automatically install Node.js. Please install it manually: https://nodejs.org/"
      fi
  else
      err "Unsupported OS. Please install Node.js manually: https://nodejs.org/"
  fi
fi

log "Installing CalyCode Native Host..."
xano opencode init

log "✅ Setup complete! You can reload the Chrome extension now."
