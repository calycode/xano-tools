import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import {
   DEFAULT_OPENCODE_VERSION,
   resolveOcVersion,
   parseOcVersionFromArgv,
   validatePort,
   getCalycodeOpencodeConfigDir,
   getOpencodeWorkingDir,
   type LaunchOpencodeServerOptions,
   type LaunchedOpencodeServer,
} from '../distribution';
import { resolveAllowedExtensionIds } from './discovery';
import { getAllowedCorsOrigins, filterAndValidateOrigins } from './origins';
import { sendMessage, NativeHostLogger, MAX_NATIVE_MESSAGE_SIZE } from './protocol';
import {
   getOrCreateNativeHostOwnerToken,
   loadPersistedManagedPids,
   writeNativeHostSessionMetadata,
   deleteNativeHostSessionMetadata,
} from './state';

const NATIVE_HOST_PORT_RANGE_START = 4096;
const NATIVE_HOST_PORT_RANGE_SIZE = 32;
const NATIVE_HOST_PORT_RANGE_END = NATIVE_HOST_PORT_RANGE_START + NATIVE_HOST_PORT_RANGE_SIZE - 1;

interface ManagedSession {
   port: number;
   proc: ReturnType<typeof spawn>;
   pid: number;
   startedAt: number;
}

/**
 * Dependencies the native host runtime needs from outside its module.
 *
 * The launcher is injected so the runtime depends on the distribution interface
 * rather than constructing it, and so tests can supply a fake launcher.
 */
export interface NativeHostDependencies {
   launchServer: (options: LaunchOpencodeServerOptions) => LaunchedOpencodeServer;
}

/**
 * Validates a port number for native host use: a valid TCP port within the
 * reserved native host range.
 * @param port - Port number to validate
 * @throws {Error} if port is invalid or out of range
 */
export function validateNativeHostPort(port: number): void {
   validatePort(port);
   if (port < NATIVE_HOST_PORT_RANGE_START || port > NATIVE_HOST_PORT_RANGE_END) {
      throw new Error(
         `Port ${port} outside allowed native host range ` +
         `(${NATIVE_HOST_PORT_RANGE_START}–${NATIVE_HOST_PORT_RANGE_END})`,
      );
   }
}

/**
 * Kill orphan processes on a port, restricted to allowed PIDs only.
 * @param port - Port number to scan
 * @param allowedPids - Set of PIDs that are permitted to be killed
 * @param logger - Optional logger
 * @returns true if a process was killed, false if none found or none allowed
 */
