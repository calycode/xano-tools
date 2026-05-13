# Native Host Security Hardening — Implementation Plan

> **Date:** 2026-05-13
> **Status:** Approved / Ready for Implementation
> **Scope:** `packages/cli/src/commands/opencode/`, `packages/cli/src/utils/host-constants.ts`, `packages/cli/scripts/`
> **Based on:** Security review & revalidation of native host feature

---

## Summary of Decisions

| #   | Finding                                 | Severity | Decision                                                                 |
| --- | --------------------------------------- | -------- | ------------------------------------------------------------------------ |
| 1   | No max native message size → memory DoS | HIGH     | Cap at **1MB**, reject oversized frames before buffering                 |
| 2   | Unvalidated CORS origins from extension | HIGH     | Filter `*`, accept validated origins, cap at **10 origins**              |
| 3   | Arbitrary process kill via stop/restart | HIGH     | Restrict to **port range 32 slots**, add **PID tracking**                |
| 4   | Windows `shell: true` on all spawns     | MEDIUM   | Scope `shell: true` to **npx only**                                      |
| 5   | Extension discovery too permissive      | MEDIUM   | Bake **public key at build time**, remove **dev extension ID** from prod |
| 6   | Logger raw payload + no rotation        | MEDIUM   | **Disable by default**, gate behind `CALY_OC_NATIVE_HOST_DEBUG=1`        |
| 7   | Uninstall only removes Chrome paths     | LOW      | Add cleanup for Brave, Edge, Chromium manifests + registry keys          |
| 8   | Supply chain (mutable sources)          | LOW      | Keep runtime install for OpenCode; templates/skills in your control      |
| 9   | Installer remote script chains          | LOW      | Accepted risk; pinning approach documented for future                    |

---

## 1. Native Message Size Cap (HIGH)

**File:** `packages/cli/src/commands/opencode/implementation.ts`
**Region:** `startNativeHost()` — stdin message parser (lines ~975–1008)

### Current State

```typescript
// Line 985: reads UInt32LE with no upper bound check
expectedLength = inputBuffer.readUInt32LE(0);
// ... accumulates data until inputBuffer.length >= expectedLength
inputBuffer = Buffer.concat([inputBuffer, chunk]);
```

A 32-bit unsigned integer can encode up to ~4GB. An attacker writing to stdin can exhaust memory.

### Changes

**a) Add constant:**

```typescript
// Near other constants (after line 16)
const MAX_NATIVE_MESSAGE_SIZE = 1 * 1024 * 1024; // 1 MB
```

**b) Insert size check immediately after reading the length prefix (after line 985):**

```typescript
expectedLength = inputBuffer.readUInt32LE(0);
inputBuffer = inputBuffer.subarray(4);

// NEW: reject oversized messages before any buffering
if (expectedLength > MAX_NATIVE_MESSAGE_SIZE) {
   logger.error('Message exceeds max size', {
      size: expectedLength,
      max: MAX_NATIVE_MESSAGE_SIZE,
   });
   // Drain the oversized message from the buffer to recover protocol sync
   // Reset parser state
   expectedLength = null;
   inputBuffer = Buffer.alloc(0);
   break; // Stop processing this chunk, wait for next valid frame
}
```

**c) Guard `Buffer.concat` accumulation (line 980):**
Before accumulating, check that the new total won't exceed the max:

```typescript
process.stdin.on('data', (chunk) => {
   // Prevent unbounded accumulation even before length prefix is read
   if (inputBuffer.length + chunk.length > MAX_NATIVE_MESSAGE_SIZE + 4) {
      logger.error('Input buffer exceeds max size, resetting');
      inputBuffer = Buffer.alloc(0);
      expectedLength = null;
      return;
   }
   inputBuffer = Buffer.concat([inputBuffer, chunk]);
   // ... rest of parser
});
```

### Verification

- Send a message with length prefix `0xFFFFFFFF` → host rejects, logs error, stays alive
- Send a valid message after an oversized one → host recovers correctly

---

## 2. CORS Origin Validation (HIGH)

