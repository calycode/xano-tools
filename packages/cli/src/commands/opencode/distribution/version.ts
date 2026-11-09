import { log } from '@clack/prompts';

/**
 * OpenCode V2 is the API the CalyCode browser extension targets. Keep this
 * pinned so a floating `latest` cannot quietly move the host back to V1.
 */
export const DEFAULT_OPENCODE_VERSION = '2.2.6';
export const OPENCODE_V2_PACKAGE = '@opencode/cli';
export const OPENCODE_V1_PACKAGE = 'opencode-ai';
export const OC_VERSION_REGEX = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export function normalizeOcVersion(rawVersion?: string): string | undefined {
   const value = rawVersion?.trim();
   return value ? value : undefined;
}

/**
 * Major version of an OpenCode release, or null for a floating channel such as
 * `latest`. Used to choose the V2 package and the right health endpoint.
 */
export function getOpencodeMajorVersion(version?: string): number | null {
   const normalized = normalizeOcVersion(version);
   if (!normalized || normalized === 'latest') {
      return null;
   }

   const match = normalized.match(/^(\d+)\./);
   return match ? Number.parseInt(match[1], 10) : null;
}

export function parseOcVersionFromArgv(argv: string[]): string | undefined {
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

export function resolveOcVersion(explicitVersion?: string): string {
   const explicit = normalizeOcVersion(explicitVersion);
   if (explicit) {
      if (explicit !== 'latest' && !OC_VERSION_REGEX.test(explicit)) {
         throw new Error(
            `Invalid OpenCode version "${explicit}". Use "latest" or semantic version format like "2.2.6".`,
         );
      }
      return explicit;
   }

   const fromEnv = normalizeOcVersion(process.env.CALY_OC_OPENCODE_VERSION);
   if (fromEnv) {
      if (fromEnv !== 'latest' && !OC_VERSION_REGEX.test(fromEnv)) {
         throw new Error(
            `Invalid CALY_OC_OPENCODE_VERSION "${fromEnv}". Use "latest" or semantic version format like "2.2.6".`,
         );
      }
      return fromEnv;
   }

   return DEFAULT_OPENCODE_VERSION;
}

export function warnIfUsingNonDefaultOcVersion(version: string): void {
   if (version !== DEFAULT_OPENCODE_VERSION) {
      log.warn(
         `Using OpenCode ${version} (override). Default channel is ${DEFAULT_OPENCODE_VERSION}.`,
      );
   }
}