export function killProcessOnPort(
   port: number,
   allowedPids: Set<number>,
   logger?: { log: (msg: string, data?: any) => void; error: (msg: string, err?: any) => void },
   options?: { allowUnmanagedOpencode?: boolean; allowedOwnerToken?: string },
): boolean {
   const logInfo = logger?.log ?? ((msg: string) => { /* silent */ });
   const logError = logger?.error ?? ((msg: string) => { /* silent */ });
   const allowUnmanagedOpencode = options?.allowUnmanagedOpencode === true;
   const allowedOwnerToken = options?.allowedOwnerToken?.trim().toLowerCase();
   const ownedPersistedPids = allowedOwnerToken
      ? loadPersistedManagedPids(allowedOwnerToken)
      : new Set<number>();

   const getPidCommandLine = (pid: number): string => {
      try {
         if (os.platform() === 'win32') {
            const psCommand = `(Get-CimInstance Win32_Process -Filter \"ProcessId = ${pid}\" | Select-Object -ExpandProperty CommandLine)`;
            return execSync(`powershell -NoProfile -Command "${psCommand}"`, {
               encoding: 'utf8',
               timeout: 5000,
               windowsHide: true,
            }).trim();
         }

         return execSync(`ps -p ${pid} -o command=`, {
            encoding: 'utf8',
            timeout: 5000,
         }).trim();
      } catch {
         return '';
      }
   };

   const shouldAllowPid = (pid: number): boolean => {
      if (allowedPids.has(pid)) {
         return true;
      }

      if (ownedPersistedPids.has(pid)) {
         return true;
      }

      if (!allowUnmanagedOpencode) {
         return false;
      }

      const commandLine = getPidCommandLine(pid).toLowerCase();

      if (!commandLine) {
         return false;
      }

      const looksLikeOpencode =
         commandLine.includes('opencode') ||
         commandLine.includes('opencode-ai') ||
         commandLine.includes('calycode-host') ||
         commandLine.includes('caly.exe opencode');

      if (looksLikeOpencode) {
         logInfo(`Allowing unmanaged OpenCode process ${pid} on port ${port} for cleanup`, {
            commandLine,
         });
      }

      return looksLikeOpencode;
   };

   const toAllowedPidList = (rawPids: Array<string | number>): number[] => {
      const parsed = rawPids
         .map((pid) => (typeof pid === 'number' ? pid : Number.parseInt(String(pid).trim(), 10)))
         .filter((pid) => Number.isInteger(pid) && pid > 0);
      return Array.from(new Set(parsed.filter((pid) => shouldAllowPid(pid))));
   };

   const parseWindowsNetstatPids = (output: string): string[] => {
      const lines = output.split('\n');
      const pids: string[] = [];
      for (const line of lines) {
         if (!line.includes('LISTENING') || !line.includes(`:${port}`)) {
            continue;
         }
         const parts = line.trim().split(/\s+/);
         const pid = parts[parts.length - 1];
         if (pid && /^\d+$/.test(pid) && pid !== '0') {
            pids.push(pid);
         }
      }
      return pids;
   };

   const parsePidLines = (output: string): string[] =>
      output
         .split('\n')
         .map((line) => line.trim())
         .filter((line) => /^\d+$/.test(line));

   try {
      validatePort(port);

      if (os.platform() === 'win32') {
         try {
            const netstatOutput = execSync(`netstat -ano | findstr :${port}`, {
               encoding: 'utf8',
               timeout: 5000,
               windowsHide: true,
            });

            const allowed = toAllowedPidList(parseWindowsNetstatPids(netstatOutput));
             if (allowed.length === 0) {
                logInfo(`No eligible process found on port ${port}`);
                return false;
             }

            let killedAny = false;
            for (const pid of allowed) {
               try {
                  execSync(`taskkill /F /PID ${pid}`, {
                     timeout: 5000,
                     windowsHide: true,
                  });
                  logInfo(`Killed managed process ${pid} on port ${port}`);
                  killedAny = true;
               } catch (killErr) {
                  logError(`Failed to kill managed process ${pid}`, killErr);
               }
            }

            if (!killedAny) {
               logInfo(`No listening process found on port ${port}`);
               return false;
            }

            return true;
          } catch (e: any) {
            if (e.status === 1 || e.message?.includes('not found')) {
               logInfo(`No process found on port ${port}`);
               return false;
            }
            throw e;
         }
      } else {
         const candidates = new Set<string>();

         try {
            const fuserOutput = execSync(`fuser ${port}/tcp 2>/dev/null || true`, {
               encoding: 'utf8',
               timeout: 5000,
            });
            for (const pid of parsePidLines(fuserOutput)) {
               candidates.add(pid);
            }
         } catch {
            // Best effort; lsof fallback below.
         }

         try {
            const lsofOutput = execSync(`lsof -ti tcp:${port}`, {
               encoding: 'utf8',
               timeout: 5000,
            });
            for (const pid of parsePidLines(lsofOutput)) {
               candidates.add(pid);
            }
         } catch (lsofErr: any) {
            if (lsofErr.status !== 1) {
               throw lsofErr;
            }
         }

         const allowed = toAllowedPidList(Array.from(candidates));
          if (allowed.length === 0) {
             logInfo(`No eligible process found on port ${port}`);
             return false;
          }

         let killedAny = false;
         for (const pid of allowed) {
            try {
               execSync(`kill -9 ${pid}`, { timeout: 5000 });
               logInfo(`Killed managed process ${pid} on port ${port}`);
               killedAny = true;
            } catch (killErr) {
               logError(`Failed to kill managed process ${pid}`, killErr);
            }
         }

         if (!killedAny) {
            logInfo(`No managed process killed on port ${port}`);
            return false;
         }

         return true;
      }
   } catch (error) {
      logError(`Error killing process on port ${port}`, error);
      return false;
   }
}

