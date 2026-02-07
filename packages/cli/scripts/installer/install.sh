#!/bin/bash
# ============================================================================
# CalyCode CLI Installer (Production)
# ============================================================================
# Usage:
#   curl -fsSL https://get.calycode.com/install.sh | bash
#   curl -fsSL https://get.calycode.com/install.sh | bash -s -- --version 1.0.0
#   curl -fsSL https://get.calycode.com/install.sh | bash -s -- --uninstall
#
# Environment Variables:
#   CALYCODE_VERSION  - Version to install (default: latest)
#   CALYCODE_SKIP_NATIVE_HOST - Set to 1 to skip native host setup
# ============================================================================

set -euo pipefail

# Configuration
VERSION="${CALYCODE_VERSION:-latest}"
SKIP_NATIVE_HOST="${CALYCODE_SKIP_NATIVE_HOST:-0}"
MIN_NODE_VERSION=18

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Logging functions
log() { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
fatal() { error "$1"; exit 1; }
header() { echo -e "\n${CYAN}${BOLD}$1${NC}"; }

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --version|-v)
                VERSION="$2"
                shift 2
                ;;
            --uninstall)
                uninstall
                exit 0
                ;;
            --skip-native-host)
                SKIP_NATIVE_HOST=1
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                warn "Unknown option: $1"
                shift
                ;;
        esac
    done
}

show_help() {
    cat << EOF
CalyCode CLI Installer

Usage:
    curl -fsSL https://get.calycode.com/install.sh | bash
    ./install.sh [OPTIONS]

Options:
    --version, -v VERSION   Install a specific version (default: latest)
    --skip-native-host      Skip Chrome native messaging host setup
    --uninstall             Remove CalyCode CLI and native host configuration
    --help, -h              Show this help message

Environment Variables:
    CALYCODE_VERSION              Version to install
    CALYCODE_SKIP_NATIVE_HOST     Set to 1 to skip native host setup

Examples:
    # Install latest version
    curl -fsSL https://get.calycode.com/install.sh | bash

    # Install specific version
    curl -fsSL https://get.calycode.com/install.sh | bash -s -- --version 1.2.3

    # Uninstall
    curl -fsSL https://get.calycode.com/install.sh | bash -s -- --uninstall
EOF
}

# Uninstall function
uninstall() {
    header "Uninstalling CalyCode CLI..."
    
    # Remove npm package
    if command -v xano >/dev/null 2>&1; then
        log "Removing @calycode/cli package..."
        npm uninstall -g @calycode/cli 2>/dev/null || sudo npm uninstall -g @calycode/cli 2>/dev/null || true
    fi
    
    # Remove native host configuration
    local home_dir="$HOME"
    
    # Remove wrapper script
    if [ -f "$home_dir/.calycode/bin/calycode-host.sh" ]; then
        log "Removing wrapper script..."
        rm -f "$home_dir/.calycode/bin/calycode-host.sh"
    fi
    
    # Remove manifest based on OS
    case "$(uname -s)" in
        Darwin*)
            local manifest="$home_dir/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.calycode.cli.json"
            if [ -f "$manifest" ]; then
                log "Removing Chrome native messaging manifest..."
                rm -f "$manifest"
            fi
            ;;
        Linux*)
            local manifest="$home_dir/.config/google-chrome/NativeMessagingHosts/com.calycode.cli.json"
            if [ -f "$manifest" ]; then
                log "Removing Chrome native messaging manifest..."
                rm -f "$manifest"
            fi
            ;;
    esac
    
    # Remove logs directory (optional, keep config)
    if [ -d "$home_dir/.calycode/logs" ]; then
        log "Removing logs directory..."
        rm -rf "$home_dir/.calycode/logs"
    fi
    
    log "CalyCode CLI has been uninstalled."
    log "Note: The ~/.calycode directory may still contain configuration files."
}

# Check for required commands
check_requirements() {
    header "Checking requirements..."
    
    if ! command -v curl >/dev/null 2>&1 && ! command -v wget >/dev/null 2>&1; then
        fatal "curl or wget is required but not installed."
    fi
    log "Network tools available"
}

# Get current Node.js version as integer
get_node_version() {
    if command -v node >/dev/null 2>&1; then
        node --version | cut -d'.' -f1 | tr -d 'v'
    else
        echo "0"
    fi
}

# Check if Node.js meets minimum version
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

# Detect Node.js version manager
detect_node_manager() {
    if [ -n "${NVM_DIR:-}" ] && [ -s "$NVM_DIR/nvm.sh" ]; then
        echo "nvm"
    elif command -v fnm >/dev/null 2>&1; then
        echo "fnm"
    elif command -v volta >/dev/null 2>&1; then
        echo "volta"
    elif command -v asdf >/dev/null 2>&1 && asdf plugin list 2>/dev/null | grep -q nodejs; then
        echo "asdf"
    else
        echo "none"
    fi
}