**File:** `packages/cli/src/commands/opencode/implementation.ts`
**Region:** `handleMessage()` (lines ~895–937) and `getCorsArgs()` (lines ~537–539)

### Current State

```typescript
// Line 903: only checks Array.isArray(), no per-origin validation
const origins = Array.isArray(msg.origins) ? msg.origins : [];
// ...
// Line 539: origins passed directly to --cors args
return Array.from(origins).flatMap((origin) => ['--cors', origin]);
```

The extension can inject `"*"` or arbitrary origins.

### Changes

**a) Add origin validation function (new, near line 537):**

```typescript
const MAX_CORS_ORIGINS = 10;

// Regex for chrome-extension://<32-char-id>
const CHROME_EXTENSION_ORIGIN_REGEX = /^chrome-extension:\/\/[a-p]{32}$/;
// Reject wildcard patterns
const DANGEROUS_ORIGIN_PATTERNS = [
   /^\*$/,
   /^https?:\/\/\*/, // https://*
   /^chrome-extension:\/\/\*/, // chrome-extension://*
];

function isValidCorsOrigin(origin: string, knownExtensionIds: string[]): boolean {
   // Reject dangerous wildcard patterns
   for (const pattern of DANGEROUS_ORIGIN_PATTERNS) {
      if (pattern.test(origin)) {
         return false;
      }
   }

   // Allow chrome-extension:// origins only for known extension IDs
   if (origin.startsWith('chrome-extension://')) {
      return (
         CHROME_EXTENSION_ORIGIN_REGEX.test(origin) &&
         knownExtensionIds.some((id) => origin === `chrome-extension://${id}`)
      );
   }

   // Allow https:// origins (arbitrary host, but not wildcards)
   if (origin.startsWith('https://')) {
      // Must have a non-empty host after https://
      const hostPart = origin.slice('https://'.length);
      if (hostPart.length === 0 || hostPart === '*') {
         return false;
      }
      return true;
   }

   // Reject everything else (http://, file://, custom schemes, etc.)
   return false;
}

function filterAndValidateOrigins(rawOrigins: unknown, knownExtensionIds: string[]): string[] {
   if (!Array.isArray(rawOrigins)) {
      return [];
   }

   const valid: string[] = [];
   for (const origin of rawOrigins) {
      if (typeof origin !== 'string') continue;
      const trimmed = origin.trim();
      if (!trimmed) continue;

      if (!isValidCorsOrigin(trimmed, knownExtensionIds)) {
         // Log rejection but don't fail — silently drop invalid origins
         continue;
      }

      // Deduplicate
      if (!valid.includes(trimmed)) {
         valid.push(trimmed);
      }

      // Cap at MAX_CORS_ORIGINS
      if (valid.length >= MAX_CORS_ORIGINS) break;
   }

   return valid;
}
```

**b) Use validated origins in `handleMessage()` (around line 903):**

```typescript
// Before (line 903):
const origins = Array.isArray(msg.origins) ? msg.origins : [];

// After:
const knownIds = resolveAllowedExtensionIds().ids;
const origins = filterAndValidateOrigins(msg.origins, knownIds);
```

**c) Also validate `extraOrigins` in `getCorsArgs()` (line 537–539):**
The `getCorsArgs` function receives `extraOrigins` from two callers:

- `launchOpencodeServer` (static server start) — these come from the static `getAllowedCorsOrigins()`, already safe
- Native host `startServer` (line 803) — these are the extension-provided origins

Since validation now happens in `handleMessage()` before calling `startServer`, the `getCorsArgs` function itself doesn't need changes. But for defense-in-depth, consider adding validation there too.

### Verification

- `msg.origins = ["*"]` → rejected, not passed to `--cors`
- `msg.origins = ["https://*.evil.com"]` → rejected
- `msg.origins = ["https://my-custom-xano.example.com"]` → accepted
- `msg.origins = ["chrome-extension://hadkkdmpcmllbkfopioopcmeapjchpbm"]` → accepted (production ID)
- 15 valid origins → only first 10 accepted

---

## 3. Port Kill Scope — Range + PID Tracking (HIGH)

**Files:**

- `packages/cli/src/commands/opencode/implementation.ts` — `startNativeHost()`, `killProcessOnPort()`
- New: `packages/cli/src/commands/opencode/native-host/port-manager.ts` (optional, or inline)

### Current State

- Extension can request `start`/`stop`/`restart` on ANY port 1–65535
- `killProcessOnPort()` kills whatever PID it finds on that port — no ownership check
- No tracking of which PIDs the host spawned

### Changes

**a) Add constants:**

```typescript
const NATIVE_HOST_PORT_RANGE_START = 4096;
const NATIVE_HOST_PORT_RANGE_SIZE = 32; // 4096–4127
const NATIVE_HOST_PORT_RANGE_END = NATIVE_HOST_PORT_RANGE_START + NATIVE_HOST_PORT_RANGE_SIZE - 1;
```

**b) Add managed state to `startNativeHost()` scope (near line 724):**

```typescript
let serverProc: ReturnType<typeof spawn> | null = null;

