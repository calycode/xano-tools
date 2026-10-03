import { log } from '@clack/prompts';

export const DEFAULT_OPENCODE_VERSION = 'latest';
export const OC_VERSION_REGEX = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

export function normalizeOcVersion(rawVersion?: string): string | undefined {
   const value = rawVersion?.trim();
   return value ? value : undefined;
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

export function warnIfUsingNonDefaultOcVersion(version: string): void {
   if (version !== DEFAULT_OPENCODE_VERSION) {
      log.warn(
         `Using OpenCode ${version} (override). Default channel is ${DEFAULT_OPENCODE_VERSION}.`,
      );
   }
}
