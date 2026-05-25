import { font } from '../../utils/methods/font';
import { log } from '@clack/prompts';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { spawn, execSync, execFileSync } from 'node:child_process';
import { HOST_APP_INFO } from '../../utils/host-constants';
import { GitHubContentFetcher } from '../../utils/github-content-fetcher';
import { resolveAllowedExtensionIds } from './native-host/discovery';
import {
   setupNativeHostRegistration,
   showNativeHostStatus as showNativeHostStatusImpl,
} from './native-host/setup';

const DEFAULT_OPENCODE_VERSION = 'latest';
const OC_VERSION_REGEX = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const MAX_NATIVE_MESSAGE_SIZE = 1 * 1024 * 1024;
const NATIVE_HOST_PORT_RANGE_START = 4096;
const NATIVE_HOST_PORT_RANGE_SIZE = 32;
const NATIVE_HOST_PORT_RANGE_END = NATIVE_HOST_PORT_RANGE_START + NATIVE_HOST_PORT_RANGE_SIZE - 1;
const MAX_CORS_ORIGINS = 10;
const CHROME_EXTENSION_ORIGIN_REGEX = /^chrome-extension:\/\/[a-p]{32}$/;
const NATIVE_HOST_STATE_DIR = path.join(getCalycodeOpencodeConfigDir(), 'native-host-state');
const NATIVE_HOST_OWNER_TOKEN_PATH = path.join(NATIVE_HOST_STATE_DIR, 'owner-token.txt');

interface NativeHostSessionMetadata {
   port: number;
   pid: number;
   ownerToken: string;
   updatedAt: string;
}

interface LaunchOpencodeServerOptions {
   port: number;
   extraOrigins?: string[];
   stdio?: 'inherit' | 'pipe' | 'ignore';
   detach?: boolean;
   ocVersion?: string;
   ownerToken?: string;
   allowGlobalFallback?: boolean;
   onManagedFail?: (err: Error) => void;
   onGlobalVersionMismatch?: (details: {
      expectedVersion: string;
      actualVersion?: string;
      globalBinaryPath: string;
   }) => void;
}

interface OpencodeSpawnPlan {
   command: string;
   args: string[];
   source: 'env' | 'managed' | 'global' | 'npx';
   displayCommand: string;
   needsShell: boolean;
}

interface ManagedSession {
   port: number;
   proc: ReturnType<typeof spawn>;
   pid: number;
   startedAt: number;
}

interface LaunchedOpencodeServer {
   proc: ReturnType<typeof spawn>;
   plan: OpencodeSpawnPlan;
}

function normalizeOcVersion(rawVersion?: string): string | undefined {
   const value = rawVersion?.trim();
   return value ? value : undefined;
}

function parseOcVersionFromArgv(argv: string[]): string | undefined {
   for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      if (arg === '--oc-version') {
         return normalizeOcVersion(argv[i + 1]);
      }
      if (arg.startsWith('--oc-version=')) {
         return normalizeOcVersion(arg.slice('--oc-version='.length));
      }
   }
   return undefined;
}

function resolveOcVersion(explicitVersion?: string): string {
   const explicit = normalizeOcVersion(explicitVersion);
   if (explicit) {
      if (explicit !== 'latest' && !OC_VERSION_REGEX.test(explicit)) {
         throw new Error(
            `Invalid OpenCode version "${explicit}". Use "latest" or semantic version format like "1.14.41".`,
         );
      }
      return explicit;
   }

   const fromEnv = normalizeOcVersion(process.env.CALY_OC_OPENCODE_VERSION);
   if (fromEnv) {
      if (fromEnv !== 'latest' && !OC_VERSION_REGEX.test(fromEnv)) {
         throw new Error(
            `Invalid CALY_OC_OPENCODE_VERSION "${fromEnv}". Use "latest" or semantic version format like "1.14.41".`,
         );
      }
      return fromEnv;
   }

   return DEFAULT_OPENCODE_VERSION;
}

function getOpencodePackageSpecifier(version: string): string {
   return `opencode-ai@${version}`;
}

function getManagedOpencodeVersionsDir(): string {
   return path.join(getCalycodeOpencodeConfigDir(), 'versions');
}

function getManagedOpencodeInstallDir(version: string): string {
   return path.join(getManagedOpencodeVersionsDir(), version);
}

function getManagedOpencodeBinPath(version: string): string {
   const binName = process.platform === 'win32' ? 'opencode.cmd' : 'opencode';
   return path.join(getManagedOpencodeInstallDir(version), 'node_modules', '.bin', binName);
}

function parseManagedVersion(version: string): {
   major: number;
   minor: number;
   patch: number;
   prerelease?: string;
} | null {
   if (!OC_VERSION_REGEX.test(version)) {
      return null;
   }

   const normalized = version.split('+')[0];
   const [core, prerelease] = normalized.split('-', 2);
   const parts = (core || '').split('.').map((n) => Number.parseInt(n, 10));
   if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) {
      return null;
   }

   return {
      major: parts[0],
      minor: parts[1],
      patch: parts[2],
      prerelease,
   };
}

function compareManagedVersionsDesc(a: string, b: string): number {
   const av = parseManagedVersion(a);
   const bv = parseManagedVersion(b);
   if (!av && !bv) return b.localeCompare(a);
   if (!av) return 1;
   if (!bv) return -1;

   if (av.major !== bv.major) return bv.major - av.major;
   if (av.minor !== bv.minor) return bv.minor - av.minor;
   if (av.patch !== bv.patch) return bv.patch - av.patch;

   const aPre = av.prerelease;
   const bPre = bv.prerelease;
   if (!aPre && bPre) return -1; // stable > prerelease
   if (aPre && !bPre) return 1;
   if (!aPre && !bPre) return 0;
   return (bPre || '').localeCompare(aPre || '');
}