// NEW: managed session tracking
interface ManagedSession {
   port: number;
   proc: ReturnType<typeof spawn>;
   pid: number;
   startedAt: number;
}
const managedSessions = new Map<number, ManagedSession>(); // port → session
const managedPids = new Set<number>(); // for quick PID ownership check
```

**c) Add port validation function:**

```typescript
function validateNativeHostPort(port: number): void {
   validatePort(port); // existing 1–65535 check
   if (port < NATIVE_HOST_PORT_RANGE_START || port > NATIVE_HOST_PORT_RANGE_END) {
      throw new Error(
         `Port ${port} is outside the allowed native host range ` +
            `(${NATIVE_HOST_PORT_RANGE_START}–${NATIVE_HOST_PORT_RANGE_END})`,
      );
   }
}
```

**d) Use `validateNativeHostPort` in message handlers (lines 902, 908, 913):**

```typescript
// Before:
const port = msg.port ? parseInt(msg.port, 10) : 4096;

// After:
const rawPort = msg.port ? parseInt(msg.port, 10) : 4096;
try {
   validateNativeHostPort(rawPort);
} catch (e) {
   logger.error('Invalid port in message', { port: rawPort, error: e });
   sendMessage({ status: 'error', message: `Invalid port: ${rawPort}` });
   return;
}
const port = rawPort;
```

**e) Track spawned sessions in `startServer()` (around line 808):**
When a server process is spawned:

```typescript
serverProc = launched.proc;

// NEW: track managed session
if (launched.proc.pid) {
   const session: ManagedSession = {
      port,
      proc: launched.proc,
      pid: launched.proc.pid,
      startedAt: Date.now(),
   };
   managedSessions.set(port, session);
   managedPids.add(launched.proc.pid);
}

