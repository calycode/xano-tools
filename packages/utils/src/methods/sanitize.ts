// src/utils/sanitize.ts
import { SanitizeOptions } from '@repo/types';

const defaultOptions: Required<Omit<SanitizeOptions, 'allowedCharsRegex'>> & {
   allowedCharsRegex: RegExp;
} = {
   normalizeUnicode: true,
   removeDiacritics: true,
   allowedCharsRegex: /[a-zA-Z0-9-]/, // for dashes, no underscore by default
   replacementChar: '-',
   collapseRepeats: true,
   trimReplacement: true,
   toLowerCase: true,
};

/**
 * Sanitizes a string by normalizing unicode, removing diacritics, and replacing invalid characters.
 * Provides comprehensive string cleaning with configurable options.
 *
 * @param input - The string to sanitize
 * @param options - Configuration options for sanitization behavior
 * @returns The sanitized string according to the specified options
 *
 * @example
 * ```typescript
 * const result = sanitizeString('Café & Restaurant!', {
 *   allowedCharsRegex: /a-zA-Z0-9_-/,
 *   replacementChar: '_',
 *   toLowerCase: true
 * });
 * // Returns: 'cafe___restaurant_'
 * ```
 */
function sanitizeString(input: string, options: SanitizeOptions = {}): string {
   const opts = { ...defaultOptions, ...options };
   let s = input;

   if (opts.normalizeUnicode) {
      s = s.normalize('NFKD');
   }
   if (opts.removeDiacritics) {
      s = s.replace(/[\u0300-\u036F]/g, '');
   }

   if (opts.replacementChar === '-') {
      s = s.replace(/[\s_]+/g, '-');
   } else if (opts.replacementChar === '_') {
      s = s.replace(/[\s-]+/g, '_');
   }

   s = s.replace(new RegExp(`[^${opts.allowedCharsRegex.source}]`, 'g'), opts.replacementChar);

   if (opts.collapseRepeats) {
      s = s.replace(new RegExp(`\\${opts.replacementChar}+`, 'g'), opts.replacementChar);
   }

   if (opts.trimReplacement) {
      s = s.replace(new RegExp(`^\\${opts.replacementChar}+|\\${opts.replacementChar}+$`, 'g'), '');
   }

   if (opts.toLowerCase) {
      s = s.toLowerCase();
   }
   return s;
}

// --- Usage Examples ---

/**
 * Normalizes an API group name for consistent usage across the CLI.
 * Uses default sanitization options optimized for API group naming.
 *
 * @param name - The API group name to normalize
 * @returns A normalized API group name safe for filesystem and URL usage
 *
 * @example
 * ```typescript
 * const normalized = normalizeApiGroupName('User Management API');
 * // Returns: 'user-management-api'
 * ```
 */
function normalizeApiGroupName(name: string): string {
   // Uses all defaults
   return sanitizeString(name);
}

/**
 * Sanitizes an instance name for consistent configuration storage.
 * Uses default sanitization options optimized for instance naming.
 *
 * @param name - The instance name to sanitize
 * @returns A sanitized instance name safe for configuration keys and filesystem usage
 *
 * @example
 * ```typescript
 * const sanitized = sanitizeInstanceName('Production 2024!');
 * // Returns: 'production-2024'
 * ```
 */
function sanitizeInstanceName(name: string): string {
   // Uses all defaults
   return sanitizeString(name);
}

/**
 * Sanitizes a filename while preserving case and allowing file extensions.
 * Optimized for creating safe filenames that maintain readability.
 *
 * @param fileName - The filename to sanitize
 * @returns A filesystem-safe filename with preserved case and extension support
 *
 * @example
 * ```typescript
 * const safeFileName = sanitizeFileName('My API Spec.json');
 * // Returns: 'My_API_Spec.json'
 *
 * const configFile = sanitizeFileName('config-file!@#.yaml');
 * // Returns: 'config-file___.yaml'
 * ```
 */
function sanitizeFileName(fileName: string): string {
   return sanitizeString(fileName, {
      allowedCharsRegex: /[a-zA-Z0-9._-]/,
      replacementChar: '_',
      toLowerCase: false,
   });
}

export { normalizeApiGroupName, sanitizeInstanceName, sanitizeFileName };