function pruneManagedOpencodeVersions(keepLatest: number = 5): void {
   try {
      const versionsDir = getManagedOpencodeVersionsDir();
      if (!fs.existsSync(versionsDir)) {
         return;
      }

      const entries = fs
         .readdirSync(versionsDir, { withFileTypes: true })
         .filter((entry) => entry.isDirectory())
         .map((entry) => entry.name)
         .filter((name) => OC_VERSION_REGEX.test(name))
         .sort(compareManagedVersionsDesc);

      const toDelete = entries.slice(Math.max(keepLatest, 0));
      for (const version of toDelete) {
         const target = path.join(versionsDir, version);
         try {
            fs.rmSync(target, { recursive: true, force: true });
         } catch {
            // Best effort cleanup only.
         }
      }
   } catch {
      // Best effort cleanup only.
   }
}

function fileExists(candidatePath: string): boolean {
   try {
      return fs.existsSync(candidatePath);
   } catch {
      return false;
   }
}

function isTruthy(value?: string): boolean {
   return ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase());
}

function shouldUseManagedOpencodeInstall(): boolean {
   return !isTruthy(process.env.CALY_OC_DISABLE_MANAGED_INSTALL);
}

function findGlobalOpencodeBinary(): string | undefined {
   try {
      const command = process.platform === 'win32' ? 'where opencode' : 'which opencode';
      const output = execSync(command, {
         encoding: 'utf8',
         stdio: ['ignore', 'pipe', 'ignore'],
      })
         .split(/\r?\n/)
         .map((line) => line.trim())
         .find(Boolean);

      if (!output) {
         return undefined;
      }

      return fileExists(output) ? output : undefined;
   } catch {
      return undefined;
   }
}

function getOpencodeBinaryVersion(binaryPath: string): string | undefined {
   try {
      const output = execFileSync(binaryPath, ['--version'], {
         encoding: 'utf8',
         stdio: ['ignore', 'pipe', 'ignore'],
         windowsHide: true,
      })
         .toString()
         .trim();

      const match = output.match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/);
      return match?.[0];
   } catch {
      return undefined;
   }
}

function ensureManagedOpencodeInstalled(version: string): string {
   const managedBinPath = getManagedOpencodeBinPath(version);
   if (fileExists(managedBinPath)) {
      pruneManagedOpencodeVersions(5);
      return managedBinPath;
   }

   const installDir = getManagedOpencodeInstallDir(version);
   ensureDirectoryExists(installDir);

   const packageSpecifier = getOpencodePackageSpecifier(version);
   execFileSync('npm', ['install', '--no-save', '--prefix', installDir, packageSpecifier], {
      stdio: 'ignore',
      env: process.env,
   });

   if (!fileExists(managedBinPath)) {
      throw new Error(
         `Managed OpenCode install completed but launcher not found at ${managedBinPath}.`,
      );
   }

   if (process.platform === 'darwin') {
      try {
         execFileSync('xattr', ['-dr', 'com.apple.quarantine', installDir], {
            stdio: 'ignore',
         });
      } catch {
         // Best effort only.
      }
   }

   pruneManagedOpencodeVersions(5);

   return managedBinPath;
}

function buildOpencodeSpawnPlan(
   version: string,
   opencodeArgs: string[],
   options?: {
      ensureManagedInstall?: boolean;
      allowGlobalFallback?: boolean;
      onManagedFail?: (err: Error) => void;
      onGlobalVersionMismatch?: (details: {
         expectedVersion: string;
         actualVersion?: string;
         globalBinaryPath: string;
      }) => void;
   },
): OpencodeSpawnPlan {
   const explicitBin = process.env.CALY_OC_OPENCODE_BIN?.trim();
   if (explicitBin) {
      if (!fileExists(explicitBin)) {
         throw new Error(`CALY_OC_OPENCODE_BIN is set but not found: ${explicitBin}`);
      }
      return {
         command: explicitBin,
         args: opencodeArgs,
         source: 'env',
         displayCommand: `${explicitBin} ${opencodeArgs.join(' ')}`.trim(),
         needsShell: false,
      };
   }

   const managedEnabled = shouldUseManagedOpencodeInstall();
   const managedBin = getManagedOpencodeBinPath(version);
   if (managedEnabled && fileExists(managedBin)) {
      return {
         command: managedBin,
         args: opencodeArgs,
         source: 'managed',
         displayCommand: `${managedBin} ${opencodeArgs.join(' ')}`.trim(),
         needsShell: false,
      };
   }

   if (managedEnabled && options?.ensureManagedInstall !== false) {
      try {
         const installedBin = ensureManagedOpencodeInstalled(version);
         return {
            command: installedBin,
            args: opencodeArgs,
            source: 'managed',
            displayCommand: `${installedBin} ${opencodeArgs.join(' ')}`.trim(),
            needsShell: false,
         };
      } catch (err) {
         if (options?.onManagedFail) {
            options.onManagedFail(err instanceof Error ? err : new Error(String(err)));
         }
      }
   }

   const allowGlobalFallback = options?.allowGlobalFallback !== false;
   if (allowGlobalFallback) {
      const globalOpencode = findGlobalOpencodeBinary();
      if (globalOpencode) {
         const globalVersion = getOpencodeBinaryVersion(globalOpencode);
         const isPinnedVersion = version !== 'latest';
         if (!isPinnedVersion || globalVersion === version) {
            return {
               command: globalOpencode,
               args: opencodeArgs,
               source: 'global',
               displayCommand: `${globalOpencode} ${opencodeArgs.join(' ')}`.trim(),
               needsShell: false,
            };
         }

         if (options?.onGlobalVersionMismatch) {
            options.onGlobalVersionMismatch({
               expectedVersion: version,
               actualVersion: globalVersion,
               globalBinaryPath: globalOpencode,
            });
         }

         // Global binary exists but does not match requested version; fall back to npx.
         // This preserves strict version pinning behavior.
      }
   }

   const npxArgs = ['-y', getOpencodePackageSpecifier(version), ...opencodeArgs];
   return {
      command: 'npx',
      args: npxArgs,
      source: 'npx',
      displayCommand: `npx ${npxArgs.join(' ')}`,
      needsShell: process.platform === 'win32',
   };
}