# Install Node.js based on platform
install_node() {
    header "Installing Node.js..."
    
    local node_manager
    node_manager=$(detect_node_manager)
    
    case "$node_manager" in
        nvm)
            log "Using nvm to install Node.js LTS..."
            # shellcheck source=/dev/null
            . "$NVM_DIR/nvm.sh"
            nvm install --lts
            nvm use --lts
            ;;
        fnm)
            log "Using fnm to install Node.js LTS..."
            fnm install --lts
            fnm use --lts
            ;;
        volta)
            log "Using volta to install Node.js LTS..."
            volta install node@lts
            ;;
        asdf)
            log "Using asdf to install Node.js LTS..."
            asdf install nodejs lts
            asdf global nodejs lts
            ;;
        none)
            install_node_system
            ;;
    esac
    
    # Verify installation
    if ! check_node; then
        fatal "Node.js installation failed. Please install Node.js v${MIN_NODE_VERSION}+ manually and try again."
    fi
}

# Install Node.js using system package manager
install_node_system() {
    local os_type
    os_type="$(uname -s)"
    
    case "$os_type" in
        Darwin*)
            install_node_macos
            ;;
        Linux*)
            install_node_linux
            ;;
        *)
            fatal "Unsupported operating system: $os_type. Please install Node.js v${MIN_NODE_VERSION}+ manually."
            ;;
    esac
}

# Install Node.js on macOS
install_node_macos() {
    if ! command -v brew >/dev/null 2>&1; then
        log "Homebrew not found. Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        
        # Add Homebrew to PATH for Apple Silicon
        if [ -f "/opt/homebrew/bin/brew" ]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    fi
    
    log "Installing Node.js via Homebrew..."
    brew install node
}

# Install Node.js on Linux
install_node_linux() {
    if [ -f /etc/debian_version ]; then
        log "Detected Debian/Ubuntu. Installing Node.js via NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [ -f /etc/redhat-release ]; then
        log "Detected RHEL/Fedora. Installing Node.js via NodeSource..."
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        if command -v dnf >/dev/null 2>&1; then
            sudo dnf install -y nodejs
        else
            sudo yum install -y nodejs
        fi
    elif [ -f /etc/arch-release ]; then
        log "Detected Arch Linux. Installing Node.js via pacman..."
        sudo pacman -Sy --noconfirm nodejs npm
    elif [ -f /etc/alpine-release ]; then
        log "Detected Alpine Linux. Installing Node.js via apk..."
        sudo apk add --no-cache nodejs npm
    else
        fatal "Unsupported Linux distribution. Please install Node.js v${MIN_NODE_VERSION}+ manually."
    fi
}

# Install CalyCode CLI
install_cli() {
    header "Installing CalyCode CLI..."
    
    local package="@calycode/cli"
    if [ "$VERSION" != "latest" ]; then
        package="@calycode/cli@$VERSION"
    else
        package="@calycode/cli@latest"
    fi
    
    log "Installing $package globally..."
    
    # Try without sudo first (for nvm/fnm users)
    if npm install -g "$package" 2>/dev/null; then
        log "Package installed successfully"
    elif sudo npm install -g "$package"; then
        log "Package installed successfully (with sudo)"
    else
        fatal "Failed to install $package. Please check npm permissions."
    fi
    
    # Verify installation
    if ! command -v xano >/dev/null 2>&1; then
        warn "The 'xano' command is not in PATH. You may need to restart your terminal."
    else
        log "CLI version: $(xano --version 2>/dev/null || echo 'unknown')"
    fi
}

# Configure native messaging host
configure_native_host() {
    if [ "$SKIP_NATIVE_HOST" = "1" ]; then
        log "Skipping native host configuration (--skip-native-host)"
        return 0
    fi
    
    header "Configuring Chrome Native Messaging Host..."
    
    if ! command -v xano >/dev/null 2>&1; then
        warn "Cannot configure native host: 'xano' command not found in PATH"
        warn "Please restart your terminal and run: xano opencode init"
        return 1
    fi
    
    xano opencode init
}

# Print completion message
print_completion() {
    echo ""
    echo -e "${GREEN}${BOLD}============================================${NC}"
    echo -e "${GREEN}${BOLD}  CalyCode CLI installed successfully!${NC}"
    echo -e "${GREEN}${BOLD}============================================${NC}"
    echo ""
    echo -e "  ${CYAN}Getting Started:${NC}"
    echo "    xano --help              Show available commands"
    echo "    xano opencode init       Reconfigure Chrome extension"
    echo "    xano opencode serve      Start local AI server"
    echo ""
    echo -e "  ${CYAN}Documentation:${NC}"
    echo "    https://calycode.com/docs"
    echo ""
    echo -e "  ${YELLOW}Note:${NC} Reload your Chrome extension to connect."
    echo ""
}

# Main function
main() {
    echo -e "${CYAN}${BOLD}"
    echo "   ____      _        ____          _      "
    echo "  / ___|__ _| |_   _ / ___|___   __| | ___ "
    echo " | |   / _\` | | | | | |   / _ \\ / _\` |/ _ \\"
    echo " | |__| (_| | | |_| | |__| (_) | (_| |  __/"
    echo "  \\____\\__,_|_|\\__, |\\____\\___/ \\__,_|\\___|"
    echo "               |___/                       "
    echo -e "${NC}"
    echo "  CalyCode CLI Installer"
    echo "  ======================"
    echo ""
    
    parse_args "$@"
    
    log "Installing version: $VERSION"
    
    check_requirements
    
    if ! check_node; then
        install_node
    fi
    
    install_cli
    configure_native_host
    print_completion
}

# Run main with all arguments
main "$@"
