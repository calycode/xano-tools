import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { spawn, execSync } from 'node:child_process';
import {
   DEFAULT_OPENCODE_PORT,
   DEFAULT_OPENCODE_VERSION,
   getCalycodeOpencodeConfigDir,
   getOpencodeMajorVersion,
   getOpencodeWorkingDir,
   isPortAvailable,
   parseOcVersionFromArgv,
   parsePortRequest,
   resolveOcVersion,
   selectAvailablePort,
   validatePort,
   type LaunchOpencodeServerOptions,
   type LaunchedOpencodeServer,
   type PortSelection,
} from '../distribution';
import { resolveAllowedExtensionIds } from './discovery';
import { getAllowedCorsOrigins, filterAndValidateOrigins } from './origins';
import { sendMessage, NativeHostLogger, MAX_NATIVE_MESSAGE_SIZE } from './protocol';
import {
   getOrCreateNativeHostOwnerToken,
   loadNativeHostSessions,
   loadPersistedManagedPids,
   writeNativeHostSessionMetadata,
   deleteNativeHostSessionMetadata,
} from './state';

const MAX_START_ATTEMPTS = 2;
const SERVER_READY_TIMEOUT_ATTEMPTS = 40;
const SERVER_READY_POLL_INTERVAL_MS = 500;

interface ManagedSession {
   port: number;
   proc: ReturnType<typeof spawn> | null;
   pid: number;
   startedAt: number;
   url: string;
   requestedPort: number | null;
   autoSelected: boolean;
   keepAlive: boolean;
   ready: boolean;
   adopted: boolean;
   origins: string[];
   ocVersion: string;
   password: string;
}