function warnIfUsingNonDefaultOcVersion(version: string): void {
   if (version !== DEFAULT_OPENCODE_VERSION) {
      log.warn(
         `Using OpenCode ${version} (override). Default channel is ${DEFAULT_OPENCODE_VERSION}.`,
      );
   }
}

function launchOpencodeServer({
   port,
   extraOrigins = [],
   stdio = 'inherit',
   detach = false,
   ocVersion,
   ownerToken,
   allowGlobalFallback,
   onManagedFail,
   onGlobalVersionMismatch,
}: LaunchOpencodeServerOptions) {
   validatePort(port);

   const resolvedVersion = resolveOcVersion(ocVersion);
   const opencodeArgs = [
      'serve',
      '--port',
      String(port),
      ...getCorsArgs(extraOrigins),
   ];
   const plan = buildOpencodeSpawnPlan(resolvedVersion, opencodeArgs, {
      allowGlobalFallback,
      onManagedFail,
      onGlobalVersionMismatch,
   });
   const configDir = getCalycodeOpencodeConfigDir();
   const workingDir = getOpencodeWorkingDir('server');
   const extraEnv: Record<string, string> = { OPENCODE_CONFIG_DIR: configDir };
   if (ownerToken) {
      extraEnv.CALY_OC_NATIVE_OWNER_TOKEN = ownerToken;
   }

   const proc = spawn(plan.command, plan.args, {
      ...getSpawnOptions(stdio, extraEnv, workingDir, plan.needsShell),
      detached: detach,
   });

   return {
      proc,
      plan,
   } as LaunchedOpencodeServer;
}

/**
 * Get spawn options appropriate for the current platform.
 * @param stdio - Standard I/O handling mode
 * @param extraEnv - Additional environment variables to pass to the child process
 * @param cwd - Working directory for the child process
 * @param needsShell - Whether the command requires a shell wrapper (e.g. npx on Windows)
 */
function getSpawnOptions(
   stdio: 'inherit' | 'pipe' | 'ignore' = 'inherit',
   extraEnv?: Record<string, string>,
   cwd?: string,
   needsShell: boolean = false,
) {
   return {
      stdio,
      shell: needsShell,
      cwd,
      env: extraEnv ? { ...process.env, ...extraEnv } : process.env,
   };
}

/**
 * Validates a port number to ensure it's a safe integer in valid range.
 * @param port - Port number to validate
 * @throws {Error} if port is invalid
 */
