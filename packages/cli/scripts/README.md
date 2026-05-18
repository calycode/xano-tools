# CalyCode CLI Installation

## Primary: Download & Run (No Terminal Needed)

Download the installer for your platform, double-click it, and follow the prompts.
No terminal commands required.

| Platform | Download |
|---|---|
| **Windows** | `https://github.com/calycode/xano-tools/releases/latest/download/calycode-installer-windows-x64.exe` |
| **macOS Intel** | `https://github.com/calycode/xano-tools/releases/latest/download/calycode-installer-darwin-x64` |
| **macOS Apple Silicon** | `https://github.com/calycode/xano-tools/releases/latest/download/calycode-installer-darwin-arm64` |

> **macOS note:** After downloading, right-click the file and select **Open** to bypass Gatekeeper.
> Apple requires notarization for seamless opening — this will be added in a future release.

> **Checksums** are available alongside each release in the `SHA256SUMS` file.

### What the installer does
1. Checks for Node.js 18+ (installs automatically via winget/brew if missing)
2. Installs `@calycode/cli` globally via npm
3. Configures the Chrome Native Messaging Host for the CalyCode extension
4. Shows a completion dialog with next steps

---

## Alternative: Terminal Install (Shell Scripts)

For users who prefer terminal or need headless/CI installs:

### Windows (PowerShell)
```powershell
irm https://links.calycode.com/install-cli-windows-ps1 | iex
```

### macOS / Linux (Bash)
```bash
curl -fsSL https://links.calycode.com/install-cli-unix | bash
```

### Options
```bash
# Specific version
curl -fsSL https://links.calycode.com/install-cli-unix | bash -s -- --version 1.2.3

# Skip native host setup
curl -fsSL https://links.calycode.com/install-cli-unix | bash -s -- --skip-native-host

# Uninstall
curl -fsSL https://links.calycode.com/install-cli-unix | bash -s -- --uninstall
```

---

## Extension Mapping (User Agent → Download)

Suggested mapping for detecting the right installer from a browser extension:

```
win32   → calycode-installer-windows-x64.exe
darwin  → calycode-installer-darwin-arm64 (Apple Silicon) or darwin-x64 (Intel)
linux   → Fall back to shell script: curl ... | bash
```

Architecture detection on macOS: check `navigator.userAgentData` or serve a universal page.

---

## For Developers

The bootstrapper source is at `bootstrapper/`. It's a Go application that cross-compiles
to Windows and macOS from any platform.

### Build locally
```bash
cd bootstrapper
make all          # Build all targets
make windows      # Windows only
make darwin-arm64 # macOS ARM only
```

### CI
The `.github/workflows/build-bootstrapper.yml` workflow:
- Builds on push to `main` (when `bootstrapper/` files change)
- Builds and attaches binaries when a GitHub Release is published
- Maintains a floating `bootstrapper-latest` tag for development

---

## Directory Structure

```
bootstrapper/                # Go bootstrapper source (primary)
├── main.go                  # Entry point — orchestrate install flow
├── install/
│   ├── node.go              # Node.js version detection (cross-platform)
│   ├── node_windows.go      # Windows: winget install
│   ├── node_darwin.go       # macOS: brew install
│   ├── node_unsupported.go  # Stub for other platforms
│   └── cli.go               # npm install + oc init
├── ui/
│   ├── dialog_windows.go    # Windows: MessageBox native dialogs
│   ├── dialog_darwin.go     # macOS: osascript dialogs
│   └── dialog_unsupported.go# Stub for other platforms
└── Makefile                 # Cross-compile targets

scripts/installer/           # Shell fallbacks (kept for CI / headless)
├── install.sh               # Unix installer
├── install.ps1              # Windows PowerShell installer
└── install.bat              # Windows CMD wrapper

scripts/dev/                 # Development-only (for CLI contributors)
├── install-unix.sh
└── install-win.bat
```
