import { spawn } from 'node:child_process';
import { log } from '@clack/prompts';
import { resolveOcVersion, warnIfUsingNonDefaultOcVersion } from './version';
import { buildOpencodeSpawnPlan, getSpawnOptions, type OpencodeSpawnPlan } from './spawn-plan';
import {
   getCalycodeOpencodeConfigDir,
   getOpencodeWorkingDir,
   type OpencodeWorkingDirOverrides,
} from './paths';

/**
 * Static CORS origins always allowed for the OpenCode server.
 *
 * Dynamic origins (browser-extension origins, user Xano instance URLs) are
 * resolved by the native host and passed in by the caller.
 */
export function getStaticCorsOrigins(): string[] {
   const defaultOrigins = ['https://app.xano.com'];

   const extraOriginsEnv = process.env.CALY_EXTRA_CORS_ORIGINS;
   if (extraOriginsEnv) {
      const extraOrigins = extraOriginsEnv.split(',').map((o) => o.trim()).filter(Boolean);
      return [...defaultOrigins, ...extraOrigins];
   }

   return defaultOrigins;
}

export function getCorsArgs(
   extraOrigins: string[] = [],
   allowedOrigins: string[] = getStaticCorsOrigins(),
) {
   const origins = new Set([...allowedOrigins, ...extraOrigins]);
   return Array.from(origins).flatMap((origin) => ['--cors', origin]);
}

/**
 * Validates a port number to ensure it's a safe integer in valid range.
 * @param port - Port number to validate
 * @throws {Error} if port is invalid
 */
export function validatePort(port: number): void {
   if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error(`Invalid port number: ${port}. Must be an integer between 1 and 65535.`);
   }
}

export interface LaunchOpencodeServerOptions {
   port: number;
   extraOrigins?: string[];
   allowedOrigins?: string[];
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

export interface LaunchedOpencodeServer {
   proc: ReturnType<typeof spawn>;
   plan: OpencodeSpawnPlan;
}

export function launchOpencodeServer({
   port,
   extraOrigins = [],
   allowedOrigins,
   stdio = 'inherit',
   detach = false,
   ocVersion,
   ownerToken,
   allowGlobalFallback,
   onManagedFail,
   onGlobalVersionMismatch,
}: LaunchOpencodeServerOptions): LaunchedOpencodeServer {
   validatePort(port);

   const resolvedVersion = resolveOcVersion(ocVersion);
   const opencodeArgs = [
      'serve',
      '--port',
      String(port),
      ...getCorsArgs(extraOrigins, allowedOrigins),
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
   };
}

/**
 * Proxy command to the underlying OpenCode AI CLI.
 * This allows exposing the full capability of the OpenCode agent.
 * Sets OPENCODE_CONFIG_DIR to use CalyCode-specific configuration.
 */
export async function proxyOpencode(
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