function validatePort(port: number): void {
   if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}. Must be an integer between 1 and 65535.`);
   }
}

/**
 * Kill any process listening on the specified port.
 * This ensures we can cleanly restart the server even if we lost the process reference.
 * @param port - Port number to free up
 * @param logger - Optional logger for debugging (used in native host context)
 * @returns true if a process was killed, false if no process was found
 */
function validateNativeHostPort(port: number): void {
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
function killProcessOnPort(
   port: number,
   allowedPids: Set<number>,
   logger?: { log: (msg: string, data?: any) => void; error: (msg: string, err?: any) => void },
   options?: { allowUnmanagedOpencode?: boolean; allowedOwnerToken?: string },
): boolean {
   const logInfo = logger?.log ?? ((msg: string) => { /* silent */ });
   const logError = logger?.error ?? ((msg: string) => { /* silent */ });
   const allowUnmanagedOpencode = options?.allowUnmanagedOpencode !== false;
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

      if (allowedOwnerToken && !allowUnmanagedOpencode) {
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

/**
 * Configuration for fetching OpenCode templates from GitHub
 */
const TEMPLATES_CONFIG = {
   owner: 'calycode',
   repo: 'xano-tools',
   subpath: 'packages/opencode-templates',
   ref: 'main',
};

/**
 * Configuration for fetching Xano skills from GitHub
 */
const SKILLS_CONFIG = {
   owner: 'calycode',
   repo: 'xano-tools',
   subpath: 'packages/xano-skills',
   ref: 'main',
};

/**
 * Get the CalyCode-specific OpenCode configuration directory.
 * This is separate from the default OpenCode config (~/.config/opencode/)
 * to avoid polluting user's own OpenCode configuration.
 */
function getCalycodeOpencodeConfigDir(): string {
   return path.join(os.homedir(), '.calycode', 'opencode');
}

/**
 * Get the scoped workspace directory used by OpenCode server/native host processes.
 * This limits default execution scope for background/browser-triggered runs.
 */
function getCalycodeOpencodeWorkspaceDir(): string {
   return path.join(getCalycodeOpencodeConfigDir(), 'workspace');
}

function ensureDirectoryExists(dirPath: string): void {
   if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
   }
}

function getOrCreateNativeHostOwnerToken(): string {
   ensureDirectoryExists(NATIVE_HOST_STATE_DIR);
   try {
      if (fs.existsSync(NATIVE_HOST_OWNER_TOKEN_PATH)) {
         const existing = fs.readFileSync(NATIVE_HOST_OWNER_TOKEN_PATH, 'utf8').trim();
         if (existing) {
            return existing;
         }
      }
   } catch {
      // fall through and recreate
   }

   const token = randomUUID();
   fs.writeFileSync(NATIVE_HOST_OWNER_TOKEN_PATH, token, 'utf8');
   return token;
}

function getNativeHostSessionMetadataPath(port: number): string {
   return path.join(NATIVE_HOST_STATE_DIR, `session-${port}.json`);
}

function writeNativeHostSessionMetadata(metadata: NativeHostSessionMetadata): void {
   try {
      ensureDirectoryExists(NATIVE_HOST_STATE_DIR);
      fs.writeFileSync(getNativeHostSessionMetadataPath(metadata.port), JSON.stringify(metadata, null, 2), 'utf8');
   } catch {
      // Best effort only.
   }
}

function deleteNativeHostSessionMetadata(port: number): void {
   try {
      fs.rmSync(getNativeHostSessionMetadataPath(port), { force: true });
   } catch {
      // Best effort only.
   }
}

function loadPersistedManagedPids(ownerToken: string): Set<number> {
   const pids = new Set<number>();
   try {
      if (!fs.existsSync(NATIVE_HOST_STATE_DIR)) {
         return pids;
      }

      const entries = fs.readdirSync(NATIVE_HOST_STATE_DIR, { withFileTypes: true });
      for (const entry of entries) {
         if (!entry.isFile() || !entry.name.startsWith('session-') || !entry.name.endsWith('.json')) {
            continue;
         }

         const filePath = path.join(NATIVE_HOST_STATE_DIR, entry.name);
         try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(raw) as NativeHostSessionMetadata;
            if (parsed?.ownerToken !== ownerToken) {
               continue;
            }
            if (Number.isInteger(parsed.pid) && parsed.pid > 0) {
               pids.add(parsed.pid);
            }
         } catch {
            // ignore malformed file
         }
      }
   } catch {
      // Best effort only.
   }
   return pids;
}

async function isLikelyOpenCodeServerOnPort(
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

interface OpencodeWorkingDirOverrides {
   forceCwd?: boolean;
   explicitWorkdir?: string;
}

/**
 * Resolve the working directory for OpenCode child processes.
 *
 * Priority:
 * 1. CALY_OPENCODE_WORKDIR env var (absolute or relative path)
 * 2. mode='proxy' + CALY_OC_CWD=true: current shell cwd
 * 3. default: ~/.calycode/opencode/workspace (shared scoped sandbox)
 */
function getOpencodeWorkingDir(
   mode: 'proxy' | 'server',
   overrides?: OpencodeWorkingDirOverrides,
): string {
   const explicitWorkdir = overrides?.explicitWorkdir?.trim();
   if (explicitWorkdir) {
      const resolvedPath = path.resolve(explicitWorkdir);
      ensureDirectoryExists(resolvedPath);
      return resolvedPath;
   }

   const envWorkdir = process.env.CALY_OPENCODE_WORKDIR?.trim();
   if (envWorkdir) {
      const resolvedPath = path.resolve(envWorkdir);
      ensureDirectoryExists(resolvedPath);
      return resolvedPath;
   }

   const proxyUseCwdValue = process.env.CALY_OC_CWD || process.env.CALY_OPENCODE_PROXY_USE_CWD;
   const proxyUseCwd =
      mode === 'proxy' &&
      (overrides?.forceCwd === true ||
         ['1', 'true', 'yes', 'on'].includes((proxyUseCwdValue || '').toLowerCase()));

   if (proxyUseCwd) {
      return process.cwd();
   }

   const workspaceDir = getCalycodeOpencodeWorkspaceDir();
   ensureDirectoryExists(workspaceDir);
   return workspaceDir;
}

/**
 * Get the base allowed CORS origins for the OpenCode server.
 * 
 * These are the static origins that are always allowed. Dynamic origins
 * (like user-specific Xano instance URLs) are passed by the browser extension
 * when it starts the server via the native messaging protocol.
 * 
 * Environment variable: CALY_EXTRA_CORS_ORIGINS (comma-separated list of additional origins)
 */
function getAllowedCorsOrigins(): string[] {
   const resolvedExtensions = resolveAllowedExtensionIds();
   const defaultOrigins = [
      // The main Xano application
      'https://app.xano.com',
      // Chrome extension origins for extension-to-server communication
      ...resolvedExtensions.ids.map((id) => `chrome-extension://${id}`),
   ];

   // Allow additional CORS origins via environment variable (for development/testing)
   const extraOriginsEnv = process.env.CALY_EXTRA_CORS_ORIGINS;
   if (extraOriginsEnv) {
      const extraOrigins = extraOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean);
      return [...defaultOrigins, ...extraOrigins];
   }

   return defaultOrigins;
}

function isValidCorsOrigin(origin: string, knownExtensionIds: string[]): boolean {
   const trimmed = origin.trim();
   if (!trimmed) return false;

   if (trimmed === '*') return false;

   if (trimmed.includes('*')) return false;

   if (trimmed.startsWith('chrome-extension://')) {
      return CHROME_EXTENSION_ORIGIN_REGEX.test(trimmed) &&
         knownExtensionIds.some((id) => trimmed === `chrome-extension://${id}`);
   }

   if (trimmed.startsWith('https://')) {
      const hostPart = trimmed.slice('https://'.length);
      if (!hostPart || hostPart === '*') return false;
      return true;
   }

   return false;
}

function filterAndValidateOrigins(rawOrigins: unknown, knownExtensionIds: string[]): string[] {
   if (!Array.isArray(rawOrigins)) {
      return [];
   }

   const valid: string[] = [];
   for (const origin of rawOrigins) {
      if (typeof origin !== 'string') continue;
      if (!isValidCorsOrigin(origin, knownExtensionIds)) continue;
      const trimmed = origin.trim();
      if (!valid.includes(trimmed)) {
         valid.push(trimmed);
      }
      if (valid.length >= MAX_CORS_ORIGINS) break;
   }

   return valid;
}

function getCorsArgs(extraOrigins: string[] = []) {
   const origins = new Set([...getAllowedCorsOrigins(), ...extraOrigins]);
   return Array.from(origins).flatMap((origin) => ['--cors', origin]);
}

/**
 * Proxy command to the underlying OpenCode AI CLI.
 * This allows exposing the full capability of the OpenCode agent.
 * Sets OPENCODE_CONFIG_DIR to use CalyCode-specific configuration.
 */
