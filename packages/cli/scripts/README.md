# CalyCode CLI Installation Scripts

This directory contains installation scripts for the CalyCode CLI and Chrome Native Messaging Host.

## Directory Structure

```
scripts/
├── installer/          # Production installers (for end-users)
│   ├── install.sh      # Unix (macOS, Linux) installer
│   ├── install.ps1     # Windows PowerShell installer
│   └── install.bat     # Windows batch wrapper (launches PowerShell)
├── dev/                # Development scripts (for CLI developers)
│   ├── install-unix.sh # Unix development setup
│   └── install-win.bat # Windows development setup
└── README.md           # This file
```

## For End-Users

### One-liner Installation

**macOS / Linux:**

```bash
curl -fsSL https://get.calycode.com/install.sh | bash
```

**Windows (PowerShell):**

```powershell
irm https://get.calycode.com/install.ps1 | iex
```

**Windows (CMD):**
Download and run `install.bat`, or:

```cmd
curl -fsSL https://get.calycode.com/install.bat -o install.bat && install.bat
```

### What the Installer Does

1. Checks for Node.js v18+ (installs if missing)
2. Installs `@calycode/cli` globally via npm
3. Configures Chrome Native Messaging Host
4. Verifies the installation

### Installation Options

**Unix (`install.sh`):**

```bash
# Install specific version
curl -fsSL https://get.calycode.com/install.sh | bash -s -- --version 1.2.3

# Skip native host configuration
curl -fsSL https://get.calycode.com/install.sh | bash -s -- --skip-native-host

# Uninstall
curl -fsSL https://get.calycode.com/install.sh | bash -s -- --uninstall
```

**Windows (`install.ps1`):**

```powershell
# Install specific version
.\install.ps1 -Version 1.2.3

# Skip native host configuration
.\install.ps1 -SkipNativeHost

# Uninstall
.\install.ps1 -Uninstall
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

- `https://get.calycode.com/install.sh`
- `https://get.calycode.com/install.ps1`
- `https://get.calycode.com/install.bat`

These URLs should be configured as a GitHub Pages site or CDN pointing to the `scripts/installer/` directory.

## Troubleshooting

### "xano command not found" after installation

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

4. Re-run: `xano opencode init`
