**CalyCode Native Host CLI Plan**

Bundle your existing Node.js CLI into platform-specific standalone executables using `pkg` or `nexe`. This creates self-contained binaries (~30-50MB) that users download and run without needing Node/npm installed.

## Core Command: `xano opencode init`

**What it does** (single execution):
- Detects OS (macOS/Windows/Linux).
- Uses internal `npx opencode-ai@latest serve --port 4096` to fetch/run latest OpenCode server (no user installs needed).
- Downloads/caches OpenCode binary to `~/.calycode/bin/` for reliability.
- Generates native messaging host manifest JSON with your extension ID.
- Installs manifest to Chrome location:
  - macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/calycode.json`
  - Windows: Registry key `HKCU\Software\Mozilla\NativeMessagingHosts\calycode`
  - Linux: `~/.config/google-chrome/NativeMessagingHosts/calycode.json`

## Native Host Wrapper

Thin executable/script (also bundled):
```
Extension → JSON message → Native Host → `npx opencode-ai@latest serve --port 4096`
                           ↑
                     Returns: {"status": "running", "url": "http://localhost:4096"}
```

**Checks**: Port active? Server healthy? Restart if needed.

## User Flow

```
1. Download calycode-x64.exe / calycode-macos (one binary)
2. Run: `./calycode setup-opencode`
3. ✅ OpenCode server ready, native host registered
4. Extension auto-connects via chrome.runtime.sendNativeMessage
```

## Extended Plan: Create Native Bundle

### Additional Security & Trust Measures
- **Binary Verification**: Implement SHA256 checksums for downloaded OpenCode binaries. Fetch checksums from a trusted source (e.g., GitHub releases API) and verify before caching.
- **Certificate Pinning**: Pin SSL certificates for all network requests to prevent MITM attacks.
- **Permission Minimization**: Native host runs with minimal privileges; avoid admin/sudo for manifest installation where possible (use user directories).
- **Sandboxing**: Consider containerizing the native host process for additional isolation.

### Error Handling & Resilience
- **Graceful Failures**: If OpenCode server fails to start, provide clear error messages and fallback options (e.g., manual npx command).
- **Port Conflicts**: Check port 4096 availability before spawning; offer port selection if occupied.
- **Network Issues**: Handle download failures with retries and offline mode detection.
- **Manifest Installation**: Detect and handle permission errors during manifest setup (e.g., prompt for admin on Windows/Linux).
- **Health Checks**: Implement periodic server health pings in native host; auto-restart on failures.

### Updates & Maintenance
- **Auto-Updates**: Check for new OpenCode versions on startup; prompt user to update cached binaries.
- **Version Pinning**: Allow users to pin specific OpenCode versions via config for stability.
- **Cache Management**: Implement cache cleanup for old binaries; limit cache size to prevent disk bloat.

### User Experience Enhancements
- **Progress Indicators**: Show download/installation progress with spinners/logs during setup.
- **Uninstall Command**: Add `xano opencode uninstall` to remove manifests, cache, and binaries.
- **Status Command**: `xano opencode status` to check server health, version, and native host registration.
- **Logging**: Enable debug logs to `~/.calycode/logs/` for troubleshooting.

### Platform-Specific Considerations
- **macOS**: Handle SIP (System Integrity Protection) for manifest locations; consider notarization for binaries.
- **Windows**: Use PowerShell for registry operations if needed; handle UAC prompts gracefully.
- **Linux**: Support multiple browsers (Chrome/Chromium/Firefox); detect distro-specific paths.
- **Cross-Platform Testing**: Test on multiple OS versions; use CI for automated builds.

### Development & Deployment
- **Build Pipeline**: Integrate bundling into CI/CD; automate binary generation and checksum creation.
- **Dependency Auditing**: Scan bundled dependencies for vulnerabilities before releases.
- **Documentation**: Update CLI help and README with native bundle instructions; include troubleshooting guide.
- **Beta Testing**: Release alpha binaries for user feedback before stable release.

### Monorepo Integration
- **Bundle Source**: Build the native executable from `packages/cli/` using `pkg` (configured in `packages/cli/package.json`). Add bundling scripts to root `package.json` (e.g., `pnpm build:bundle` that runs `turbo run bundle`).
- **Package Structure**: 
  - Output binaries to `dist/bin/` (e.g., `calycode-win.exe`, `calycode-macos`, `calycode-linux`).
  - Include native host wrapper as a bundled script/asset within the executable.
  - Use monorepo's `schemas/` for manifest templates; generate manifests dynamically via `@calycode/core`.
- **Workflow**: 
  - `pnpm build:bundle` creates cross-platform binaries.
  - Release via GitHub Actions to downloads; extension calls binary via `chrome.runtime.sendNativeMessage("calycode", {...})` to spawn server on port 4096.
  - No UI dependencies; keep binary focused on CLI + native messaging bridge.

### Timeline Extension
- **Phase 1 (1 day)**: Implement basic bundling and manifest setup.
- **Phase 2 (1-2 days)**: Add security, error handling, and updates.
- **Phase 3 (1 day)**: Testing, documentation, and polish.

This ensures robust, secure, and user-friendly native integration while maintaining simplicity.