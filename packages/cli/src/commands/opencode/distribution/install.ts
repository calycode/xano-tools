import fs from 'node:fs';
import path from 'node:path';
import { execSync, execFileSync } from 'node:child_process';
import { getCalycodeOpencodeConfigDir, ensureDirectoryExists } from './paths';
import { OC_VERSION_REGEX } from './version';
import { parseBooleanEnv } from '../../../utils';

/**
 * opencode-ai ships a small placeholder binary until its postinstall copies the
 * real platform binary (tens of MB). Anything at or below this size is treated
 * as a placeholder.
 */
const OPENCODE_PLACEHOLDER_MAX_BYTES = 64 * 1024;

export function getOpencodePackageSpecifier(version: string): string {
   return `opencode-ai@${version}`;
}

export function getManagedOpencodeVersionsDir(): string {
   return path.join(getCalycodeOpencodeConfigDir(), 'versions');
}

export function getManagedOpencodeInstallDir(version: string): string {
   return path.join(getManagedOpencodeVersionsDir(), version);
}

export function getManagedOpencodeBinPath(version: string): string {
   const binName = process.platform === 'win32' ? 'opencode.cmd' : 'opencode';
   return path.join(getManagedOpencodeInstallDir(version), 'node_modules', '.bin', binName);
}

/** The real platform binary that opencode-ai's postinstall materializes. */
export function getManagedOpencodePackageBinaryPath(version: string): string {
   return path.join(
      getManagedOpencodeInstallDir(version),
      'node_modules',
      'opencode-ai',
      'bin',
      'opencode.exe',
   );
}

/**
 * Whether the managed OpenCode binary is still opencode-ai's placeholder
 * (or missing entirely) rather than the real platform binary.
 */
export function isOpencodePlaceholder(binaryPath: string): boolean {
   try {
      return fs.statSync(binaryPath).size <= OPENCODE_PLACEHOLDER_MAX_BYTES;
   } catch {
      return true;
   }
}

/**
 * opencode-ai relies on its postinstall to copy the real platform binary over a
 * placeholder. npm 11+ blocks lifecycle scripts unless explicitly approved, so
 * run the postinstall ourselves when the managed binary is still a placeholder.
 */
export function ensureOpencodePostinstall(version: string): void {
   if (!isOpencodePlaceholder(getManagedOpencodePackageBinaryPath(version))) {
      return;
   }

   const packageDir = path.join(getManagedOpencodeInstallDir(version), 'node_modules', 'opencode-ai');
   const postinstallPath = path.join(packageDir, 'postinstall.mjs');
   if (!fileExists(postinstallPath)) {
      return;
   }

   try {
      execFileSync(process.execPath, [postinstallPath], {
         stdio: 'ignore',
         env: process.env,
         cwd: packageDir,
      });
   } catch {
      // Best effort; a failed postinstall leaves the placeholder, whose own
      // error message surfaces when the launcher runs.
   }
}

/**
 * Resolve a runnable managed launcher, repairing a placeholder binary first.
 * Returns the real platform binary (directly spawnable, no shell shim needed),
 * or undefined when no managed install is present or it cannot be repaired.
 */
export function resolveManagedOpencodeBinary(version: string): string | undefined {
   const managedBin = getManagedOpencodeBinPath(version);
   if (!fileExists(managedBin)) {
      return undefined;
   }

   const packageBinary = getManagedOpencodePackageBinaryPath(version);
   ensureOpencodePostinstall(version);

   return isOpencodePlaceholder(packageBinary) ? undefined : packageBinary;
}

export function parseManagedVersion(version: string): {
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

export function compareManagedVersionsDesc(a: string, b: string): number {
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

export function pruneManagedOpencodeVersions(keepLatest: number = 5): void {
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

export function fileExists(candidatePath: string): boolean {
   try {
      return fs.existsSync(candidatePath);
   } catch {
      return false;
   }
}

export function shouldUseManagedOpencodeInstall(): boolean {
   return !parseBooleanEnv(process.env.CALY_OC_DISABLE_MANAGED_INSTALL, false);
}

/**
 * Pick a spawnable `opencode` from the candidates reported by the OS.
 *
 * On Windows, `where` lists the extensionless POSIX shim before the runnable
 * `.cmd`/`.exe` wrappers; the extensionless shim cannot be spawned directly, so
 * prefer a real executable and reject the list when only shims are present.
 */
export function selectGlobalOpencodeBinary(
   candidates: string[],
   platform: NodeJS.Platform = process.platform,
): string | undefined {
   if (platform !== 'win32') {
      return candidates[0];
   }

   const rank = (candidate: string): number => {
      const lower = candidate.toLowerCase();
      if (lower.endsWith('.exe')) return 0;
      if (lower.endsWith('.cmd')) return 1;
      if (lower.endsWith('.bat')) return 2;
      // Extensionless POSIX shims cannot be spawned directly on Windows.
      return 3;
   };

   const best = candidates
      .map((candidate) => ({ candidate, rank: rank(candidate) }))
      .sort((a, b) => a.rank - b.rank)[0];

   return best && best.rank < 3 ? best.candidate : undefined;
}

export function findGlobalOpencodeBinary(): string | undefined {
   try {
      const command = process.platform === 'win32' ? 'where opencode' : 'which opencode';
      const candidates = execSync(command, {
         encoding: 'utf8',
         stdio: ['ignore', 'pipe', 'ignore'],
      })
         .split(/\r?\n/)
         .map((line) => line.trim())
         .filter(Boolean)
         .filter((candidate) => fileExists(candidate));

      return selectGlobalOpencodeBinary(candidates);
   } catch {
      return undefined;
   }
}

export function getOpencodeBinaryVersion(binaryPath: string): string | undefined {
   try {
      // A `.cmd`/`.bat` shim must be run through a shell on Windows.
      const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(binaryPath);
      const output = (
         useShell
            ? execSync(`"${binaryPath}" --version`, {
                 encoding: 'utf8',
                 stdio: ['ignore', 'pipe', 'ignore'],
                 windowsHide: true,
              })
            : execFileSync(binaryPath, ['--version'], {
                 encoding: 'utf8',
                 stdio: ['ignore', 'pipe', 'ignore'],
                 windowsHide: true,
              })
      )
         .toString()
         .trim();

      const match = output.match(/\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?/);
      return match?.[0];
   } catch {
      return undefined;
   }
}

export function ensureManagedOpencodeInstalled(version: string): string {
   const existing = resolveManagedOpencodeBinary(version);
   if (existing) {
      pruneManagedOpencodeVersions(5);
      return existing;
   }

   const installDir = getManagedOpencodeInstallDir(version);
   ensureDirectoryExists(installDir);

   const packageSpecifier = getOpencodePackageSpecifier(version);
   // Use a single command string (via the shell) so Node does not emit DEP0190
   // and Windows resolves the `npm` shim without an explicit `shell: true`.
   execSync(
      `npm install --no-save --prefix "${installDir}" "${packageSpecifier}"`,
      { stdio: 'ignore', env: process.env },
   );

   // npm 11+ blocks lifecycle scripts by default, so opencode-ai's postinstall
   // (which copies the real platform binary over its placeholder) may not have
   // run; resolveManagedOpencodeBinary runs it on demand.
   const resolved = resolveManagedOpencodeBinary(version);
   if (!resolved) {
      throw new Error(
         `Managed OpenCode install completed but no runnable launcher was found at ` +
         `${getManagedOpencodeBinPath(version)}.`,
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

   return resolved;
}
