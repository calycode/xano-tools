import { resolveAllowedExtensionIds } from './discovery';
import { XANO_APP_ORIGIN, getExtraCorsOriginsFromEnv } from '../distribution';

export const MAX_CORS_ORIGINS = 10;
export const CHROME_EXTENSION_ORIGIN_REGEX = /^chrome-extension:\/\/[a-p]{32}$/;

/**
 * Get the allowed CORS origins for the OpenCode server.
 *
 * These are the static origins plus the browser-extension origins discovered
 * on this machine. Dynamic origins (user-specific Xano instance URLs) are passed
 * by the browser extension when it starts the server via the native messaging protocol.
 *
 * Environment variable: CALY_EXTRA_CORS_ORIGINS (comma-separated list of additional origins)
 */
export function getAllowedCorsOrigins(): string[] {
   const resolvedExtensions = resolveAllowedExtensionIds();
   return [
      // The main Xano application
      XANO_APP_ORIGIN,
      // Chrome extension origins for extension-to-server communication
      ...resolvedExtensions.ids.map((id) => `chrome-extension://${id}`),
      // Additional origins via environment variable (for development/testing)
      ...getExtraCorsOriginsFromEnv(),
   ];
}

export function isValidCorsOrigin(origin: string, knownExtensionIds: string[]): boolean {
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

export function filterAndValidateOrigins(rawOrigins: unknown, knownExtensionIds: string[]): string[] {
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