serverProc.on('exit', (code) => {
   logger.log(`Server process exited with code ${code}`);
   sendMessage({ status: 'stopped', code });
   serverProc = null;
   // NEW: clean up tracking
   const session = managedSessions.get(port);
   if (session && session.pid) {
      managedPids.delete(session.pid);
   }
   managedSessions.delete(port);
});
```

**f) Constrain `killProcessOnPort()` to only kill managed PIDs:**

Option A — modify `killProcessOnPort` to accept a `Set<number>` of allowed PIDs:

```typescript
function killProcessOnPort(
   port: number,
   allowedPids: Set<number>,
   logger?: { log: ...; error: ... },
): boolean {
   // ... validatePort ...
   // ... find PIDs on port ...
   // NEW: only kill PIDs in allowedPids set
   for (const pid of pidsToKill) {
      if (!allowedPids.has(parseInt(pid, 10))) {
         logInfo(`Skipping non-managed PID ${pid} on port ${port}`);
         continue;
      }
      // kill it
   }
}
```

Option B — simplify: don't scan ports at all for `stop`. Just kill the tracked session:

```typescript
// In stop handler (line 912-929):
} else if (msg.type === 'stop') {
   // NEW: only kill managed sessions
   const session = managedSessions.get(port);
   if (session) {
      logger.log('Stopping managed session', { port, pid: session.pid });
      session.proc.kill();
      managedPids.delete(session.pid);
      managedSessions.delete(port);
      sendMessage({ status: 'stopped', message: `Server on port ${port} stopped` });
   } else {
      sendMessage({ status: 'error', message: `No managed server on port ${port}` });
   }
}
```

Option B is **strongly preferred** — it eliminates the `killProcessOnPort` scanning entirely for stop operations. The `killProcessOnPort` function then only serves as an orphan cleanup during `restart` (where we lost the PID reference). For restart cleanup, pass `managedPids` as the allowed set.

**g) Update `cleanup()` (line 940) to kill all managed sessions:**

```typescript
const cleanup = (reason: string, port?: number) => {
   logger.log(`Cleanup triggered: ${reason}`);
   for (const [sessionPort, session] of managedSessions) {
      logger.log(`Killing managed session on port ${sessionPort}`);
      session.proc.kill();
      if (session.pid) managedPids.delete(session.pid);
   }
   managedSessions.clear();
   process.exit(0);
};
```

### Verification

- Extension sends `{ type: "stop", port: 3306 }` → rejected (outside range 4096–4127)
- Extension sends `{ type: "stop", port: 4100 }` but no session on 4100 → error, nothing killed
- Extension sends `{ type: "stop", port: 4100 }` with active session → kills only that PID
- MySQL on port 3306 unaffected regardless of extension messages

---

## 4. Windows `shell: true` — Scope to npx Only (MEDIUM)

**File:** `packages/cli/src/commands/opencode/implementation.ts`
**Region:** `getSpawnOptions()` (lines 274–288)

### Current State

```typescript
// Line 281-284:
const isWindows = process.platform === 'win32';
return {
   stdio,
   shell: isWindows, // Applied to ALL spawns on Windows
   cwd,
   env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
};
```

### Why It's There

The comment at line 279: "On Windows, npx is a batch file and requires shell: true." This is correct for `npx.cmd`. But it's applied unconditionally to all spawn sources (managed binary, global binary, npx).

### Changes

**a) Make `getSpawnOptions` take a `needsShell` parameter:**

```typescript
function getSpawnOptions(
   stdio: 'inherit' | 'pipe' | 'ignore' = 'inherit',
   extraEnv?: Record<string, string>,
   cwd?: string,
   needsShell: boolean = false, // NEW parameter
) {
   return {
      stdio,
      shell: needsShell, // Only when explicitly requested
      cwd,
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
   };
}
```

**b) All callers must pass `needsShell` based on the spawn plan source:**

```typescript
// In proxyOpencode (line 571):
const needsShell = process.platform === 'win32' && launchPlan.source === 'npx';
const proc = spawn(launchPlan.command, launchPlan.args, {
   ...getSpawnOptions('inherit', { OPENCODE_CONFIG_DIR: configDir }, workingDir, needsShell),
});

// In launchOpencodeServer (line 258):
const needsShell = process.platform === 'win32' && plan.source === 'npx';
const proc = spawn(plan.command, plan.args, {
   ...getSpawnOptions(stdio, { OPENCODE_CONFIG_DIR: configDir }, workingDir, needsShell),
   detached: detach,
});

// In native host startServer (line 802):
// Already indirect via launchOpencodeServer, so covered above.
```

**c) Alternative — compute `needsShell` once, tie it to the spawn plan:**
Add a `needsShell: boolean` field to `OpencodeSpawnPlan`:

```typescript
interface OpencodeSpawnPlan {
   command: string;
   args: string[];
   source: 'env' | 'managed' | 'global' | 'npx';
   displayCommand: string;
   needsShell: boolean; // NEW
}
```

Set it in `buildOpencodeSpawnPlan()`:

```typescript
return {
   command: explicitBin, // or managedBin, globalOpencode
   args: opencodeArgs,
   source: 'env', // or 'managed', 'global'
   displayCommand: ...,
   needsShell: false, // Direct binary, no shell needed
};