export async function isLikelyOpenCodeServerOnPort(
   port: number,
   expectedOcVersion?: string,
   logger?: { log: (msg: string, data?: any) => void; error: (msg: string, err?: any) => void },
): Promise<boolean> {
   try {
      const response = await fetch(`http://localhost:${port}/global/health`, {
         method: 'GET',
         signal: AbortSignal.timeout(1500),
      });

      if (!response.ok) {
         return false;
      }

      const body = (await response.json()) as { version?: unknown };
      const version = typeof body?.version === 'string' ? body.version : null;
      if (!version) {
         return false;
      }

      if (expectedOcVersion && expectedOcVersion !== 'latest' && version !== expectedOcVersion) {
         logger?.log('Health identity check found version mismatch', {
            expectedOcVersion,
            actualVersion: version,
            port,
         });
      }

      return true;
   } catch {
      return false;
   }
}

export async function startNativeHost({ launchServer }: NativeHostDependencies) {
   const logger = new NativeHostLogger();
   logger.log('Native host process started.');
   logger.log('Process info', {
      pid: process.pid,
      ppid: process.ppid,
      argv: process.argv,
      execPath: process.execPath,
      cwd: process.cwd(),
      platform: process.platform,
   });

   let serverProc: ReturnType<typeof spawn> | null = null;
   const managedSessions = new Map<number, ManagedSession>();
   const ownerToken = getOrCreateNativeHostOwnerToken();
   const managedPids = loadPersistedManagedPids(ownerToken);
   let cleanupTriggered = false;
   logger.log('Native host owner token initialized', {
      ownerToken,
      restoredManagedPidCount: managedPids.size,
   });

   const registerManagedSession = (port: number, proc: ReturnType<typeof spawn>) => {
      if (!proc.pid) return;
      managedSessions.set(port, { port, proc, pid: proc.pid, startedAt: Date.now() });
      managedPids.add(proc.pid);
      writeNativeHostSessionMetadata({
         port,
         pid: proc.pid,
         ownerToken,
         updatedAt: new Date().toISOString(),
      });
   };

   const unregisterManagedSession = (port: number) => {
      const session = managedSessions.get(port);
      if (session && session.pid) managedPids.delete(session.pid);
      managedSessions.delete(port);
      deleteNativeHostSessionMetadata(port);
   };

   // Wait for server to be ready by polling the URL
   const waitForServerReady = async (
      url: string,
      maxAttempts: number = 30,
      intervalMs: number = 500,
   ): Promise<boolean> => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
         try {
            const response = await fetch(url);
            if (response.ok || response.status === 404) {
               // Server is responding (404 is fine, means server is up but endpoint not found)
               logger.log(`Server ready after ${attempt} attempts`);
               return true;
            }
         } catch (e) {
            // Server not ready yet
         }
         await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      logger.log(`Server not ready after ${maxAttempts} attempts`);
      return false;
   };

   const startServer = async (
      port: number = 4096,
      extraOrigins: string[] = [],
      requestedOcVersion?: string,
   ) => {
      try {
         validatePort(port);
      } catch (e) {
         logger.error('Invalid port', e);
         sendMessage({ status: 'error', message: `Invalid port: ${port}` });
         return;
      }

      const serverUrl = `http://localhost:${port}`;
      logger.log(`Attempting to start server on port ${port}`, { extraOrigins });

      const existingSession = managedSessions.get(port);
      if (existingSession) {
         logger.log('Killing existing session on port...');
         try { existingSession.proc.kill(); } catch { /* already dead */ }
         unregisterManagedSession(port);
         await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (serverProc) {
         logger.log('Killing existing server process...');
         serverProc.kill();
         serverProc = null;
         await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Check if already running via fetch
      try {
         await fetch(serverUrl);
         logger.log('Server already active on url; triggering restart to reconcile CORS/config drift', {
            serverUrl,
            extraOrigins,
            requestedOcVersion,
         });
         sendMessage({
            status: 'starting',
            url: serverUrl,
            message: 'Server already active; restarting to reconcile requested origins/config...',
         });
         await restartServer(port, extraOrigins, requestedOcVersion);
         return;
      } catch (e) {
         // Not running, proceed
      }

      try {
         const resolvedVersion = resolveOcVersion(
            requestedOcVersion || parseOcVersionFromArgv(process.argv),
         );
         logger.log(`Using OpenCode version: ${resolvedVersion}`);
         logger.log(`Using OpenCode config directory: ${getCalycodeOpencodeConfigDir()}`);
         logger.log(`Using OpenCode working directory: ${getOpencodeWorkingDir('server')}`);
         if (resolvedVersion !== DEFAULT_OPENCODE_VERSION) {
            logger.log(
               `Using overridden OpenCode ${resolvedVersion}. Default channel is ${DEFAULT_OPENCODE_VERSION}.`,
            );
         }

          const launched = launchServer({
             port,
             extraOrigins,
             allowedOrigins: getAllowedCorsOrigins(),
             stdio: 'ignore',
             ocVersion: resolvedVersion,
             ownerToken,
             allowGlobalFallback: false,
             onManagedFail: (err) =>
                logger.log('Managed OpenCode install failed, falling back', {
                  error: err.message,
                }),
            onGlobalVersionMismatch: ({ expectedVersion, actualVersion, globalBinaryPath }) =>
               logger.log('Global OpenCode version mismatch; falling back to npx', {
                  expectedVersion,
                  actualVersion,
                  globalBinaryPath,
               }),
         });
         logger.log(`Spawning ${launched.plan.displayCommand}`);
         logger.log(`OpenCode launcher source: ${launched.plan.source}`);
         const launchedProc = launched.proc;
         serverProc = launchedProc;
         registerManagedSession(port, launchedProc);

         launchedProc.on('error', (err) => {
            logger.error('Failed to spawn server process', err);
            sendMessage({ status: 'error', message: `Failed to spawn server: ${err.message}` });
         });

         launchedProc.on('exit', (code) => {
            // Ignore exits from a process that has already been superseded on
            // this port; otherwise a stale exit would tear down the new session.
            if (managedSessions.get(port)?.proc !== launchedProc) {
               logger.log(`Ignoring exit from stale server process ${launchedProc.pid} on port ${port}`);
               // Don't leave a dangling reference if this process is still the one we track.
               if (serverProc === launchedProc) {
                  serverProc = null;
               }
               return;
            }
            logger.log(`Server process exited with code ${code}`);
            sendMessage({ status: 'stopped', code });
            unregisterManagedSession(port);
            if (serverProc === launchedProc) {
               serverProc = null;
            }
         });

         logger.log('Server process spawned, waiting for ready...');
         sendMessage({
            status: 'starting',
            url: serverUrl,
            message: 'Server process spawned, waiting for ready...',
         });

         // Wait for server to actually be ready
         const isReady = await waitForServerReady(serverUrl);
         if (isReady) {
            logger.log('Server is now running and ready');
            sendMessage({ status: 'running', url: serverUrl, message: 'Server is ready' });
         } else {
            logger.error('Server failed to become ready in time');
            sendMessage({
               status: 'error',
               url: serverUrl,
               message: 'Server spawned but failed to become ready in time',
            });
         }
      } catch (err: any) {
         logger.error('Unexpected error starting server', err);
         sendMessage({
            status: 'error',
            message: err?.message || 'Unexpected error starting server',
         });
      }
   };

   const restartServer = async (
      port: number = 4096,
      extraOrigins: string[] = [],
      requestedOcVersion?: string,
   ) => {
      logger.log('Restart requested', { port, extraOrigins, requestedOcVersion });

      // Kill existing server process if we have a reference
      if (serverProc) {
         logger.log('Killing existing server process for restart...');
         serverProc.kill();
         serverProc = null;
         // Give it a moment to release the port
         await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Kill any orphan process on the port (handles lost references)
      logger.log('Checking for orphan processes on port...');
      const killed = killProcessOnPort(port, managedPids, logger, {
         allowUnmanagedOpencode: true,
         allowedOwnerToken: ownerToken,
      });
      if (killed) {
         logger.log('Killed orphan process(es) on port, waiting for port release...');
          // Give more time for port to be released after force kill
          await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
         const likelyOpenCode = await isLikelyOpenCodeServerOnPort(port, requestedOcVersion, logger);
         if (likelyOpenCode) {
            logger.error('Detected OpenCode-like server on port that is not owned by this native host', {
               port,
               ownerToken,
            });
            sendMessage({
               status: 'error',
               message:
                  `Port ${port} is occupied by a server that is not owned by this Caly native host session. ` +
                  'Refusing to terminate it automatically for safety.',
            });
            return;
         }
      }

      // Verify port is actually free now
      const serverUrl = `http://localhost:${port}`;
      try {
         await fetch(serverUrl);
         // If we get here, something is still running on the port
         logger.error('Port still in use after kill attempts');
         sendMessage({ 
            status: 'error', 
            message: `Port ${port} still in use after cleanup attempts. Please try again or use a different port.` 
         });
         return;
      } catch (e) {
         // Good, nothing running - port is free
         logger.log('Port is now free, starting server...');
      }

      // Start fresh with new config
      await startServer(port, extraOrigins, requestedOcVersion);
   };

   const handleMessage = async (msg: any) => {
      logger.log('Received message', msg);

      try {
         if (msg.type === 'ping') {
            sendMessage({ type: 'pong', timestamp: Date.now() });
         } else if (msg.type === 'start') {
            const rawPort = msg.port ? parseInt(msg.port, 10) : 4096;
            try { validateNativeHostPort(rawPort); } catch (e) {
               logger.error('Invalid port in message', { port: rawPort, error: e });
               sendMessage({ status: 'error', message: `Invalid port: ${rawPort}` });
               return;
            }
            const port = rawPort;
            const knownIds = resolveAllowedExtensionIds().ids;
            const origins = filterAndValidateOrigins(msg.origins, knownIds);
            const requestedOcVersion = typeof msg.ocVersion === 'string' ? msg.ocVersion : undefined;
            await startServer(port, origins, requestedOcVersion);
         } else if (msg.type === 'restart') {
            const rawPort = msg.port ? parseInt(msg.port, 10) : 4096;
            try { validateNativeHostPort(rawPort); } catch (e) {
               logger.error('Invalid port in message', { port: rawPort, error: e });
               sendMessage({ status: 'error', message: `Invalid port: ${rawPort}` });
               return;
            }
            const port = rawPort;
            const knownIds = resolveAllowedExtensionIds().ids;
            const origins = filterAndValidateOrigins(msg.origins, knownIds);
            const requestedOcVersion = typeof msg.ocVersion === 'string' ? msg.ocVersion : undefined;
            await restartServer(port, origins, requestedOcVersion);
         } else if (msg.type === 'stop') {
            const rawPort = msg.port ? parseInt(msg.port, 10) : 4096;
            try { validateNativeHostPort(rawPort); } catch (e) {
               logger.error('Invalid port in message', { port: rawPort, error: e });
               sendMessage({ status: 'error', message: `Invalid port: ${rawPort}` });
               return;
            }
            const port = rawPort;
            logger.log('Stop requested', { port, hasServerProc: !!serverProc });

            const session = managedSessions.get(port);
            if (session) {
               logger.log('Killing managed session on port', { port, pid: session.pid });
               try { session.proc.kill(); } catch { /* already dead */ }
               unregisterManagedSession(port);
               sendMessage({ status: 'stopped', message: `Server on port ${port} stopped` });
            } else if (serverProc) {
               logger.log('Killing server process by reference...');
               serverProc.kill();
               serverProc = null;
               sendMessage({ status: 'stopped', message: 'Server stopped by request' });
            } else {
               const killed = killProcessOnPort(port, managedPids, logger, {
                  allowedOwnerToken: ownerToken,
               });
               if (killed) {
                  sendMessage({ status: 'stopped', message: `Server on port ${port} stopped` });
               } else {
                  const likelyOpenCode = await isLikelyOpenCodeServerOnPort(port, undefined, logger);
                  if (likelyOpenCode) {
                     sendMessage({
                        status: 'error',
                        message:
                           `Server on port ${port} appears to be running but is not owned by this native host session. ` +
                           'Refusing to stop it automatically for safety.',
                     });
                  } else {
                     sendMessage({ status: 'error', message: `No managed server on port ${port}` });
                  }
               }
            }
         } else {
             sendMessage({ status: 'received', received: msg });
         }
      } catch (err) {
         logger.error('Error handling message', err);
         sendMessage({ status: 'error', message: 'Internal error processing message' });
      }
   };

   // Cleanup function to kill all managed server sessions and exit cleanly
   const cleanup = (reason: string) => {
      if (cleanupTriggered) {
         return;
      }
      cleanupTriggered = true;
      logger.log(`Cleanup triggered: ${reason}`);

      for (const [sessionPort, session] of managedSessions) {
         logger.log(`Killing managed session on port ${sessionPort}`);
         try { session.proc.kill(); } catch { /* already dead */ }
         if (session.pid) managedPids.delete(session.pid);
         deleteNativeHostSessionMetadata(sessionPort);
      }
      managedSessions.clear();

      process.exit(0);
   };

   // 2. Listen for messages from Chrome (stdin)
   // Chrome sends length-prefixed JSON.
   // CRITICAL: On Windows, stdin must be in raw binary mode for Native Messaging

   // Ensure stdin is in flowing mode and properly configured
   if (process.stdin.isTTY) {
      logger.log('Warning: stdin is a TTY, Native Messaging may not work correctly');
   }

   // Resume stdin in case it's paused (Node.js default behavior)
   process.stdin.resume();

   // Log stdin state for debugging
   logger.log('stdin configured', {
      readable: process.stdin.readable,
      isTTY: process.stdin.isTTY,
   });

   let inputBuffer = Buffer.alloc(0);
   let expectedLength: number | null = null;

   process.stdin.on('data', (chunk) => {
      logger.log('Received data chunk', { length: chunk.length });

      if (inputBuffer.length + chunk.length > MAX_NATIVE_MESSAGE_SIZE + 4) {
         logger.error('Input buffer exceeds max size, resetting parser');
         inputBuffer = Buffer.alloc(0);
         expectedLength = null;
         return;
      }
      inputBuffer = Buffer.concat([inputBuffer, chunk]);

      while (true) {
         if (expectedLength === null) {
            if (inputBuffer.length >= 4) {
               expectedLength = inputBuffer.readUInt32LE(0);
               inputBuffer = inputBuffer.subarray(4);

               if (expectedLength > MAX_NATIVE_MESSAGE_SIZE) {
                  logger.error('Message exceeds max size', {
                     size: expectedLength,
                     max: MAX_NATIVE_MESSAGE_SIZE,
                  });
                  expectedLength = null;
                  inputBuffer = Buffer.alloc(0);
                  break;
               }
            } else {
               break;
            }
         }

         if (expectedLength !== null) {
            if (inputBuffer.length >= expectedLength) {
               const messageData = inputBuffer.subarray(0, expectedLength);
               inputBuffer = inputBuffer.subarray(expectedLength);
               expectedLength = null;

               try {
                  const msg = JSON.parse(messageData.toString());
                  void handleMessage(msg);
               } catch (err) {
                  logger.error('Failed to parse JSON message', err);
               }
            } else {
               break; // Wait for more data
            }
         }
      }
   });

   // Handle stdin close - Chrome extension disconnected
   // This is CRITICAL to prevent ghost server processes
   process.stdin.on('end', () => {
      logger.log('stdin end event received', {
         receivedAnyData: inputBuffer.length > 0 || expectedLength !== null,
         bufferLength: inputBuffer.length,
      });
      // Small delay to allow any pending data to be processed
      setTimeout(() => {
         cleanup('stdin end (extension disconnected)');
      }, 100);
   });

   process.stdin.on('close', () => {
      logger.log('stdin close event received');
      cleanup('stdin close (extension disconnected)');
   });

   process.stdin.on('error', (err) => {
      logger.error('stdin error', err);
      cleanup('stdin error');
   });

   // Handle process signals
   process.on('SIGINT', () => {
      cleanup('SIGINT received');
   });

   process.on('SIGTERM', () => {
      cleanup('SIGTERM received');
   });

   // Handle uncaught exceptions to ensure cleanup
   process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', err);
      cleanup('uncaughtException');
   });
}
