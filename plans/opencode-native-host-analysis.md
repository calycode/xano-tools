# OpenCode Proxy Feature & Native Hosting Methods - Analysis Document

> **Date:** 2026-01-27
> **Status:** Planning / Analysis
> **Scope:** `packages/cli/src/commands/opencode/` and `packages/cli/scripts/`

---

## Executive Summary

The OpenCode integration provides a Chrome extension-to-CLI bridge using Chrome's Native Messaging protocol. When running `xano oc init` followed by starting the Chrome extension, the system works correctly with a silent/background connection (no terminal popups). The current implementation is functional but contains script duplication and redundancy that should be consolidated.

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [File Inventory & Status](#file-inventory--status)
3. [Working Flow Analysis](#working-flow-analysis)
4. [Unused & Redundant Files](#unused--redundant-files)
5. [Potential Issues & Culprits](#potential-issues--culprits)
6. [Installation Scripts Analysis](#installation-scripts-analysis)
7. [Recommendations](#recommendations)

---

## Current Architecture

### Overview

```
Chrome Extension
       │
       ▼ (Native Messaging Protocol - stdin/stdout binary)
┌──────────────────────────────────────────────────────────┐
│                   Native Host Manifest                    │
│     Location: ~/.calycode/com.calycode.cli.json          │
│     Points to: ~/.calycode/bin/calycode-host.bat/.sh     │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                   Wrapper Script                          │
│     Windows: calycode-host.bat                           │
│     Unix: calycode-host.sh                               │
│     Calls: xano opencode native-host                     │
└──────────────────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────────┐
│                   startNativeHost()                       │
│     Location: implementation.ts:174                       │
│     - Reads stdin (Chrome messages)                       │
│     - Spawns opencode-ai server when requested            │
│     - Sends responses via stdout                          │
└──────────────────────────────────────────────────────────┘
       │
       ▼ (spawns on 'start' message)
┌──────────────────────────────────────────────────────────┐
│                   OpenCode AI Server                      │
│     Package: opencode-ai@latest                           │
│     Port: 4096 (default)                                  │
│     CORS: Pre-configured for extensions                   │
└──────────────────────────────────────────────────────────┘
```

### Key Components

| Component            | File                | Purpose                                            |
| -------------------- | ------------------- | -------------------------------------------------- |
| Command Registration | `index.ts`          | Registers `opencode` (alias `oc`) with subcommands |
| Implementation       | `implementation.ts` | Core logic: setup, serve, native-host, proxy       |
| Host Constants       | `host-constants.ts` | Extension IDs, app info, manifest naming           |
| Bundled Entry        | `index-bundled.ts`  | SEA handling, double-click installer mode          |
| Standard Entry       | `index.ts` (root)   | Normal CLI startup with native-host bypass         |

---

## File Inventory & Status

### Source Files (`packages/cli/src/commands/opencode/`)

| File                | Lines | Status     | Purpose                                       |
| ------------------- | ----- | ---------- | --------------------------------------------- |
| `index.ts`          | 82    | **ACTIVE** | Command registration for `opencode` namespace |
| `implementation.ts` | 635   | **ACTIVE** | All business logic                            |

### Script Files (`packages/cli/scripts/`)

| File                    | Lines | Status               | Purpose                                        |
| ----------------------- | ----- | -------------------- | ---------------------------------------------- |
| `install-unix.sh`       | 53    | **DUPLICATE**        | Same as `dev/install-unix.sh`                  |
| `install-win.bat`       | 30    | **MINIMAL**          | Basic Windows install (no version check)       |
| `dev/install-unix.sh`   | 53    | **ACTIVE**           | Dev install for macOS/Linux                    |
| `dev/install-win.bat`   | 71    | **ACTIVE**           | Dev install for Windows (with version check)   |
| `installer/install.sh`  | 76    | **PRODUCTION-READY** | Full Unix installer with global npm install    |
| `installer/install.bat` | 78    | **PRODUCTION-READY** | Full Windows installer with global npm install |

---

## Working Flow Analysis

### What Works (`xano oc init`)

1. **Command Execution:**
   - User runs `xano oc init` (or `xano opencode init`)
   - Routes to `setupOpencode()` in `implementation.ts:453`

2. **Native Host Setup (Windows):**
   - Creates `~/.calycode/bin/calycode-host.bat` wrapper
   - Detects bundled vs dev mode (`caly.exe` or node + script path)
   - Creates manifest at `~/.calycode/com.calycode.cli.json`
   - Adds registry key `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.calycode.cli`

3. **Extension Connection:**
   - Chrome reads registry, finds manifest
   - Launches `calycode-host.bat` which runs `xano opencode native-host`
   - Enters `startNativeHost()` via early bypass in `index.ts:8`
   - No Commander parsing, no stdout pollution, clean binary protocol

4. **Message Handling:**
   - Listens on stdin for length-prefixed JSON messages
   - Responds on stdout with same protocol
   - Supports: `ping` (pong), `start` (spawn server), `stop` (kill server)

### Why No Terminal Window

The key is that Chrome launches the native host as a background process:

- The `.bat` wrapper uses `@echo off` (no command echo)
- The process runs as Chrome's child process, not a new console
- `stdio: 'ignore'` for the OpenCode server spawn prevents new windows

---

## Unused & Redundant Files

### Definitely Redundant

| File                      | Reason                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `scripts/install-unix.sh` | **Exact duplicate** of `scripts/dev/install-unix.sh`                                     |
| `scripts/install-win.bat` | **Less featured** than `scripts/installer/install.bat` and `scripts/dev/install-win.bat` |

### Potentially Unused Code

| Location                    | Code                        | Reason                                                                  |
| --------------------------- | --------------------------- | ----------------------------------------------------------------------- |
| `implementation.ts:55-90`   | `displayNativeHostBanner()` | Function defined but **commented out** on line 186                      |
| `implementation.ts:410-451` | `serveOpencode()`           | Duplicated in `serve/index.ts:61-68`, both work but fragmented exposure |

### Script Hierarchy Confusion

```
scripts/
├── install-unix.sh          # REMOVE - duplicate of dev version
├── install-win.bat          # REMOVE - superseded by installer/install.bat
├── dev/
│   ├── install-unix.sh      # KEEP for development
│   └── install-win.bat      # KEEP for development
└── installer/
    ├── install.sh           # KEEP - production installer (global npm install)
    └── install.bat          # KEEP - production installer (global npm install)
```

---

## Potential Issues & Culprits

### 1. Script Duplication Creates Maintenance Burden

**Issue:** Six installer scripts with varying levels of completeness.

**Risk:** Changes to one script may not propagate to others.

**Recommendation:** Consolidate to 2 scripts (one for each platform) or a unified cross-platform approach.

### 2. Version Check Inconsistency

| Script                    | Node Version Check         |
| ------------------------- | -------------------------- | --- | --------- |
| `dev/install-win.bat`     | Yes (regex `^v1[8-9] ^v2`) |
| `dev/install-unix.sh`     | Yes (numeric comparison)   |
| `installer/install.bat`   | No (just checks existence) |
| `installer/install.sh`    | Yes (regex `^v(18          | 19  | 2[0-9])`) |
| `scripts/install-win.bat` | No                         |

### 3. Global Install Approach Varies

| Script          | Install Method                                                  |
| --------------- | --------------------------------------------------------------- |
| `dev/*`         | `xano opencode init` (assumes xano is available)                |
| `installer/*`   | `npm install -g @calycode/cli@latest` then `xano opencode init` |
| Root `scripts/` | Mixed approaches                                                |

### 4. Unused Banner Function

```typescript
// implementation.ts:186
//displayNativeHostBanner(logger.getLogPath());
```

The banner was likely disabled because outputting to stderr (even for display purposes) could interfere with the Native Messaging protocol or confuse debugging.

### 5. Dual `serveOpencode` Exposure

The `serveOpencode` function can be accessed via:

- `xano opencode serve` (from `opencode/index.ts:22`)
- `xano serve opencode` (from `serve/index.ts:61`)

This is intentional for discoverability but could be documented better.

---

## Installation Scripts Analysis

### Current Scripts Comparison Matrix

| Feature            | `dev/win.bat` | `dev/unix.sh` | `installer/win.bat` | `installer/unix.sh` | Root `win.bat` | Root `unix.sh` |
| ------------------ | ------------- | ------------- | ------------------- | ------------------- | -------------- | -------------- |
| Node check         | Yes           | Yes           | No                  | Yes                 | No             | Yes            |
| Node install       | Winget        | Homebrew/apt  | Winget              | Homebrew/apt/dnf    | Winget         | Homebrew/apt   |
| Global CLI install | No            | No            | Yes                 | Yes                 | No             | No             |
| Uses npx           | Implicit      | Implicit      | No                  | No                  | No             | No             |
| Version regex      | v18-v2x       | v18+          | N/A                 | v18-v2x             | N/A            | v18+           |
| Pause on finish    | Yes           | No            | Yes                 | No                  | Yes            | No             |

### Differences Summary

**Development Scripts (`dev/`):**

- Assume CLI is already available via `xano` command
- Used when running from source/linked development environment

**Installer Scripts (`installer/`):**

- Install CLI globally via npm
- Designed for end-user distribution
- These are the ones suitable for `curl | bash` style installation

**Root Scripts:**

- **Redundant** - seem to be older versions or copies
- Should be removed or replaced with symlinks

---

## Recommendations

### Immediate Actions

1. **Remove duplicate scripts:**
   - Delete `scripts/install-unix.sh` (duplicate of dev version)
   - Delete `scripts/install-win.bat` (superseded by installer version)

2. **Document the two-tier approach:**
   - `dev/` - For developers working on the CLI itself
   - `installer/` - For end-user distribution

3. **Add consistent Node version checking** to `installer/install.bat`

### Long-term: Unified Installation Script

See separate document: [unified-installer-plan.md](./unified-installer-plan.md)

---

## Appendix: Key Code References

### Native Host Bypass (Critical for Clean Protocol)

```typescript
// packages/cli/src/index.ts:7-9
const args = process.argv;
if (args.includes('opencode') && args.includes('native-host')) {
   startNativeHost();
}
```

### Message Protocol Implementation

```typescript
// implementation.ts:92-100
function sendMessage(message: any) {
   const buffer = Buffer.from(JSON.stringify(message));
   const header = Buffer.alloc(4);
   header.writeUInt32LE(buffer.length, 0);
   process.stdout.write(header);
   process.stdout.write(buffer);
}
```

### Windows Registry Setup

```typescript
// implementation.ts:574-577
const regKey = `HKEY_CURRENT_USER\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_APP_INFO.reverseAppId}`;
const regArgs = ['add', regKey, '/ve', '/t', 'REG_SZ', '/d', manifestPath, '/f'];
```

### Extension ID Configuration

```typescript
// host-constants.ts:11-14
allowedExtensionIds: [
   'hadkkdmpcmllbkfopioopcmeapjchpbm', // Production (Chrome Web Store)
   'lnhipaeaeiegnlokhokfokndgadkohfe', // Development (unpacked)
];
```