// For npx fallback:
return {
   command: 'npx',
   args: npxArgs,
   source: 'npx',
   displayCommand: ...,
   needsShell: process.platform === 'win32', // Only npx needs shell on Windows
};
```

Then callers simply use `plan.needsShell`. This is cleaner.

### Verification

- Windows: OpenCode started via managed binary → no `cmd.exe` wrapping, direct process
- Windows: OpenCode started via npx fallback → `cmd.exe` wrapping (required for `.cmd` batch file)
- Unix: All paths unchanged (were already `shell: false`)

---

## 5. Extension Discovery — Public Key + Remove Dev ID (MEDIUM)

**Files:**

- `packages/cli/src/utils/host-constants.ts`
- `packages/cli/src/commands/opencode/native-host/discovery.ts`

### Changes

**a) Remove dev extension ID from `allowedExtensionIds` (host-constants.ts, lines 30–33):**

```typescript
// Before:
allowedExtensionIds: [
   'hadkkdmpcmllbkfopioopcmeapjchpbm', // Production (Chrome Web Store)
   'lnhipaeaeiegnlokhokfokndgadkohfe', // Development (unpacked)
],

// After:
allowedExtensionIds: [
   'hadkkdmpcmllbkfopioopcmeapjchpbm', // Production (Chrome Web Store)
],
```

**b) Add production public key to build-time defaults (discovery.ts, lines 9–20):**

```typescript
const BUILD_OC_DEFAULTS = {
   // ... existing ...
   extPublicKeyB64: process.env.CALY_BUILD_OC_EXT_PUBLIC_KEY_B64,
   // ...
};
```

The actual public key value should be set via the build pipeline environment variable `CALY_BUILD_OC_EXT_PUBLIC_KEY_B64`. To extract it: the public key is embedded in the Chrome Web Store extension package (`.crx`) and can be extracted from `manifest.json`'s `key` field after publishing.

**c) Set default discovery mode to `strict` (host-constants.ts, line 42):**

```typescript
// Before:
mode: 'balanced',

// After:
mode: 'strict',
```

With `strict` mode AND a baked-in public key, the discovery will:

1. Find extensions matching the name
2. Require ≥ 2 trust signals (author, homepage, update_url, key match)
3. **Reject any extension whose ID doesn't match the ID derived from the baked-in public key** (line 463–465)

This means: only the extension signed with your private key will be accepted, regardless of what other extensions claim about their name or author.

**d) Option: conditional dev ID include via build flag:**
For local development, add a guard so the dev ID is only included in non-production builds:

```typescript
// In host-constants.ts, replace the hardcoded array with a function:
function getAllowedExtensionIds(): string[] {
   const prodIds = ['hadkkdmpcmllbkfopioopcmeapjchpbm'];
   const includeDev = process.env.CALY_OC_INCLUDE_DEV_EXT === '1';
   if (includeDev) {
      return [...prodIds, 'lnhipaeaeiegnlokhokfokndgadkohfe'];
   }
   return prodIds;
}

export const HOST_APP_INFO: HostAppInfo = {
   // ...
   allowedExtensionIds: getAllowedExtensionIds(),
   // ...
};
```

### Verification

- Run `caly-xano oc init` with public key set → only production extension ID accepted
- Load unpacked dev extension → not accepted (unless `CALY_OC_INCLUDE_DEV_EXT=1`)
- Malicious extension with same name but different key → rejected by strict mode + public key check

---

## 6. Logger — Disable by Default (MEDIUM)

**File:** `packages/cli/src/commands/opencode/implementation.ts`
**Region:** `NativeHostLogger` class (lines 639–708)

### Changes

**a) Add debug gate to `NativeHostLogger`:**

```typescript
class NativeHostLogger {
   private logPath: string;
   private logDir: string;
   private initialized: boolean = false;
   private enabled: boolean; // NEW

