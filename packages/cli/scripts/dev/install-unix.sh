#!/bin/bash
# ============================================================================
# CalyCode Native Host Installer (Development)
# ============================================================================
# This script is for developers working on the CLI itself.
# It assumes the CLI is already available via 'xano' command (linked or built).
#
# For end-users, use the production installer instead:
#   curl -fsSL https://get.calycode.com/install.sh | bash
# ============================================================================

set -e

# Configuration
MIN_NODE_VERSION=18

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
fatal() { error "$1"; exit 1; }

# Get Node.js version as integer
get_node_version() {
    if command -v node >/dev/null 2>&1; then
        node --version | cut -d'.' -f1 | tr -d 'v'
    else
        echo "0"
    fi
}

# Check Node.js
check_node() {
    local current_version
    current_version=$(get_node_version)
    
    if [ "$current_version" -ge "$MIN_NODE_VERSION" ]; then
        log "Node.js v$(node --version | tr -d 'v') detected"
        return 0
    elif [ "$current_version" -gt 0 ]; then
        warn "Node.js v$(node --version | tr -d 'v') is too old (need v${MIN_NODE_VERSION}+)"
        return 1
    else
        warn "Node.js is not installed"
        return 1
    fi
}

# Install Node.js
install_node() {
    log "Attempting to install Node.js..."
    
    case "$(uname -s)" in
        Darwin*)
            if ! command -v brew >/dev/null 2>&1; then
                warn "Homebrew not found. Installing Homebrew..."
                /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            fi
            brew install node
            ;;
        Linux*)
            if [ -f /etc/debian_version ]; then
                curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
                sudo apt-get install -y nodejs
            elif [ -f /etc/redhat-release ]; then
                curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
                if command -v dnf >/dev/null 2>&1; then
                    sudo dnf install -y nodejs
                else
                    sudo yum install -y nodejs
                fi
            elif [ -f /etc/arch-release ]; then
                sudo pacman -Sy --noconfirm nodejs npm
            else
                fatal "Unsupported Linux distribution. Please install Node.js v${MIN_NODE_VERSION}+ manually."
            fi
            ;;
        *)
            fatal "Unsupported OS. Please install Node.js v${MIN_NODE_VERSION}+ manually."
            ;;
    esac
    
    # Verify
    if ! check_node; then
        fatal "Node.js installation failed."
    fi
}

# Main
main() {
    echo -e "${CYAN}CalyCode Native Host Installer (Development)${NC}"
    echo "=============================================="
    echo ""
    
    # Check/install Node.js
    if ! check_node; then
        install_node
    fi
    
    # Check if xano command exists (assumes dev environment is set up)
    if ! command -v xano >/dev/null 2>&1; then
        fatal "The 'xano' command is not available. Please ensure you have linked or built the CLI."
    fi
    
    log "Initializing Native Host..."
    xano opencode init
    
    echo ""
    log "Setup complete! You can reload the Chrome extension now."
}

main "$@"
