import fs from 'node:fs';
import path from 'node:path';
import { execSync, execFileSync } from 'node:child_process';
import { getCalycodeOpencodeConfigDir, ensureDirectoryExists } from './paths';
import { OC_VERSION_REGEX } from './version';

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

export function isTruthy(value?: string): boolean {
   return ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase());
}

export function shouldUseManagedOpencodeInstall(): boolean {
   return !isTruthy(process.env.CALY_OC_DISABLE_MANAGED_INSTALL);
}

export function findGlobalOpencodeBinary(): string | undefined {
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

export function getOpencodeBinaryVersion(binaryPath: string): string | undefined {
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

export function ensureManagedOpencodeInstalled(version: string): string {
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
