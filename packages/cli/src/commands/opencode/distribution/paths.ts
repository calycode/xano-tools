import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/**
 * Get the CalyCode-specific OpenCode configuration directory.
 * This is separate from the default OpenCode config (~/.config/opencode/)
 * to avoid polluting user's own OpenCode configuration.
 */
export function getCalycodeOpencodeConfigDir(): string {
   return path.join(os.homedir(), '.calycode', 'opencode');
}

/**
 * Get the scoped workspace directory used by OpenCode server/native host processes.
 * This limits default execution scope for background/browser-triggered runs.
 */
export function getCalycodeOpencodeWorkspaceDir(): string {
   return path.join(getCalycodeOpencodeConfigDir(), 'workspace');
}

export function ensureDirectoryExists(dirPath: string): void {
   if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
   }
}

export interface OpencodeWorkingDirOverrides {
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
export function getOpencodeWorkingDir(
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