interface ServerStatusPayload {
   status: 'stopped' | 'starting' | 'running';
   port: number | null;
   url: string | null;
   pid: number | null;
   requestedPort: number | null;
   autoSelected: boolean;
   keepAlive: boolean;
   ready: boolean;
   adopted: boolean;
   password: string | null;
   sessions?: Array<Record<string, unknown>>;
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
 * Validate a port requested by the browser extension.
 *
 * The extension may ask for any valid TCP port; the 4096-4127 range is only the
 * automatic scan range used when that preference is unavailable.
 */
export function validateNativeHostPort(port: number): void {
   validatePort(port);
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
   options?: {
      allowUnmanagedOpencode?: boolean;
      allowedOwnerToken?: string;
      /** When set, an unmanaged OpenCode process must contain one of these markers. */
      managedMarkers?: string[];
   },
): boolean {
   const logInfo = logger
      ? (msg: string, data?: any) => logger.log(msg, data)
      : (msg: string) => { /* silent */ };
   const logError = logger
      ? (msg: string, err?: any) => logger.error(msg, err)
      : (msg: string) => { /* silent */ };
   const allowUnmanagedOpencode = options?.allowUnmanagedOpencode === true;
   const managedMarkers = (options?.managedMarkers ?? [])
      .map((marker) => marker.trim().toLowerCase())
      .filter(Boolean);
   const allowedOwnerToken = options?.allowedOwnerToken?.trim().toLowerCase();
   const ownedPersistedPids = allowedOwnerToken
      ? loadPersistedManagedPids(allowedOwnerToken)
      : new Set<number>();

   const commandLineCache = new Map<number, string>();

   const getPidCommandLine = (pid: number): string => {
      const cached = commandLineCache.get(pid);
      if (cached !== undefined) {
         return cached;
      }

      try {
         if (os.platform() === 'win32') {
            // Single quotes inside keep the filter as one PowerShell argument;
            // escaped double quotes here would end the outer -Command string
            // and make the query fail silently.
            const psCommand = `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}' | Select-Object -ExpandProperty CommandLine)`;
            const commandLine = execSync(`powershell -NoProfile -Command "${psCommand}"`, {
               encoding: 'utf8',
               timeout: 5000,
               windowsHide: true,
            }).trim();
            commandLineCache.set(pid, commandLine);
            return commandLine;
         }

         const commandLine = execSync(`ps -p ${pid} -o command=`, {
            encoding: 'utf8',
            timeout: 5000,
         }).trim();
         commandLineCache.set(pid, commandLine);
         return commandLine;
      } catch {
         commandLineCache.set(pid, '');
         return '';
      }
   };

   /**
    * Windows occasionally omits a listening socket from `netstat` (for example
    * when the server is proxied or the socket moves through a closing state).
    * Match the server's own command line as a second source of candidates.
    */
   const findPidsByPortArgument = (): Map<number, string> => {
      const matches = new Map<number, string>();

      try {
         if (os.platform() === 'win32') {
            const psCommand =
               `Get-CimInstance Win32_Process | ` +
               `Where-Object { $_.CommandLine -and $_.CommandLine -match '--port\\s+${port}(\\s|$)' } | ` +
               `Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress`;
            const output = execSync(`powershell -NoProfile -Command "${psCommand}"`, {
               encoding: 'utf8',
               timeout: 10000,
               windowsHide: true,
            }).trim();

            if (!output) {
               return matches;
            }

            const parsed = JSON.parse(output) as
               | { ProcessId?: number; CommandLine?: string }
               | Array<{ ProcessId?: number; CommandLine?: string }>;
            const entries = Array.isArray(parsed) ? parsed : [parsed];
            for (const entry of entries) {
               if (
                  Number.isInteger(entry.ProcessId) &&
                  typeof entry.CommandLine === 'string' &&
                  entry.ProcessId! > 0
               ) {
                  matches.set(entry.ProcessId!, entry.CommandLine);
               }
            }
            return matches;
         }

         const output = execSync('ps -eo pid=,command=', {
            encoding: 'utf8',
            timeout: 5000,
         }).trim();
         const portPattern = new RegExp(`--port(?:\\s+|=)${port}(?:\\s|$)`);
         for (const line of output.split('\n')) {
            const match = line.trim().match(/^(\d+)\s+(.*)$/);
            if (!match) {
               continue;
            }
            const pid = Number(match[1]);
            const commandLine = match[2];
            if (pid > 0 && portPattern.test(commandLine)) {
               matches.set(pid, commandLine);
            }
         }
      } catch {
         // Best effort; netstat/fuser/lsof remain the primary sources.
      }

      return matches;
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

      if (!looksLikeOpencode) {
         return false;
      }

      if (managedMarkers.length > 0) {
         const matchesManagedMarker = managedMarkers.some((marker) => commandLine.includes(marker));
         if (!matchesManagedMarker) {
            logInfo(
               `Refusing to kill unmanaged OpenCode process ${pid} on port ${port}: ` +
               'its command line does not match this Caly installation',
               { commandLine },
            );
            return false;
         }
      }

      logInfo(`Allowing unmanaged OpenCode process ${pid} on port ${port} for cleanup`, {
         commandLine,
      });

      return true;
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
         const parts = line.trim().split(/\s+/);
         // TCP <local> <remote> <state> <pid>
         if (parts.length < 5 || parts[0] !== 'TCP') {
            continue;
         }

         const localAddress = parts[1];
         if (!localAddress?.endsWith(`:${port}`)) {
            continue;
         }

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

            const commandLineMatches = allowUnmanagedOpencode
               ? findPidsByPortArgument()
               : new Map<number, string>();
            for (const [pid, commandLine] of commandLineMatches) {
               commandLineCache.set(pid, commandLine);
            }

            const allowed = toAllowedPidList([
               ...parseWindowsNetstatPids(netstatOutput),
               ...Array.from(commandLineMatches.keys()),
            ]);
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
                     stdio: 'ignore',
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

         if (allowUnmanagedOpencode) {
            for (const pid of findPidsByPortArgument().keys()) {
               candidates.add(String(pid));
            }
         }

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

const OPENCODE_V1_HEALTH_PATH = '/global/health';
const OPENCODE_V2_HEALTH_PATH = '/api/info';

/** Probe V2 first unless the requested runtime is explicitly V1. */
function getHealthPaths(expectedOcVersion?: string): string[] {
   const major =
      expectedOcVersion === 'latest'
         ? 2
         : getOpencodeMajorVersion(expectedOcVersion);

   return major !== null && major <= 1
      ? [OPENCODE_V1_HEALTH_PATH, OPENCODE_V2_HEALTH_PATH]
      : [OPENCODE_V2_HEALTH_PATH, OPENCODE_V1_HEALTH_PATH];
}

/**
 * Probe a port for a compatible OpenCode server.
 *
 * V2 uses the authenticated `/api/info` endpoint; V1 uses `/global/health`.
 * A 401 from `/api/info` still counts as "up" when no password is available.
 */
export async function isLikelyOpenCodeServerOnPort(
   port: number,
   expectedOcVersion?: string,
   logger?: { log: (msg: string, data?: any) => void; error: (msg: string, err?: any) => void },
   password?: string,
): Promise<boolean> {
   const expectedMajor = getOpencodeMajorVersion(
      expectedOcVersion === 'latest' ? DEFAULT_OPENCODE_VERSION : expectedOcVersion,
   );

   for (const healthPath of getHealthPaths(expectedOcVersion)) {
      try {
         const response = await fetch(`http://localhost:${port}${healthPath}`, {
            method: 'GET',
            headers: password ? { Authorization: basicAuthHeader(password) } : undefined,
            signal: AbortSignal.timeout(1500),
         });

         if (response.status === 401 || response.status === 403) {
            if (!password && healthPath === OPENCODE_V2_HEALTH_PATH) {
               // V2 servers require authentication by default. A 401 from
               // /api/info is still proof that the server is up; the
               // extension verifies the version with its credentials.
               logger?.log('OpenCode V2 server is auth-protected; readiness confirmed', {
                  port,
                  healthPath,
               });
               return true;
            }

            logger?.log('OpenCode health check was rejected', {
               port,
               healthPath,
               status: response.status,
            });
            continue;
         }

         if (!response.ok) {
            continue;
         }

         const body = (await response.json()) as { version?: unknown };
         const version = typeof body?.version === 'string' ? body.version : null;
         if (!version) {
            continue;
         }

         const actualMajor = getOpencodeMajorVersion(version);
         if (expectedMajor !== null && actualMajor !== null && actualMajor !== expectedMajor) {
            logger?.log('Health identity check found a different OpenCode major version', {
               expectedOcVersion,
               actualVersion: version,
               port,
               healthPath,
            });
            continue;
         }

         if (expectedOcVersion && expectedOcVersion !== 'latest' && version !== expectedOcVersion) {
            logger?.log('Health identity check found version mismatch', {
               expectedOcVersion,
               actualVersion: version,
               port,
               healthPath,
            });
         }

         return true;
      } catch {
         // Try the next health endpoint.
      }
   }

   return false;
}

function delay(ms: number): Promise<void> {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Generate a URL-safe password for an OpenCode V2 server. */
function generateServerPassword(): string {
   return randomBytes(24).toString('base64url');
}

/** Build the Basic auth header OpenCode V2 expects for API requests. */
function basicAuthHeader(password: string): string {
   return `Basic ${Buffer.from(`opencode:${password}`).toString('base64')}`;
}

function isProcessAlive(pid: number): boolean {
   try {
      process.kill(pid, 0);
      return true;
   } catch {
      return false;
   }
}

function normalizeOrigins(origins: string[]): string[] {
   return Array.from(new Set(origins.map((origin) => origin.trim()).filter(Boolean))).sort();
}

function sameOrigins(left: string[], right: string[]): boolean {
   const a = normalizeOrigins(left);
   const b = normalizeOrigins(right);
   return a.length === b.length && a.every((origin, index) => origin === b[index]);
}

function mergeOrigins(baseOrigins: string[], extraOrigins: string[]): string[] {
   return normalizeOrigins([...baseOrigins, ...extraOrigins]);
}

function errorMessage(error: unknown): string {
   return error instanceof Error ? error.message : String(error);
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

   const managedSessions = new Map<number, ManagedSession>();
   const ownerToken = getOrCreateNativeHostOwnerToken();
   const managedPids = loadPersistedManagedPids(ownerToken);
   let cleanupTriggered = false;
   let adoptionPromise: Promise<void> | null = null;
   let lastAdoptionAttemptAt = 0;
   logger.log('Native host owner token initialized', {
      ownerToken,
      restoredManagedPidCount: managedPids.size,
   });

   const sessionPayload = (session: ManagedSession) => ({
      port: session.port,
      url: session.url,
      pid: session.pid,
      requestedPort: session.requestedPort,
      autoSelected: session.autoSelected,
      keepAlive: session.keepAlive,
      ready: session.ready,
      adopted: session.adopted,
      password: session.password,
   });

   const sessionLogPayload = (session: ManagedSession) => ({
      ...sessionPayload(session),
      password: session.password ? '[redacted]' : null,
   });

   /** Prefer a ready session, otherwise return the first tracked one. */
   const getPrimarySession = (): ManagedSession | null => {
      const sessions = Array.from(managedSessions.values());
      return sessions.find((session) => session.ready) ?? sessions[0] ?? null;
   };

   /** Persist the session metadata needed to adopt it after a host restart. */
   const persistSession = (session: ManagedSession) => {
      writeNativeHostSessionMetadata({
         port: session.port,
         pid: session.pid,
         ownerToken,
         updatedAt: new Date().toISOString(),
         url: session.url,
         requestedPort: session.requestedPort,
         autoSelected: session.autoSelected,
         keepAlive: session.keepAlive,
         origins: session.origins,
         ocVersion: session.ocVersion,
         password: session.password,
      });
   };

   /** Track a freshly spawned server and persist its port/password metadata. */
   const registerManagedSession = (
      selection: PortSelection,
      proc: ReturnType<typeof spawn>,
      origins: string[],
      ocVersion: string,
      keepAlive: boolean,
      adopted: boolean,
      password: string,
   ): ManagedSession => {
      const session: ManagedSession = {
         port: selection.port,
         proc,
         pid: proc.pid ?? 0,
         startedAt: Date.now(),
         url: `http://localhost:${selection.port}`,
         requestedPort: selection.requestedPort,
         autoSelected: selection.autoSelected,
         keepAlive,
         ready: false,
         adopted,
         origins,
         ocVersion,
         password,
      };

      managedSessions.set(selection.port, session);
      if (session.pid > 0) {
         managedPids.add(session.pid);
      }
      persistSession(session);
      return session;
   };

   const unregisterManagedSession = (port: number) => {
      const session = managedSessions.get(port);
      if (session && session.pid) {
         managedPids.delete(session.pid);
      }
      managedSessions.delete(port);
      deleteNativeHostSessionMetadata(port);
   };

   /** Stop one server and clean up its persisted metadata. */
   const stopManagedSession = (session: ManagedSession, reason: string) => {
      logger.log(`Stopping managed session on port ${session.port}`, {
         reason,
         pid: session.pid,
         adopted: session.adopted,
      });

      try {
         if (session.proc) {
            session.proc.kill();
         }

         // On Windows a `.cmd`/`npx` launcher can exit after spawning the real
         // server, so also clean up by port and command-line marker.
         const extensionOrigins = session.origins.filter((origin) =>
            origin.startsWith('chrome-extension://'),
         );
         killProcessOnPort(session.port, managedPids, logger, {
            allowedOwnerToken: ownerToken,
            allowUnmanagedOpencode: extensionOrigins.length > 0,
            managedMarkers: extensionOrigins,
         });
      } catch (error) {
         logger.error(`Failed to stop session on port ${session.port}`, error);
      }

      unregisterManagedSession(session.port);
   };

   /** Stop every session tracked by this native host process. */
   const stopAllManagedSessions = (reason: string) => {
      for (const session of Array.from(managedSessions.values())) {
         stopManagedSession(session, reason);
      }
   };

   /**
    * Pick up keep-alive servers left behind by an earlier native host process.
    * Without this, the next browser session would start a second server on a
    * different port while the first one is still running.
    */
   const adoptPersistedSessions = (force: boolean = false): Promise<void> => {
      if (adoptionPromise) {
         return adoptionPromise;
      }

      const now = Date.now();
      if (!force && now - lastAdoptionAttemptAt < 2000) {
         return Promise.resolve();
      }
      lastAdoptionAttemptAt = now;

      adoptionPromise = (async () => {
         const persisted = loadNativeHostSessions(ownerToken);
         for (const metadata of persisted) {
            if (managedSessions.has(metadata.port)) {
               continue;
            }

            let healthy = await isLikelyOpenCodeServerOnPort(
               metadata.port,
               metadata.ocVersion,
               logger,
               metadata.password,
            );

            // A keep-alive server can still be booting when the browser
            // reconnects. Wait briefly for recently written metadata before
            // assuming it is an orphan and starting a second server.
            const updatedAt = Date.parse(metadata.updatedAt);
            const recentlyStarted =
               Number.isFinite(updatedAt) && Date.now() - updatedAt < 30_000;
            const processAlive = isProcessAlive(metadata.pid);

            if (!healthy && recentlyStarted && processAlive) {
               for (let attempt = 0; attempt < 5 && !healthy; attempt++) {
                  await delay(400);
                  healthy = await isLikelyOpenCodeServerOnPort(
                     metadata.port,
                     metadata.ocVersion,
                     logger,
                     metadata.password,
                  );
               }
            }

            if (!healthy) {
               if (!processAlive) {
                  deleteNativeHostSessionMetadata(metadata.port);
               }
               continue;
            }

            const session: ManagedSession = {
               port: metadata.port,
               proc: null,
               pid: metadata.pid,
               startedAt: updatedAt || Date.now(),
               url: metadata.url || `http://localhost:${metadata.port}`,
               requestedPort: metadata.requestedPort ?? null,
               autoSelected: metadata.autoSelected === true,
               keepAlive: metadata.keepAlive === true,
               ready: true,
               adopted: true,
               origins: normalizeOrigins(metadata.origins ?? []),
               ocVersion: metadata.ocVersion ?? '',
               password: metadata.password ?? '',
            };

            managedSessions.set(session.port, session);
            managedPids.add(session.pid);
            logger.log('Adopted persisted OpenCode session', sessionLogPayload(session));
         }
      })()
         .catch((error) => {
            logger.error('Failed to adopt persisted sessions', error);
         })
         .finally(() => {
            adoptionPromise = null;
         });

      return adoptionPromise;
   };

   /** Poll the server until it is healthy or the process exits. */
   const waitForServerHealthy = async (
      port: number,
      proc: ReturnType<typeof spawn>,
      expectedOcVersion?: string,
      password?: string,
   ): Promise<boolean> => {
      for (let attempt = 1; attempt <= SERVER_READY_TIMEOUT_ATTEMPTS; attempt++) {
         if (proc.exitCode !== null || proc.killed) {
            logger.log(`Server process exited before becoming ready on port ${port}`);
            return false;
         }

         if (await isLikelyOpenCodeServerOnPort(port, expectedOcVersion, logger, password)) {
            logger.log(`Server ready on port ${port} after ${attempt} attempts`);
            return true;
         }

         await delay(SERVER_READY_POLL_INTERVAL_MS);
      }

      logger.log(`Server not ready on port ${port} after ${SERVER_READY_TIMEOUT_ATTEMPTS} attempts`);
      return false;
   };

   /** Reply to `ping`/`status` with the current endpoint and session list. */
   const sendStatus = (type: 'pong' | 'status') => {
      const primary = getPrimarySession();
      const sessions = Array.from(managedSessions.values()).map(sessionPayload);
      const payload: ServerStatusPayload = {
         status: primary ? (primary.ready ? 'running' : 'starting') : 'stopped',
         port: primary?.port ?? null,
         url: primary?.url ?? null,
         pid: primary?.pid ?? null,
         requestedPort: primary?.requestedPort ?? null,
         autoSelected: primary?.autoSelected ?? false,
         keepAlive: primary?.keepAlive ?? false,
         ready: primary?.ready ?? false,
         adopted: primary?.adopted ?? false,
         password: primary?.password ?? null,
         sessions,
      };

      if (type === 'pong') {
         sendMessage({ type: 'pong', timestamp: Date.now(), ...payload });
         return;
      }

      sendMessage({ type: 'status', ...payload });
   };

   /**
    * Reuse a healthy session when compatible, otherwise start a new server on
    * the preferred port or the next available one.
    */
   const startServer = async (
      requestedPort: number | null = null,
      extraOrigins: string[] = [],
      requestedOcVersion?: string,
      options: { forceRestart?: boolean; keepAlive?: boolean; password?: string } = {},
   ) => {
      try {
         await adoptPersistedSessions(true);

         const resolvedVersion = resolveOcVersion(
            requestedOcVersion || parseOcVersionFromArgv(process.argv),
         );
         const keepAlive = options.keepAlive === true;
         const preferredPort = requestedPort ?? DEFAULT_OPENCODE_PORT;
         const baseOrigins = getAllowedCorsOrigins();
         const effectiveOrigins = mergeOrigins(baseOrigins, extraOrigins);
         const activeSession = getPrimarySession();
         const requestedPassword = options.password?.trim();
         const serverPassword =
            requestedPassword || activeSession?.password || generateServerPassword();

         if (!options.forceRestart && activeSession) {
            const healthy =
               activeSession.ready &&
               (await isLikelyOpenCodeServerOnPort(
                  activeSession.port,
                  resolvedVersion,
                  logger,
                  serverPassword,
               ));

            const sameConfig =
               sameOrigins(activeSession.origins, effectiveOrigins) &&
               activeSession.ocVersion === resolvedVersion &&
               activeSession.keepAlive === keepAlive &&
               activeSession.password === serverPassword;

            if (healthy && sameConfig) {
               activeSession.ready = true;
               persistSession(activeSession);
               logger.log('Reusing running OpenCode session', sessionLogPayload(activeSession));
               sendMessage({
                  status: 'running',
                  ...sessionPayload(activeSession),
                  reused: true,
                  message: 'OpenCode server is already running',
               });
               return;
            }
         }

         const hadManagedSessions = managedSessions.size > 0;
         stopAllManagedSessions('starting a new server');

         if (hadManagedSessions) {
            // Give a terminated server a moment to release its socket before
            // deciding that the preferred port is unavailable.
            await delay(500);
         }

         // A keep-alive server from an earlier host may still own the preferred
         // port. Reclaim processes that belong to this installation (owner
         // token or our extension origin in the command line); leave anything
         // else alone and let the scan move to the next free port.
         if (!(await isPortAvailable(preferredPort))) {
            const extensionOrigins = effectiveOrigins.filter((origin) =>
               origin.startsWith('chrome-extension://'),
            );
            const killedOwned = killProcessOnPort(preferredPort, managedPids, logger, {
               allowedOwnerToken: ownerToken,
               allowUnmanagedOpencode: extensionOrigins.length > 0,
               managedMarkers: extensionOrigins,
            });
            if (killedOwned) {
               await delay(750);
            }
         }

         logger.log(`Using OpenCode version: ${resolvedVersion}`);
         logger.log(`Using OpenCode config directory: ${getCalycodeOpencodeConfigDir()}`);
         logger.log(`Using OpenCode working directory: ${getOpencodeWorkingDir('server')}`);

         const excludedPorts = new Set<number>();
         let lastError: Error | null = null;

         for (let attempt = 1; attempt <= MAX_START_ATTEMPTS; attempt++) {
            let selection: PortSelection;
            try {
               selection = await selectAvailablePort(preferredPort, {
                  exclude: excludedPorts,
               });
            } catch (error) {
               lastError = error instanceof Error ? error : new Error(String(error));
               logger.error('No port available for OpenCode server', lastError);
               break;
            }

            logger.log(`Selected port ${selection.port}`, {
               requestedPort,
               autoSelected: selection.autoSelected,
               source: selection.source,
               attempt,
            });

            sendMessage({
               status: 'starting',
               port: selection.port,
               url: `http://localhost:${selection.port}`,
               pid: null,
               requestedPort: selection.requestedPort,
               autoSelected: selection.autoSelected,
               keepAlive,
               ready: false,
               password: serverPassword,
               message: selection.autoSelected
                  ? `Port ${preferredPort} is unavailable; starting on ${selection.port} instead.`
                  : 'Starting OpenCode server...',
            });

            let launched: LaunchedOpencodeServer;
            try {
               launched = launchServer({
                  port: selection.port,
                  password: serverPassword,
                  extraOrigins,
                  allowedOrigins: baseOrigins,
                  stdio: 'ignore',
                  detach: keepAlive,
                  ocVersion: resolvedVersion,
                  ownerToken,
                  // A matching global OpenCode executable is still a direct
                  // binary, so prefer it over the npx/.cmd shim when the
                  // managed install is unavailable.
                  allowGlobalFallback: true,
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
            } catch (error) {
               lastError = error instanceof Error ? error : new Error(String(error));
               logger.error(`Failed to launch OpenCode on port ${selection.port}`, lastError);
               excludedPorts.add(selection.port);
               continue;
            }

            logger.log(`Spawning ${launched.plan.displayCommand}`);
            logger.log(`OpenCode launcher source: ${launched.plan.source}`);

            const proc = launched.proc;
            if (keepAlive) {
               // Let the server outlive the native host (and the browser's
               // native messaging port) when the extension asks for it.
               proc.unref();
            }

            const session = registerManagedSession(
               selection,
               proc,
               effectiveOrigins,
               resolvedVersion,
               keepAlive,
               false,
               serverPassword,
            );

            proc.on('error', (error) => {
               logger.error('Failed to spawn server process', error);
               const current = managedSessions.get(selection.port);
               if (current?.proc === proc) {
                  sendMessage({
                     status: 'error',
                     message: `Failed to spawn server: ${error.message}`,
                     port: selection.port,
                     url: session.url,
                     requestedPort: selection.requestedPort,
                     autoSelected: selection.autoSelected,
                     keepAlive,
                     password: serverPassword,
                  });
               }
            });

            proc.on('exit', (code) => {
               const current = managedSessions.get(selection.port);
               if (!current || current.proc !== proc) {
                  logger.log(
                     `Ignoring exit from stale server process ${proc.pid} on port ${selection.port}`,
                  );
                  return;
               }

               logger.log(`Server process exited with code ${code}`, {
                  port: selection.port,
                  wasReady: current.ready,
               });

               const wasReady = current.ready;
               unregisterManagedSession(selection.port);

               if (wasReady) {
                  sendMessage({
                     status: 'stopped',
                     port: selection.port,
                     url: session.url,
                     requestedPort: selection.requestedPort,
                     autoSelected: selection.autoSelected,
                     keepAlive,
                     code,
                  });
               }
            });

            const isReady = await waitForServerHealthy(
               selection.port,
               proc,
               resolvedVersion,
               serverPassword,
            );
            if (isReady) {
               session.ready = true;
               persistSession(session);
               logger.log('Server is now running and ready', sessionLogPayload(session));
               sendMessage({
                  status: 'running',
                  ...sessionPayload(session),
                  requestedPort: selection.requestedPort,
                  autoSelected: selection.autoSelected,
                  message: 'Server is ready',
               });
               return;
            }

            lastError = new Error(
               `OpenCode did not become healthy on port ${selection.port}`,
            );
            logger.error('OpenCode server failed to become ready', {
               port: selection.port,
               attempt,
            });

            try {
               proc.kill();
            } catch {
               // Already gone.
            }
            unregisterManagedSession(selection.port);
            excludedPorts.add(selection.port);
            await delay(300);
         }

         sendMessage({
            status: 'error',
            message:
               lastError?.message ||
               `Unable to start the OpenCode server on any available port.`,
            port: null,
            url: null,
            requestedPort: preferredPort,
            autoSelected: false,
            keepAlive,
         });
      } catch (error) {
         logger.error('Unexpected error starting server', error);
         sendMessage({
            status: 'error',
            message: errorMessage(error),
            port: null,
            url: null,
            requestedPort: requestedPort ?? DEFAULT_OPENCODE_PORT,
            autoSelected: false,
            keepAlive: options.keepAlive === true,
         });
      }
   };

   /** Force a fresh server, optionally on a different preferred port. */
   const restartServer = async (
      requestedPort: number | null = null,
      extraOrigins: string[] = [],
      requestedOcVersion?: string,
      keepAlive: boolean = false,
      password?: string,
   ) => {
      logger.log('Restart requested', { requestedPort, extraOrigins, requestedOcVersion });
      await startServer(requestedPort, extraOrigins, requestedOcVersion, {
         forceRestart: true,
         keepAlive,
         password,
      });
   };

   /** Read a non-empty password from a native message. */
   const requestedPasswordFrom = (msg: any): string | undefined => {
      if (typeof msg?.password !== 'string') {
         return undefined;
      }

      const value = msg.password.trim();
      return value || undefined;
   };

   const handleMessage = async (msg: any) => {
      logger.log('Received message', {
         ...msg,
         password: msg?.password ? '[redacted]' : undefined,
      });

      try {
         if (msg.type === 'ping') {
            await adoptPersistedSessions();
            sendStatus('pong');
         } else if (msg.type === 'status') {
            await adoptPersistedSessions();
            sendStatus('status');
         } else if (msg.type === 'start') {
            let requestedPort: number | null;
            try {
               requestedPort = parsePortRequest(msg.port);
            } catch (error) {
               logger.error('Invalid port in message', { port: msg.port, error });
               sendMessage({
                  status: 'error',
                  message: errorMessage(error),
                  port: null,
                  url: null,
                  requestedPort: null,
                  autoSelected: false,
               });
               return;
            }

            const knownIds = resolveAllowedExtensionIds().ids;
            const origins = filterAndValidateOrigins(msg.origins, knownIds);
            const requestedOcVersion = typeof msg.ocVersion === 'string' ? msg.ocVersion : undefined;
            const keepAlive = msg.keepAlive === true;
            await startServer(requestedPort, origins, requestedOcVersion, {
               keepAlive,
               password: requestedPasswordFrom(msg),
            });
         } else if (msg.type === 'restart') {
            let requestedPort: number | null;
            try {
               requestedPort = parsePortRequest(msg.port);
            } catch (error) {
               logger.error('Invalid port in message', { port: msg.port, error });
               sendMessage({
                  status: 'error',
                  message: errorMessage(error),
                  port: null,
                  url: null,
                  requestedPort: null,
                  autoSelected: false,
               });
               return;
            }

            const knownIds = resolveAllowedExtensionIds().ids;
            const origins = filterAndValidateOrigins(msg.origins, knownIds);
            const requestedOcVersion = typeof msg.ocVersion === 'string' ? msg.ocVersion : undefined;
            const keepAlive = msg.keepAlive === true;
            await restartServer(
               requestedPort,
               origins,
               requestedOcVersion,
               keepAlive,
               requestedPasswordFrom(msg),
            );
         } else if (msg.type === 'stop') {
            let requestedPort: number | null;
            try {
               requestedPort = parsePortRequest(msg.port);
            } catch (error) {
               logger.error('Invalid port in message', { port: msg.port, error });
               sendMessage({
                  status: 'error',
                  message: errorMessage(error),
                  port: null,
                  url: null,
                  requestedPort: null,
                  autoSelected: false,
               });
               return;
            }

            await adoptPersistedSessions();

            if (requestedPort === null) {
               const ports = Array.from(managedSessions.keys());
               logger.log('Stop requested for all managed sessions', { ports });
               stopAllManagedSessions('stop requested');
               sendMessage({
                  status: 'stopped',
                  port: null,
                  url: null,
                  ports,
                  message: ports.length > 0
                     ? `Stopped ${ports.length} OpenCode server(s)`
                     : 'No OpenCode server was running',
               });
               return;
            }

            const session = managedSessions.get(requestedPort);
            if (session) {
               stopManagedSession(session, 'stop requested');
               sendMessage({
                  status: 'stopped',
                  port: requestedPort,
                  url: null,
                  message: `Server on port ${requestedPort} stopped`,
               });
               return;
            }

            const killed = killProcessOnPort(requestedPort, managedPids, logger, {
               allowedOwnerToken: ownerToken,
            });
            if (killed) {
               deleteNativeHostSessionMetadata(requestedPort);
               sendMessage({
                  status: 'stopped',
                  port: requestedPort,
                  url: null,
                  message: `Server on port ${requestedPort} stopped`,
               });
               return;
            }

            const likelyOpenCode = await isLikelyOpenCodeServerOnPort(
               requestedPort,
               undefined,
               logger,
            );
            if (likelyOpenCode) {
               sendMessage({
                  status: 'error',
                  message:
                     `Server on port ${requestedPort} appears to be running but is not owned by this native host session. ` +
                     'Refusing to stop it automatically for safety.',
                  port: requestedPort,
                  url: null,
               });
            } else {
               sendMessage({
                  status: 'error',
                  message: `No managed server on port ${requestedPort}`,
                  port: requestedPort,
                  url: null,
               });
            }
         } else {
            sendMessage({ status: 'received', received: msg });
         }
      } catch (error) {
         logger.error('Error handling message', error);
         sendMessage({ status: 'error', message: 'Internal error processing message' });
      }
   };

   let messageQueue = Promise.resolve();

   /** Serialize message handling so two starts cannot race for a port. */
   const enqueueMessage = (msg: unknown) => {
      messageQueue = messageQueue
         .then(() => handleMessage(msg))
         .catch((error) => {
            logger.error('Unhandled error while processing native message', error);
         });
   };

   // Cleanup function to kill managed server sessions and exit cleanly.
   // Keep-alive sessions are intentionally left running: they are owned by the
   // extension and are adopted by the next native host process.
   /** Kill non-keep-alive sessions and exit the native host process. */
   const cleanup = (reason: string) => {
      if (cleanupTriggered) {
         return;
      }
      cleanupTriggered = true;
      logger.log(`Cleanup triggered: ${reason}`);

      for (const [sessionPort, session] of managedSessions) {
         if (session.keepAlive) {
            logger.log(`Leaving keep-alive session on port ${sessionPort} running`);
            continue;
         }

         logger.log(`Killing managed session on port ${sessionPort}`);
         try {
            session.proc?.kill();
         } catch {
            // Already dead.
         }

         const extensionOrigins = session.origins.filter((origin) =>
            origin.startsWith('chrome-extension://'),
         );
         killProcessOnPort(sessionPort, managedPids, logger, {
            allowedOwnerToken: ownerToken,
            allowUnmanagedOpencode: extensionOrigins.length > 0,
            managedMarkers: extensionOrigins,
         });

         if (session.pid) {
            managedPids.delete(session.pid);
         }
         deleteNativeHostSessionMetadata(sessionPort);
      }
      managedSessions.clear();

      process.exit(0);
   };

   // Listen for messages from Chrome (stdin).
   // Chrome sends length-prefixed JSON.
   // CRITICAL: On Windows, stdin must be in raw binary mode for Native Messaging.

   if (process.stdin.isTTY) {
      logger.log('Warning: stdin is a TTY, Native Messaging may not work correctly');
   }

   process.stdin.resume();

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
                  enqueueMessage(msg);
               } catch (error) {
                  logger.error('Failed to parse JSON message', error);
               }
            } else {
               break;
            }
         }
      }
   });

   // Handle stdin close - Chrome extension disconnected.
   process.stdin.on('end', () => {
      logger.log('stdin end event received', {
         receivedAnyData: inputBuffer.length > 0 || expectedLength !== null,
         bufferLength: inputBuffer.length,
      });
      setTimeout(() => {
         cleanup('stdin end (extension disconnected)');
      }, 100);
   });

   process.stdin.on('close', () => {
      logger.log('stdin close event received');
      cleanup('stdin close (extension disconnected)');
   });

   process.stdin.on('error', (error) => {
      logger.error('stdin error', error);
      cleanup('stdin error');
   });

   process.on('SIGINT', () => {
      cleanup('SIGINT received');
   });

   process.on('SIGTERM', () => {
      cleanup('SIGTERM received');
   });

   process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      cleanup('uncaughtException');
   });
}
