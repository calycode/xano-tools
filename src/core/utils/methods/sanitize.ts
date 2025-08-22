// src/utils/sanitize.ts
import { SanitizeOptions } from '../../../types';

const defaultOptions: Required<Omit<SanitizeOptions, 'allowedCharsRegex'>> & {
   allowedCharsRegex: RegExp;
} = {
   normalizeUnicode: true,
   removeDiacritics: true,
   allowedCharsRegex: /a-zA-Z0-9_-/, // Default: allow letters, numbers, dash, underscore
   replacementChar: '-',
   collapseRepeats: true,
   trimReplacement: true,
   toLowerCase: true,
};

function sanitizeString(input: string, options: SanitizeOptions = {}): string {
   // Merge user options with defaults
   const opts = { ...defaultOptions, ...options };

   let s = input;

   if (opts.normalizeUnicode) {
      s = s.normalize('NFKD');
   }
   if (opts.removeDiacritics) {
      s = s.replace(/[\u0300-\u036F]/g, '');
   }
   s = s.replace(new RegExp(`[^${opts.allowedCharsRegex.source}]`, 'g'), opts.replacementChar);

   if (opts.collapseRepeats) {
      const re = new RegExp(`[${opts.replacementChar}]+`, 'g');
      s = s.replace(re, opts.replacementChar);
   }
   if (opts.trimReplacement) {
      const re = new RegExp(`^${opts.replacementChar}+|${opts.replacementChar}+$`, 'g');
      s = s.replace(re, '');
   }
   if (opts.toLowerCase) {
      s = s.toLowerCase();
   }
   return s;
}

// --- Usage Examples ---

function normalizeApiGroupName(name: string): string {
   // Uses all defaults
   return sanitizeString(name);
}

function sanitizeInstanceName(name: string): string {
   // Uses all defaults
   return sanitizeString(name);
}

function sanitizeFileName(fileName: string): string {
   // Override for file names: underscores, no lowercase
   return sanitizeString(fileName, {
      allowedCharsRegex: /a-zA-Z0-9._-/, // allow dot for extension, can adjust as needed
      replacementChar: '_',
      toLowerCase: false,
   });
}

export { normalizeApiGroupName, sanitizeInstanceName, sanitizeFileName };