async function proxyOpencode(
   args: string[],
   workdirOverrides?: OpencodeWorkingDirOverrides,
   ocVersion?: string,
) {
   log.info(
      '🤖 Powered by OpenCode - The open source AI coding agent\n' +
         '   https://github.com/anomalyco/opencode (MIT License)',
   );
   log.message('Passing command to opencode-ai...');

   // Set the CalyCode OpenCode config directory
   const configDir = getCalycodeOpencodeConfigDir();
   const workingDir = getOpencodeWorkingDir('proxy', workdirOverrides);
   log.info(`OpenCode working directory: ${workingDir}`);

   const resolvedVersion = resolveOcVersion(ocVersion);
   warnIfUsingNonDefaultOcVersion(resolvedVersion);

   return new Promise<void>((resolve, reject) => {
      const launchPlan = buildOpencodeSpawnPlan(resolvedVersion, args);
      log.info(`OpenCode launcher: ${launchPlan.source}`);

      // Set OPENCODE_CONFIG_DIR to use our custom config without polluting user's global config
      const proc = spawn(launchPlan.command, launchPlan.args, {
         ...getSpawnOptions('inherit', { OPENCODE_CONFIG_DIR: configDir }, workingDir, launchPlan.needsShell),
      });

      proc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            process.exit(code || 1);
         }
      });

      proc.on('error', (err) => {
         reject(new Error(`Failed to execute OpenCode CLI: ${err.message}`));
      });
   });
}

// --- Native Messaging Protocol Helpers ---

function displayNativeHostBanner(logPath?: string) {
   // We use console.error so we don't interfere with stdout (which is used for Native Messaging)
   console.error(
      font.color.cyan(`
+==================================================================================================+
|                                                                                                  |
|    ██████╗ █████╗ ██╗  ██╗   ██╗    ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗      ██████╗██╗     ██╗   |
|   ██╔════╝██╔══██╗██║  ╚██╗ ██╔╝    ╚██╗██╔╝██╔══██╗████╗  ██║██╔═══██╗    ██╔════╝██║     ██║   |
|   ██║     ███████║██║   ╚████╔╝█████╗╚███╔╝ ███████║██╔██╗ ██║██║   ██║    ██║     ██║     ██║   |
|   ██║     ██╔══██║██║    ╚██╔╝ ╚════╝██╔██╗ ██╔══██║██║╚██╗██║██║   ██║    ██║     ██║     ██║   |
|   ╚██████╗██║  ██║███████╗██║       ██╔╝ ██╗██║  ██║██║ ╚████║╚██████╔╝    ╚██████╗███████╗██║   |
|    ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝       ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝      ╚═════╝╚══════╝╚═╝   |
|                                                                                                  |
+==================================================================================================+
`),
   );

   console.error('\n' + font.combo.boldGreen('  Native Host Active'));
   console.error(font.color.gray('  You can keep this window minimized, but do not close it.'));
   console.error(
      font.color.gray(
         '  This process enables the CalyCode extension to communicate with your system.',
      ),
   );

   if (logPath) {
      console.error('\n' + font.combo.boldCyan('  Logs:'));
      console.error('  - Log file: ' + font.color.white(logPath));
   }

   console.error('\n' + font.combo.boldCyan('  Useful Links:'));
   console.error('  - Documentation: ' + font.color.white('https://calycode.com/docs'));
   console.error('  - Extension:     ' + font.color.white('https://calycode.com/extension'));
   console.error('  - OpenCode:      ' + font.color.white('https://opencode.ai'));
   console.error('\n');
}

function sendMessage(message: any) {
   const buffer = Buffer.from(JSON.stringify(message));
   const header = Buffer.alloc(4);
   header.writeUInt32LE(buffer.length, 0);

   // Use the raw file descriptor to avoid any stream logic
   process.stdout.write(header);
   process.stdout.write(buffer);
}

// Simple file-based logger for debugging Native Host without polluting stdout
class NativeHostLogger {
   private logPath: string;
   private logDir: string;
   private initialized: boolean = false;
   private enabled: boolean;

   constructor() {
      this.enabled = process.env.CALY_OC_NATIVE_HOST_DEBUG === '1';
      const homeDir = os.homedir();
      this.logDir = path.join(homeDir, '.calycode', 'logs');
      this.logPath = path.join(this.logDir, 'native-host.log');
      if (this.enabled) {
         this.ensureLogDir();
      }
   }

   private ensureLogDir() {
      if (this.initialized) return;
      try {
         if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
         }
         this.initialized = true;
         this.log('Logger initialized', { logPath: this.logPath, pid: process.pid });
      } catch (e) {
         console.error(`[NativeHostLogger] Failed to create log directory ${this.logDir}: ${e}`);
         try {
            this.logDir = os.tmpdir();
            this.logPath = path.join(this.logDir, 'calycode-native-host.log');
            this.initialized = true;
            console.error(`[NativeHostLogger] Using fallback log path: ${this.logPath}`);
         } catch (e2) {
            console.error(`[NativeHostLogger] Fallback also failed: ${e2}`);
         }
      }
   }

   log(msg: string, data?: any) {
      if (!this.enabled) return;
      try {
         const timestamp = new Date().toISOString();
         let content = `[${timestamp}] ${msg}`;
         if (data) {
            content += `\nData: ${JSON.stringify(data, null, 2)}`;
         }
         content += '\n';
         fs.appendFileSync(this.logPath, content);
      } catch (e) {
         console.error(`[NativeHostLogger] Log failed: ${msg}`);
      }
   }

   error(msg: string, err?: any) {
      if (!this.enabled) return;
      try {
         const timestamp = new Date().toISOString();
         let content = `[${timestamp}] ERROR: ${msg}`;
         if (err) {
            content += `\nError: ${err instanceof Error ? err.stack : JSON.stringify(err)}`;
         }
         content += '\n';
         fs.appendFileSync(this.logPath, content);
      } catch (e) {
         console.error(`[NativeHostLogger] Error log failed: ${msg} - ${err}`);
      }
   }

   getLogPath(): string {
      return this.logPath;
   }
}