   constructor() {
      // NEW: only enable if debug env var is set
      this.enabled = process.env.CALY_OC_NATIVE_HOST_DEBUG === '1';
      const homeDir = os.homedir();
      this.logDir = path.join(homeDir, '.calycode', 'logs');
      this.logPath = path.join(this.logDir, 'native-host.log');
      if (this.enabled) {
         this.ensureLogDir();
      }
   }
```

**b) Add early return in `log()` and `error()` when disabled:**

```typescript
log(msg: string, data?: any) {
   if (!this.enabled) return; // NEW
   // ... existing logging logic
}

error(msg: string, err?: any) {
   if (!this.enabled) return; // NEW
   // ... existing logging logic
}
```

**c) Add log rotation (when enabled):**
Check file size on each write; if exceeds a threshold (e.g., 5MB), rotate:

```typescript
private readonly MAX_LOG_SIZE = 5 * 1024 * 1024; // 5 MB
private readonly MAX_LOG_FILES = 3;

private rotateIfNeeded() {
   try {
      if (!fs.existsSync(this.logPath)) return;
      const stat = fs.statSync(this.logPath);
      if (stat.size < this.MAX_LOG_SIZE) return;

      for (let i = this.MAX_LOG_FILES - 1; i >= 1; i--) {
         const oldPath = `${this.logPath}.${i}`;
         const newPath = `${this.logPath}.${i + 1}`;
         if (fs.existsSync(oldPath)) {
            if (i === this.MAX_LOG_FILES - 1) {
               fs.unlinkSync(newPath); // Remove oldest
            } else {
               fs.renameSync(oldPath, newPath);
            }
         }
      }
      fs.renameSync(this.logPath, `${this.logPath}.1`);
   } catch {
      // Rotation failure is non-critical
   }
}
```

**d) Redact sensitive fields from logged messages:**

```typescript
// In handleMessage, before logging:
const sanitizedMsg = { ...msg };
// Redact potentially sensitive fields
for (const key of ['token', 'apiKey', 'secret', 'password', 'authorization']) {
   if (sanitizedMsg[key]) sanitizedMsg[key] = '[REDACTED]';
}
logger.log('Received message', sanitizedMsg);
```

### Verification

- Normal operation: no log file created (`CALY_OC_NATIVE_HOST_DEBUG` not set)
- Debug mode: `CALY_OC_NATIVE_HOST_DEBUG=1 caly-xano oc native-host` → log file created
- Log file exceeds 5MB → rotated to `.1`, `.2`, `.3`

---

## 7. Uninstall — Complete Browser Coverage (LOW)

**Files:**

- `packages/cli/scripts/installer/install.sh`
- `packages/cli/scripts/installer/install.ps1`

### Current State

Uninstall only removes Chrome's manifest/registry key. Brave, Edge, and Chromium leftovers remain.

### Changes

**a) install.sh — add removal for all browser manifests (lines 114–130):**

```bash
# Remove all browser native messaging manifests
local browsers=(
   "Google/Chrome"
   "BraveSoftware/Brave-Browser"
   "Microsoft Edge"
   "Chromium"
)

case "$(uname -s)" in
   Darwin*)
      for browser in "${browsers[@]}"; do
         local manifest="$home_dir/Library/Application Support/$browser/NativeMessagingHosts/com.calycode.cli.json"
         if [ -f "$manifest" ]; then
            log "Removing $browser native messaging manifest..."
            rm -f "$manifest"
         fi
      done
      ;;
   Linux*)
      local linux_browsers=("google-chrome" "BraveSoftware/Brave-Browser" "microsoft-edge" "chromium")
      for browser in "${linux_browsers[@]}"; do
         local manifest="$home_dir/.config/$browser/NativeMessagingHosts/com.calycode.cli.json"
         if [ -f "$manifest" ]; then
            log "Removing $browser native messaging manifest..."
            rm -f "$manifest"
         fi
      done
      ;;
esac
```

**b) install.ps1 — add removal for all browser registry keys (lines 306–311):**

```powershell
# Remove all browser registry keys
$browserKeys = @(
   "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$NativeHostId",
   "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\$NativeHostId",
   "HKCU:\Software\Microsoft\Edge\NativeMessagingHosts\$NativeHostId",
   "HKCU:\Software\Chromium\NativeMessagingHosts\$NativeHostId"
)

