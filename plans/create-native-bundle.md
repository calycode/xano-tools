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

### Phase 1: Basic Bundling & Manifest Setup (Complete)
- [x] **Add `pkg` dependency**: Added to `@calycode/cli`.
- [x] **Configure bundling script**: Added `bundle` script to `package.json`.
- [x] **Implement `opencode` commands**: Added `xano opencode init` and `xano opencode serve`.
- [x] **Generate Manifest**: Implemented logic to create manifest files for macOS/Linux/Windows.
- [x] **Bundling**: Verified `pkg` creates executable binaries.
- [x] **Native Host Wrapper**: Implemented logic to generate wrapper scripts (`calycode-host.bat` / `calycode-host.sh`) that call the bundled executable with `native-host` arguments.
- [x] **Native Messaging Protocol**: Implemented `startNativeHost` function in the CLI to handle Chrome's stdin/stdout messaging protocol.
- [x] **Windows Registry**: Logic added to log the required registry key for Windows users.
- [x] **Bug Fixes**: Resolved bundling issues (undefined function error) by switching `registerOpencodeCommands` to async/await and potentially fixing cyclic dependencies or initialization order.

### Phase 2: Security & Resilience (Pending)
- [ ] **Binary Verification**: Implement SHA256 checksums.
- [ ] **Error Handling**: Improve robustness of server spawning.
- [ ] **Auto-Updates**: Check for new versions.

### Phase 3: Polish & Release (Pending)
- [ ] **CI Integration**: Automate `pnpm bundle` in GitHub Actions.
- [ ] **Documentation**: Update README with native usage instructions.

## Next Steps
1.  **Test the Full Flow**: Manually test the Windows binary with a mock Chrome extension or test script to verify `native-host` communication works as expected.
2.  **CI/CD**: Set up the GitHub Action to build and release these binaries automatically.