async function startNativeHost() {
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

   //displayNativeHostBanner(logger.getLogPath());

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

          const launched = launchOpencodeServer({
             port,
             extraOrigins,
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
         serverProc = launched.proc;
         registerManagedSession(port, launched.proc);

         serverProc.on('error', (err) => {
            logger.error('Failed to spawn server process', err);
            sendMessage({ status: 'error', message: `Failed to spawn server: ${err.message}` });
         });

         serverProc.on('exit', (code) => {
            logger.log(`Server process exited with code ${code}`);
            sendMessage({ status: 'stopped', code });
            unregisterManagedSession(port);
            serverProc = null;
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

// --- OpenCode Configuration Setup ---

/**
 * Options for setting up OpenCode configuration
 */
interface SetupOpencodeConfigOptions {
   /** Force re-download templates even if they exist */
   force?: boolean;
   /** Skip the native host setup */
   skipNativeHost?: boolean;
}

/**
 * Result of template installation status check
 */
interface TemplateInstallStatus {
   installed: boolean;
   configDir?: string;
   fileCount?: number;
   lastModified?: Date;
   files?: string[];
}

/**
 * Try to find local templates in the monorepo (development fallback).
 * Returns the path to local templates if found, otherwise null.
 */
function findLocalTemplatesPath(): string | null {
   // Check common locations relative to this script
   const possiblePaths = [
      // Relative to cli package in monorepo
      path.resolve(__dirname, '../../opencode-templates'),
      path.resolve(__dirname, '../../../opencode-templates'),
      path.resolve(__dirname, '../../../../packages/opencode-templates'),
      // Relative to dist folder
      path.resolve(__dirname, '../../../packages/opencode-templates'),
   ];

   for (const p of possiblePaths) {
      if (fs.existsSync(path.join(p, 'opencode.json'))) {
         return p;
      }
   }
   return null;
}

/**
 * Read all template files from a local directory.
 * Returns a Map of relative paths to file contents.
 */
function readLocalTemplates(templatesDir: string): Map<string, string> {
   const files = new Map<string, string>();

   function readDir(dir: string, relativePath: string = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
         const fullPath = path.join(dir, entry.name);
         const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

         if (entry.isDirectory()) {
            readDir(fullPath, relPath);
         } else if (entry.isFile()) {
            // Normalize path separators for consistency
            const normalizedPath = relPath.replace(/\\/g, '/');
            files.set(normalizedPath, fs.readFileSync(fullPath, 'utf-8'));
         }
      }
   }

   readDir(templatesDir);
   return files;
}

/**
 * Fetches and installs OpenCode configuration templates (agents, commands, instructions).
 * Templates are fetched from GitHub and cached locally for offline use.
 * Falls back to local templates (from monorepo) during development if GitHub fetch fails.
 *
 * Installed to: ~/.calycode/opencode/
 *   - opencode.json (default config)
 *   - AGENTS.md (global instructions)
 *   - agents/*.md (custom agents)
 *   - commands/*.md (custom slash commands)
 */
async function setupOpencodeConfig(options: SetupOpencodeConfigOptions = {}): Promise<void> {
   const { force = false } = options;
   const fetcher = new GitHubContentFetcher();
   // Use CalyCode-specific directory to avoid polluting user's global OpenCode config
   const configDir = getCalycodeOpencodeConfigDir();

   log.info('Fetching OpenCode configuration templates...');
   log.info(`Installing to: ${configDir}`);

   let files: Map<string, string>;
   let sourceDescription: string;

   try {
      // First, try to fetch from GitHub (with cache support)
      const result = await fetcher.fetchDirectory({
         ...TEMPLATES_CONFIG,
         preferOffline: true,
         force,
      });
      files = result.files;

      if (result.fromCache && result.cacheAge !== undefined) {
         const ageMinutes = Math.round(result.cacheAge / 1000 / 60);
         sourceDescription = `cached templates (${ageMinutes} minutes old)`;
         log.info(`Using ${sourceDescription}`);
      } else {
         sourceDescription = 'latest templates from GitHub';
         log.success(`Downloaded ${sourceDescription}`);
      }
   } catch (error: any) {
      // GitHub fetch failed - try local fallback for development
      log.warn(`GitHub fetch failed: ${error.message}`);

      const localPath = findLocalTemplatesPath();
      if (localPath) {
         log.info(`Falling back to local templates: ${localPath}`);
         files = readLocalTemplates(localPath);
         sourceDescription = 'local templates (development mode)';
         log.success(`Using ${sourceDescription}`);
      } else {
         log.error('No local templates found. Cannot install configuration.');
         throw new Error(
            'Failed to fetch templates from GitHub and no local fallback available.',
         );
      }
   }

   // Ensure base config directory exists
   if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
   }

   // Ensure subdirectories exist
   const subdirs = ['agents', 'commands'];
   for (const dir of subdirs) {
      const fullPath = path.join(configDir, dir);
      if (!fs.existsSync(fullPath)) {
         fs.mkdirSync(fullPath, { recursive: true });
      }
   }

   // Track what was installed
   const installed: string[] = [];
   const skipped: string[] = [];

   // Write files to OpenCode config directory
   for (const [filePath, content] of files) {
      // Skip package.json - it's just for the template package metadata
      if (filePath === 'package.json') {
         continue;
      }

      const destPath = path.join(configDir, filePath);
      const destDir = path.dirname(destPath);

      // Ensure destination directory exists
      if (!fs.existsSync(destDir)) {
         fs.mkdirSync(destDir, { recursive: true });
      }

      // Don't overwrite existing user customizations unless --force
      if (!force && fs.existsSync(destPath)) {
         skipped.push(filePath);
         continue;
      }

      fs.writeFileSync(destPath, content, 'utf-8');
      installed.push(filePath);
   }

   // Report results
   if (installed.length > 0) {
      const fileList = installed.map((f) => `  + ${f}`).join('\n');
      log.success(`Installed ${installed.length} template file(s):\n${fileList}`);
   }

   if (skipped.length > 0) {
      const fileList = skipped.map((f) => `  - ${f}`).join('\n');
      log.info(`Skipped ${skipped.length} existing file(s) (use --force to overwrite):\n${fileList}`);
   }

   log.success(`OpenCode configuration installed to: ${configDir}`);
}

/**
 * Update OpenCode templates by forcing a fresh download from GitHub.
 */
async function updateOpencodeTemplates(): Promise<void> {
   log.info('Updating OpenCode templates...');
   await setupOpencodeConfig({ force: true });
   log.success('Templates updated successfully!');
}

/**
 * Get the status of installed OpenCode templates.
 * Checks the installed config directory, not the GitHub cache.
 */
function getTemplateInstallStatus(): TemplateInstallStatus {
   const configDir = getCalycodeOpencodeConfigDir();
   const configFile = path.join(configDir, 'opencode.json');

   // Check if the main config file exists
   if (!fs.existsSync(configFile)) {
      return { installed: false };
   }

   // Only count template files we care about (not node_modules, etc.)
   const templateDirs = ['agents', 'commands'];
   const templateFiles = ['opencode.json', 'AGENTS.md'];

   const files: string[] = [];
   let latestMtime: Date | undefined;

   // Check root template files
   for (const file of templateFiles) {
      const fullPath = path.join(configDir, file);
      if (fs.existsSync(fullPath)) {
         files.push(file);
         const stat = fs.statSync(fullPath);
         if (!latestMtime || stat.mtime > latestMtime) {
            latestMtime = stat.mtime;
         }
      }
   }

   // Scan template directories
   for (const dir of templateDirs) {
      const dirPath = path.join(configDir, dir);
      if (!fs.existsSync(dirPath)) continue;

      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
         if (entry.isFile() && entry.name.endsWith('.md')) {
            const fullPath = path.join(dirPath, entry.name);
            files.push(`${dir}/${entry.name}`);
            const stat = fs.statSync(fullPath);
            if (!latestMtime || stat.mtime > latestMtime) {
               latestMtime = stat.mtime;
            }
         }
      }
   }

   return {
      installed: true,
      configDir,
      fileCount: files.length,
      lastModified: latestMtime,
      files,
   };
}

/**
 * Clear the template cache.
 */
async function clearTemplateCache(): Promise<void> {
   const fetcher = new GitHubContentFetcher();
   await fetcher.clearCache(TEMPLATES_CONFIG);
   log.success('Template cache cleared.');
}

// --- Skills Installation ---

/**
 * Result of skills installation status check
 */
interface SkillsInstallStatus {
   installed: boolean;
   skillsDir?: string;
   skillCount?: number;
   lastModified?: Date;
   skills?: string[];
}

/**
 * Try to find local skills in the monorepo (development fallback).
 * Returns the path to local skills if found, otherwise null.
 */
function findLocalSkillsPath(): string | null {
   // Check common locations relative to this script
   const possiblePaths = [
      // Relative to cli package in monorepo
      path.resolve(__dirname, '../../xano-skills'),
      path.resolve(__dirname, '../../../xano-skills'),
      path.resolve(__dirname, '../../../../packages/xano-skills'),
      // Relative to dist folder
      path.resolve(__dirname, '../../../packages/xano-skills'),
   ];

   for (const p of possiblePaths) {
      // Check for skills directory with at least one skill
      const skillsDir = path.join(p, 'skills');
      if (fs.existsSync(skillsDir) && fs.readdirSync(skillsDir).length > 0) {
         return p;
      }
   }
   return null;
}

/**
 * Read all skill files from a local directory.
 * Returns a Map of relative paths to file contents.
 */
function readLocalSkills(skillsPackageDir: string): Map<string, string> {
   const files = new Map<string, string>();
   const skillsDir = path.join(skillsPackageDir, 'skills');

   if (!fs.existsSync(skillsDir)) {
      return files;
   }

   function readDir(dir: string, relativePath: string = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
         const fullPath = path.join(dir, entry.name);
         const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name;

         if (entry.isDirectory()) {
            readDir(fullPath, relPath);
         } else if (entry.isFile()) {
            // Normalize path separators for consistency
            const normalizedPath = relPath.replace(/\\/g, '/');
            files.set(normalizedPath, fs.readFileSync(fullPath, 'utf-8'));
         }
      }
   }

   readDir(skillsDir);
   return files;
}

/**
 * Fetches and installs Xano skills for AI agents.
 * Skills are fetched from GitHub and cached locally for offline use.
 * Falls back to local skills (from monorepo) during development if GitHub fetch fails.
 *
 * Installed to: ~/.calycode/opencode/skills/
 *   - <skill-name>/SKILL.md
 */
async function setupOpencodeSkills(options: { force?: boolean } = {}): Promise<void> {
   const { force = false } = options;
   const fetcher = new GitHubContentFetcher();
   const configDir = getCalycodeOpencodeConfigDir();
   const skillsDir = path.join(configDir, 'skills');

   log.info('Fetching Xano skills...');
   log.info(`Installing to: ${skillsDir}`);

   let files: Map<string, string>;
   let sourceDescription: string;

   try {
      // First, try to fetch from GitHub (with cache support)
      const result = await fetcher.fetchDirectory({
         ...SKILLS_CONFIG,
         preferOffline: true,
         force,
      });

      // Extract only the skills/ subdirectory from the package
      files = new Map<string, string>();
      for (const [filePath, content] of result.files) {
         if (filePath.startsWith('skills/')) {
            // Remove the 'skills/' prefix since we'll install to skillsDir
            const relativePath = filePath.substring('skills/'.length);
            files.set(relativePath, content);
         }
      }

      if (result.fromCache && result.cacheAge !== undefined) {
         const ageMinutes = Math.round(result.cacheAge / 1000 / 60);
         sourceDescription = `cached skills (${ageMinutes} minutes old)`;
         log.info(`Using ${sourceDescription}`);
      } else {
         sourceDescription = 'latest skills from GitHub';
         log.success(`Downloaded ${sourceDescription}`);
      }
   } catch (error: any) {
      // GitHub fetch failed - try local fallback for development
      log.warn(`GitHub fetch failed: ${error.message}`);

      const localPath = findLocalSkillsPath();
      if (localPath) {
         log.info(`Falling back to local skills: ${localPath}`);
         files = readLocalSkills(localPath);
         sourceDescription = 'local skills (development mode)';
         log.success(`Using ${sourceDescription}`);
      } else {
         log.error('No local skills found. Cannot install skills.');
         throw new Error('Failed to fetch skills from GitHub and no local fallback available.');
      }
   }

   // Ensure skills directory exists
   if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
   }

   // Track what was installed
   const installed: string[] = [];
   const skipped: string[] = [];

   // Write skill files to skills directory
   for (const [filePath, content] of files) {
      const destPath = path.join(skillsDir, filePath);
      const destDir = path.dirname(destPath);

      // Ensure destination directory exists
      if (!fs.existsSync(destDir)) {
         fs.mkdirSync(destDir, { recursive: true });
      }

      // Don't overwrite existing user customizations unless --force
      if (!force && fs.existsSync(destPath)) {
         skipped.push(filePath);
         continue;
      }

      fs.writeFileSync(destPath, content, 'utf-8');
      installed.push(filePath);
   }

   // Report results
   if (installed.length > 0) {
      const skillNames = [
         ...new Set(installed.map((f) => f.split('/')[0]).filter((name) => name)),
      ];
      log.success(`Installed ${skillNames.length} skill(s): ${skillNames.join(', ')}`);
   }

   if (skipped.length > 0) {
      const skillNames = [
         ...new Set(skipped.map((f) => f.split('/')[0]).filter((name) => name)),
      ];
      log.info(`Skipped ${skillNames.length} existing skill(s) (use --force to overwrite)`);
   }

   log.success(`Skills installed to: ${skillsDir}`);
}