foreach ($regKey in $browserKeys) {
   if (Test-Path $regKey) {
      Write-Log "Removing registry key: $regKey" "INFO"
      Remove-Item $regKey -Force
   }
}
```

**c) Also remove wrapper directory (currently missing from uninstall):**

```bash
# install.sh — also clean up wrapper dir and config
if [ -f "$home_dir/.calycode/bin/calycode-host.sh" ]; then
   rm -f "$home_dir/.calycode/bin/calycode-host.sh"
fi
# Remove bin dir if empty
rmdir "$home_dir/.calycode/bin" 2>/dev/null || true
```

```powershell
# install.ps1 — also remove bin directory
$binDir = Join-Path $calyDir "bin"
if (Test-Path $binDir) {
   Write-Log "Removing bin directory..." "INFO"
   Remove-Item $binDir -Recurse -Force
}
```

### Verification

- Install on macOS with Chrome + Brave → uninstall → both manifests removed
- Install on Windows with Chrome + Edge → uninstall → both registry keys removed
- Wrapper script and bin directory cleaned up

---

## Implementation Order (Recommended)

| Phase                   | Tasks                                                                      | Dependencies       | Risk Profile       |
| ----------------------- | -------------------------------------------------------------------------- | ------------------ | ------------------ |
| **Phase 1 (Critical)**  | 1. Message size cap, 2. CORS validation, 3. Port kill scope + PID tracking | None (independent) | Eliminates HIGHs   |
| **Phase 2 (Hardening)** | 4. Shell:true scope, 5. Extension discovery                                | None (independent) | Eliminates MEDIUMs |
| **Phase 3 (Polish)**    | 6. Logger gating, 7. Uninstall completeness                                | None (independent) | Eliminates LOWs    |

Each phase can be implemented and PR'd independently. No phase depends on another.

---

## Files Changed Summary

| File                                                          | Phase         | Changes                                                                                 |
| ------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------- |
| `packages/cli/src/commands/opencode/implementation.ts`        | 1, 2, 3, 4, 6 | Message cap, CORS validation, port range + PID tracking, spawn shell scope, logger gate |
| `packages/cli/src/commands/opencode/native-host/discovery.ts` | 5             | Public key validation hardening (minor — already supports it)                           |
| `packages/cli/src/utils/host-constants.ts`                    | 5             | Remove dev ID, set default mode to strict, add conditional dev ID function              |
| `packages/cli/scripts/installer/install.sh`                   | 7             | Complete browser manifest uninstall + wrapper dir cleanup                               |
| `packages/cli/scripts/installer/install.ps1`                  | 7             | Complete browser registry key uninstall + bin dir cleanup                               |

---

## Testing Strategy

### Unit Tests (new `*.test.ts` files in `packages/cli/src/commands/opencode/`)

1. **Message size cap:** Send frames with length 0, 1, 1MB, 1MB+1, 4GB → verify rejection at boundary
2. **CORS validation:** Test `filterAndValidateOrigins` with `["*"]`, `["https://*.evil.com"]`, `["https://good.com"]`, `["chrome-extension://valid-id"]`, mixed arrays, 15+ origins
3. **Port validation:** Test `validateNativeHostPort` at boundaries 4095, 4096, 4127, 4128
4. **Origin regex:** Test `isValidCorsOrigin` against all dangerous patterns

### Integration Tests

5. **PID tracking:** Start server on port 4100, send stop message for port 4100 → server killed. Send stop for 4101 → error (not managed).
6. **Logger gate:** Start native host without/with `CALY_OC_NATIVE_HOST_DEBUG=1` → verify log file absence/presence
7. **Shell scope:** On Windows, verify managed binary spawn uses `shell: false`, npx fallback uses `shell: true`

---

## Rollback / Rollout Plan

All changes are additive with backward-compatible defaults:

- Port range default is 4096 — same as current default port
- `CALY_OC_NATIVE_HOST_DEBUG` not set → logger disabled (new behavior, safe default)
- Strict mode + public key → only effective if `CALY_BUILD_OC_EXT_PUBLIC_KEY_B64` is set at build time
- Dev ID removal → only affects `allowedExtensionIds` in production builds; dev builds set `CALY_OC_INCLUDE_DEV_EXT=1`

Rollback: revert to previous version. No data migration, no config file format changes, no database changes.
