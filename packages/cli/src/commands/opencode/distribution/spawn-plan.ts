import {
   fileExists,
   shouldUseManagedOpencodeInstall,
   resolveManagedOpencodeBinary,
   ensureManagedOpencodeInstalled,
   findGlobalOpencodeBinary,
   getOpencodeBinaryVersion,
   getOpencodePackageSpecifier,
} from './install';

export interface OpencodeSpawnPlan {
   command: string;
   args: string[];
   source: 'env' | 'managed' | 'global' | 'npx';
   displayCommand: string;
   needsShell: boolean;
}

/**
 * Whether a command must be run through a shell. On Windows, `.cmd`/`.bat`
 * shims (npm/pnpm wrappers, the managed install, `npx`) cannot be spawned
 * directly and require `shell: true`.
 */
export function requiresShell(
   command: string,
   platform: NodeJS.Platform = process.platform,
): boolean {
   if (platform !== 'win32') {
      return false;
   }
   const lower = command.toLowerCase();
   return lower.endsWith('.cmd') || lower.endsWith('.bat');
}

export function buildOpencodeSpawnPlan(
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
         needsShell: requiresShell(explicitBin),
      };
   }

   const managedEnabled = shouldUseManagedOpencodeInstall();
   if (managedEnabled) {
      const managedBin = resolveManagedOpencodeBinary(version);
      if (managedBin) {
         return {
            command: managedBin,
            args: opencodeArgs,
            source: 'managed',
            displayCommand: `${managedBin} ${opencodeArgs.join(' ')}`.trim(),
            needsShell: requiresShell(managedBin),
         };
      }
   }

   if (managedEnabled && options?.ensureManagedInstall !== false) {
      try {
         const installedBin = ensureManagedOpencodeInstalled(version);
         return {
            command: installedBin,
            args: opencodeArgs,
            source: 'managed',
            displayCommand: `${installedBin} ${opencodeArgs.join(' ')}`.trim(),
            needsShell: requiresShell(installedBin),
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
               needsShell: requiresShell(globalOpencode),
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