/**
 * Update skills by forcing a fresh download from GitHub.
 */
async function updateOpencodeSkills(): Promise<void> {
   log.info('Updating Xano skills...');
   await setupOpencodeSkills({ force: true });
   log.success('Skills updated successfully!');
}

/**
 * Get the status of installed skills.
 */
function getSkillsInstallStatus(): SkillsInstallStatus {
   const configDir = getCalycodeOpencodeConfigDir();
   const skillsDir = path.join(configDir, 'skills');

   if (!fs.existsSync(skillsDir)) {
      return { installed: false };
   }

   const skills: string[] = [];
   let latestMtime: Date | undefined;

   // Scan skills directories
   const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
   for (const entry of entries) {
      if (entry.isDirectory()) {
         const skillMdPath = path.join(skillsDir, entry.name, 'SKILL.md');
         if (fs.existsSync(skillMdPath)) {
            skills.push(entry.name);
            const stat = fs.statSync(skillMdPath);
            if (!latestMtime || stat.mtime > latestMtime) {
               latestMtime = stat.mtime;
            }
         }
      }
   }

   if (skills.length === 0) {
      return { installed: false };
   }

   return {
      installed: true,
      skillsDir,
      skillCount: skills.length,
      lastModified: latestMtime,
      skills,
   };
}

