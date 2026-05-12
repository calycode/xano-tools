# CalyCode CLI Installation Scripts

This directory contains installation scripts for the CalyCode CLI and Chrome Native Messaging Host.

## Directory Structure

```
scripts/
├── installer/                 # Production installers (for end-users)
│   ├── install.sh             # Existing Unix installer (kept for compatibility)
│   ├── install-unix.sh        # Explicit Unix/macOS entrypoint -> install.sh
│   ├── install.ps1            # Existing Windows PowerShell installer (kept)
│   ├── install-windows.ps1    # Explicit Windows PowerShell entrypoint -> install.ps1
│   ├── install.bat            # Existing Windows CMD wrapper (kept)
│   └── install-windows.bat    # Explicit Windows CMD entrypoint -> install.bat
├── dev/                       # Development scripts (for CLI developers)
│   ├── install-unix.sh        # Unix development setup
│   └── install-win.bat        # Windows development setup
└── README.md                  # This file
```

## For End-Users

### One-line Installation Commands (Recommended for Extension)

Use these per detected user agent/shell.

**Unix/macOS (Bash):**

```bash
curl -fsSL https://links.calycode.com/install-cli-unix | bash
```

**Unix/macOS (legacy URL kept):**

```bash
curl -fsSL https://links.calycode.com/install-cli | bash
```

**Windows (PowerShell):**

```powershell
irm https://links.calycode.com/install-cli-windows-ps1 | iex
```

**Windows (PowerShell, legacy URL kept):**

```powershell
irm https://links.calycode.com/install-cli.ps1 | iex
```

**Windows (CMD):**

```cmd
curl -fsSL https://links.calycode.com/install-cli-windows-bat -o install-windows.bat && install-windows.bat
```

**Windows (CMD, legacy URL kept):**

```cmd
curl -fsSL https://links.calycode.com/install-cli.bat -o install.bat && install.bat
```

### What the Installer Does

1. Checks for Node.js v18+ (installs if missing)
2. Installs `@calycode/cli` globally via npm
3. Configures Chrome Native Messaging Host
4. Verifies the installation

### Installation Options

**Unix (`install-unix.sh` or `install.sh`):**

```bash
# Install specific version
curl -fsSL https://links.calycode.com/install-cli-unix | bash -s -- --version 1.2.3

# Skip native host configuration
curl -fsSL https://links.calycode.com/install-cli-unix | bash -s -- --skip-native-host

# Uninstall
curl -fsSL https://links.calycode.com/install-cli-unix | bash -s -- --uninstall
```

**Windows PowerShell (`install-windows.ps1` or `install.ps1`):**

```powershell
# Install latest
irm https://links.calycode.com/install-cli-windows-ps1 | iex

# Local script usage: install specific version
.\install-windows.ps1 -Version 1.2.3

# Skip native host configuration
.\install-windows.ps1 -SkipNativeHost

# Uninstall
.\install-windows.ps1 -Uninstall
```

### Environment Variables (Unix)

`install.sh` / `install-unix.sh` supports:

- `CALYCODE_VERSION=1.2.3` - install a specific version
- `CALYCODE_SKIP_NATIVE_HOST=1` - skip `caly-xano opencode init`

Example:

```bash
CALYCODE_VERSION=1.2.3 CALYCODE_SKIP_NATIVE_HOST=1 curl -fsSL https://links.calycode.com/install-cli-unix | bash
```

## For Developers

The `dev/` scripts are for developers working on the CLI itself. They assume:

- The repository has been cloned
- Dependencies have been installed (`pnpm install`)
- The CLI has been built (`pnpm build`) or linked (`npm link`)

### Development Setup

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Build the CLI: `pnpm build`
4. Link for local use: `cd packages/cli && npm link`
5. Run the dev installer:
   - **macOS/Linux:** `./scripts/dev/install-unix.sh`
   - **Windows:** `scripts\dev\install-win.bat`

### Differences from Production Installer

| Feature                | Production          | Development               |
| ---------------------- | ------------------- | ------------------------- |
| Installs CLI via npm   | Yes                 | No (assumes linked/built) |
| Checks Node.js         | Yes                 | Yes                       |
| Installs Node.js       | Yes                 | Yes                       |
| Configures native host | Yes                 | Yes                       |
| Version selection      | Yes (`--version`)   | No                        |
| Uninstall support      | Yes (`--uninstall`) | No                        |

## Hosting

The production installers are hosted at:

- Legacy URLs (kept):
  - `https://links.calycode.com/install-cli` (Unix)
  - `https://links.calycode.com/install-cli.ps1` (Windows PowerShell)
  - `https://links.calycode.com/install-cli.bat` (Windows CMD)
- Explicit OS URLs (recommended):
  - `https://links.calycode.com/install-cli-unix` -> `installer/install-unix.sh`
  - `https://links.calycode.com/install-cli-windows-ps1` -> `installer/install-windows.ps1`
  - `https://links.calycode.com/install-cli-windows-bat` -> `installer/install-windows.bat`

These URLs should be configured as a GitHub Pages site or CDN pointing to the `scripts/installer/` directory.

## Extension Mapping (User Agent -> Command)

Suggested mapping for extension-side install prompts:

- `win32` + PowerShell available -> `irm https://links.calycode.com/install-cli-windows-ps1 | iex`
- `win32` fallback -> `curl -fsSL https://links.calycode.com/install-cli-windows-bat -o install-windows.bat && install-windows.bat`
- `darwin` -> `curl -fsSL https://links.calycode.com/install-cli-unix | bash`
- `linux` -> `curl -fsSL https://links.calycode.com/install-cli-unix | bash`

## Troubleshooting

### "caly-xano command not found" after installation

The PATH may not have been updated in your current terminal session.

- **Solution:** Close and reopen your terminal, or run `source ~/.bashrc` (Unix) / restart PowerShell (Windows)

### Node.js installation fails

- **Windows:** Ensure Winget or Chocolatey is available
- **macOS:** Ensure Homebrew is installed or can be installed
- **Linux:** Supported distributions: Debian/Ubuntu, RHEL/Fedora, Arch

### Native host not connecting

1. Verify the manifest was created:
   - **macOS:** `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.calycode.cli.json`
   - **Linux:** `~/.config/google-chrome/NativeMessagingHosts/com.calycode.cli.json`
   - **Windows:** `%USERPROFILE%\.calycode\com.calycode.cli.json`

2. Reload the Chrome extension

3. Check logs at `~/.calycode/logs/native-host.log`

4. Re-run: `caly-xano opencode init`
