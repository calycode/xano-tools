// src/utils/sanitize.js
export function sanitizeInstanceName(name) {
   return name
      .normalize('NFKD') // Normalize unicode
      .replace(/[\u0300-\u036F]/g, '') // Remove accents/diacritics
      .replace(/[^a-zA-Z0-9_-]/g, '-') // Replace invalid chars with dash
      .replace(/-+/g, '-') // Collapse multiple dashes
      .replace(/^-+|-+$/g, '') // Trim leading/trailing dashes
      .toLowerCase(); // Lowercase for consistency
}