/**
 * Clear the skills cache.
 */
async function clearSkillsCache(): Promise<void> {
   const fetcher = new GitHubContentFetcher();
   await fetcher.clearCache(SKILLS_CONFIG);
   log.success('Skills cache cleared.');
}

async function serveOpencode({
   port = 4096,
   detach = false,
   ocVersion,
}: {
   port?: number;
   detach?: boolean;
   ocVersion?: string;
}) {
   // Validate port
   validatePort(port);

   const resolvedVersion = resolveOcVersion(ocVersion);
   warnIfUsingNonDefaultOcVersion(resolvedVersion);

   if (detach) {
      log.info(`Starting OpenCode server on port ${port} in background...`);
      const launched = launchOpencodeServer({
         port,
         stdio: 'ignore',
         detach: true,
         ocVersion: resolvedVersion,
      });
      log.info(`OpenCode launcher: ${launched.plan.source}`);
      const proc = launched.proc;
      proc.unref();
      log.success('OpenCode server started in background.');
      return;
   }

   return new Promise<void>((resolve, reject) => {
      log.info(`Starting OpenCode server on port ${port}...`);

      const launched = launchOpencodeServer({
         port,
         stdio: 'inherit',
         ocVersion: resolvedVersion,
      });
      log.info(`OpenCode launcher: ${launched.plan.source}`);
      const proc = launched.proc;

      proc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            reject(new Error(`OpenCode server exited with code ${code}`));
         }
      });

      proc.on('error', (err) => {
         reject(new Error(`Failed to start OpenCode server: ${err.message}`));
      });
   });
}

async function setupOpencode({
   extensionIds,
   force = false,
   skipConfig = false,
   ocVersion,
}: {
   extensionIds?: string[];
   force?: boolean;
   skipConfig?: boolean;
   ocVersion?: string;
} = {}) {
   const resolvedVersion = resolveOcVersion(ocVersion);
   warnIfUsingNonDefaultOcVersion(resolvedVersion);

   if (shouldUseManagedOpencodeInstall()) {
      try {
         const managedBinPath = ensureManagedOpencodeInstalled(resolvedVersion);
         log.info(`Managed OpenCode launcher ready: ${managedBinPath}`);
      } catch (error: any) {
         log.warn(
            `Managed OpenCode install failed (${error?.message || 'unknown error'}). Falling back to global/npx launchers.`,
         );
      }
   }

   await setupNativeHostRegistration(extensionIds, resolvedVersion);
   log.info('Native host setup complete.');

   // Setup OpenCode configuration (agents, commands, instructions)
   if (!skipConfig) {
      log.info('');
      await setupOpencodeConfig({ force });
      log.info('');
      await setupOpencodeSkills({ force });
   }

   log.info('');
   log.success('Setup complete! OpenCode is ready to use.');
}

function showNativeHostStatus(): void {
   showNativeHostStatusImpl();
}

export {
   serveOpencode,
   setupOpencode,
   startNativeHost,
   showNativeHostStatus,
   proxyOpencode,
   setupOpencodeConfig,
   updateOpencodeTemplates,
   getTemplateInstallStatus,
   clearTemplateCache,
   setupOpencodeSkills,
   updateOpencodeSkills,
   getSkillsInstallStatus,
   clearSkillsCache,
};
