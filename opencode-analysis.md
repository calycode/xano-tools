# Analysis of `opencode` Feature in `@calycode/cli`

## Overview
The `opencode` feature integrates the `opencode-ai` CLI into the CalyCode toolset, enabling a native host communication channel for a Chrome extension. It consists of three primary commands:
1.  **`init`**: Sets up the Native Messaging Host manifest and wrapper scripts for the browser to launch the CLI.
2.  **`serve`**: Runs the `opencode-ai serve` command to start a local AI agent server.
3.  **`native-host`**: Acts as the communication bridge between the browser extension (via stdin/stdout) and the local system (spawning the `serve` process).

## Current Issues & Observations

### 1. Hardcoded Origins & CORS
- **Issue**: The allowed CORS origins are hardcoded in `implementation.ts`:
  ```typescript
  const ALLOWED_CORS_ORIGINS = [
     'https://app.xano.com',
     'https://services.calycode.com',
     'chrome-extension://lnhipaeaeiegnlokhokfokndgadkohfe',
  ];
  ```
- **Constraint**: The user cannot dynamically add origins required by the extension or their specific environment (e.g., development builds with different IDs or localhost ports).
- **Requirement**: The extension "knows best" which origins need access. The current implementation does not accept CORS configuration from the extension via the native messaging protocol.

### 2. Hardcoded Ports
- **Issue**: The port is defaulted to `4096` in multiple places.
  - In `serveOpencode`, it accepts a CLI flag but defaults to `4096`.
  - In `startNativeHost`, it is hardcoded to `4096` when spawning the server:
    ```typescript
    const port = 4096;
    const serverUrl = `http://localhost:${port}`;
    ```
- **Constraint**: If port 4096 is in use, the server will likely fail or conflict. The extension has no way to request a specific port or be informed of a dynamically assigned port.

### 3. Traceability & Logging
- **Issue**:
  - `startNativeHost` swallows errors or logs them to a file "if needed" (comment only):
    ```typescript
    } catch (err) {
       // Log error to a file if needed, can't print to stdout
    }
    ```
  - Standard output (`stdout`) is reserved for the native messaging protocol (JSON length-prefixed). Any `console.log` or leak to stdout corrupts the stream, causing the "disconnected" error on the browser side.
  - `displayNativeHostBanner` uses `console.error` (which is safe for stderr), but there is no structured logging mechanism to a file for debugging protocol issues.
- **Traceability**: Debugging why a connection fails is currently extremely difficult because we cannot see what the native host is doing or why the spawned server might have failed.

### 4. Communication & "Disconnected" State
- **Issue**: The user reports the extension always gets "disconnected".
  - This often happens if the Native Host crashes immediately or writes non-protocol data to `stdout`.
  - It also happens if the message loop in `startNativeHost` exits prematurely.
- **Protocol**: The current `while(true)` loop for reading `stdin` chunks looks mostly correct for the length-prefixed protocol, but error handling is minimal.
- **Feedback Loop**: When `startNativeHost` spawns the server, it sends a `{ status: 'starting' ... }` message. However, if the server fails to start (e.g., port in use), the extension might not get a clear error message back, or the native host process might just keep running without a working backend.

## Recommendations for Improvement

1.  **Dynamic Configuration via Native Messaging**:
    -   Update `handleMessage` to support a `config` or `start-server` message type from the extension.
    -   Allow the extension to pass `port` and `allowedOrigins` in this initial handshake.
    -   Only spawn the `opencode-ai serve` process *after* receiving this configuration (or use defaults if not provided).

2.  **Robust Logging**:
    -   Implement a file-based logger (e.g., `fs.appendFileSync` to a log file in `~/.calycode/logs/native-host.log`).
    -   Log all incoming messages, outgoing messages, and internal errors to this file.
    -   Ensure absolutely no `console.log` is used. Use `console.error` only for things acceptable to show in the browser's stderr stream (if captured), but a file is safer for persistence.

3.  **Port Handling**:
    -   Allow defining the port in the `native-host` logic, potentially finding a free port if the requested one is busy, and reporting the actual port back to the extension.

4.  **CORS Control**:
    -   Modify `getCorsArgs` or the spawning logic to include origins provided dynamically by the extension.

5.  **Keep-Alive & Status Checks**:
    -   Ensure the `startNativeHost` process doesn't exit unless explicitly told to or if the stdin stream closes (browser disconnects).
    -   Send periodic heartbeats or allow the extension to query detailed status of the spawned server process.
