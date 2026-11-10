# CalyCode CLI Installation

## Primary: Download & Run (No Terminal Needed)

Download the installer for your platform, double-click it, and follow the window.
No terminal commands required.

| Platform | Download |
|---|---|
| **Windows** | `https://github.com/calycode/xano-tools/releases/latest/download/calycode-installer-windows-x64.exe` |
| **macOS Intel** | `https://github.com/calycode/xano-tools/releases/latest/download/calycode-installer-darwin-x64.zip` |
| **macOS Apple Silicon** | `https://github.com/calycode/xano-tools/releases/latest/download/calycode-installer-darwin-arm64.zip` |

> **macOS note:** Unzip the download first, then right-click the extracted installer and select **Open** to bypass Gatekeeper.
> Apple requires notarization for seamless opening. This will be added in a future release.

> **Checksums** are available alongside each release in the `SHA256SUMS` file.

### What the installer does

Double-click it and a single installer window opens. It shows one checklist, explains
each step, and stays open until the work is done. No terminal, no modal dialogs.

1. **Check your system:** looks for Node.js 18+ and installs the LTS release via
   `winget` (Windows) or Homebrew (macOS) when it is missing.
2. **Install the CalyCode CLI:** `npm install -g @calycode/cli`, with live progress.
3. **Verify the installation:** runs `caly-xano --version`, so a broken install cannot
   be reported as a success.
4. **Connect the browser extension:** runs `caly-xano oc init`, which registers the
   native messaging host and installs the Xano agent templates and skills.

Every run writes a setup log, and the window links to it (**Open setup log**,
**Copy log path**). If a step cannot finish, the installer stops there, keeps the
window open, and shows the reason plus that link.

Full walkthrough, permissions, log locations and troubleshooting:
[`docs/guides/installer.md`](../../../docs/guides/installer.md).

---

## Alternative: Terminal Install (Shell Scripts)

For users who prefer a terminal or need headless/CI installs:

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

For a full extension integration guide, see `docs/extension-installer-flow.md`.

---

## For Developers

The bootstrapper source is at `bootstrapper/`. It is a Go application that
cross-compiles to Windows and macOS from any platform.

### Build locally
```bash
cd bootstrapper
make all          # Build all targets
make windows      # Windows only
make darwin-arm64 # macOS ARM only
```

### Preview the UI

```bash
cd bootstrapper
go run ./preview -stage welcome
go run ./preview -stage running
go run ./preview -stage done
go run ./preview -stage failed
```

The `preview` command renders a scripted state against the real backend, so you can
iterate on the window without installing anything.

### CI
The `.github/workflows/build-bootstrapper.yml` workflow:
- Builds on push to `main` (when `bootstrapper/` files change)
- Builds and attaches binaries when a GitHub Release is published
- Maintains a floating `bootstrapper-latest` tag for development

---

## Directory Structure

```
bootstrapper/                  # Go bootstrapper source (primary)
├── main.go                    # Entry point: flags, log, consent, install steps
├── install/
│   ├── cli.go                 # npm install, verify, native host
│   ├── node.go                # Node.js version detection (cross-platform)
│   ├── node_windows.go        # Windows: winget, then Chocolatey
│   ├── node_darwin.go         # macOS: Homebrew
│   ├── node_unsupported.go    # Stub for other platforms
│   ├── log.go                 # Setup log and command runner with timeouts
│   └── exec_*.go              # Shell shims and PATH refresh
├── ui/
│   ├── session.go             # Installer model, steps, phases
│   ├── backend_terminal.go    # macOS live terminal UI
│   ├── session_windows.go     # Windows window backend
│   ├── viewer_script_windows.go # PowerShell/WinForms window
│   ├── dialog_windows.go      # MessageBox fallback only
│   ├── session_darwin.go      # macOS backend selection
│   └── session_unsupported.go
├── i18n/                      # English source + per-language overrides
├── preview/                   # Developer UI sandbox
└── Makefile                   # Cross-compile targets

scripts/installer/             # Shell fallbacks (kept for CI / headless)
├── install.sh                 # Unix installer
├── install.ps1                # Windows PowerShell installer
└── install.bat                # Windows CMD wrapper

scripts/dev/                   # Development-only (for CLI contributors)
├── install-unix.sh
└── install-win.bat
```

The installer architecture, state model and design decisions are documented in
[`bootstrapper/README.md`](../../../bootstrapper/README.md).
