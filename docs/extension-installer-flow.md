# Extension Installer Flow (Bootstrapper)

This document explains how the browser extension should guide users through installing the CalyCode CLI using the bootstrapper binaries.

## Goal

Provide a **download + run** flow with minimal friction:

1. Extension detects platform/architecture
2. Extension shows one-click download
3. User runs installer binary
4. Installer performs setup silently in steps
5. Extension verifies CLI/native host connectivity

## Platform Mapping

Use these release assets:

- Windows x64:
   - `https://github.com/calycode/xano-tools/releases/latest/download/calycode-installer-windows-x64.exe`
- macOS Intel (x64):
   - `https://github.com/calycode/xano-tools/releases/latest/download/calycode-installer-darwin-x64`
- macOS Apple Silicon (arm64):
   - `https://github.com/calycode/xano-tools/releases/latest/download/calycode-installer-darwin-arm64`

Optional checksum:

- `https://github.com/calycode/xano-tools/releases/latest/download/SHA256SUMS`

The release assets are also available under the:
- https://links.calycode.com/cli-installer-<platform>-<arch>

## Extension Detection Logic

Recommended selection order:

1. If platform is Windows: use Windows x64 installer.
2. If platform is macOS:
   - if architecture is `arm64`, use macOS arm64 installer
   - otherwise use macOS x64 installer
3. Otherwise (Linux/unknown): show shell-script fallback instructions.

Notes:

- On macOS in browser contexts where architecture is ambiguous, prefer arm64 only when explicitly detected.
- If architecture cannot be resolved, default to macOS x64 and provide a manual switch.

## User-Facing Copy (Suggested)

### Step 1: Download

"Download the CalyCode installer for your system."

### Step 2: Run

"Open the downloaded installer and follow the setup steps."

### Step 3: Return

"Come back here after installation. We'll verify the connection."

macOS note copy:

"If macOS blocks opening the file, right-click it and choose **Open**."

## What the Installer Does

The bootstrapper performs:

1. Node.js check/install (18+)
2. Global install of `@calycode/cli`
3. `caly-xano opencode init`
4. Final success/failure message

## Verification in Extension

After user returns, extension should:

1. Attempt native host `ping`
2. If `pong` succeeds, proceed
3. If not, show troubleshooting CTA:
   - rerun installer
   - open terminal and run `caly-xano opencode init`

## Fallback (No Bootstrapper)

For unsupported platforms or manual flow:

- Windows PowerShell: `irm https://links.calycode.com/install-cli-windows-ps1 | iex`
- macOS/Linux Bash: `curl -fsSL https://links.calycode.com/install-cli-unix | bash`
