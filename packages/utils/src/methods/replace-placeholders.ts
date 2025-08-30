/**
 * Recursively replaces {placeholders} in strings, arrays, or objects with values from replacements.
 * Keys are matched case-insensitively. Supports nested objects and arrays.
 *
 * @param template - The template (string, array, or object) containing {placeholder} patterns
 * @param replacements - Key-value pairs for replacement (keys are case-insensitive)
 * @returns The template with all placeholders replaced by corresponding values
 *
 * @example
 * ```typescript
 * // String replacement
 * const result = replacePlaceholders(
 *   'Hello {name}, welcome to {app}!',
 *   { name: 'John', app: 'Caly' }
 * );
 * // Returns: 'Hello John, welcome to Caly!'
 *
 * // Object replacement
 * const config = replacePlaceholders(
 *   {
 *     url: 'https://{instance}.xano.io/api/{version}',
 *     headers: { 'X-Branch': '{branch}' }
 *   },
 *   { instance: 'x123', version: 'v1', branch: 'main' }
 * );
 * // Returns: { url: 'https://x123.xano.io/api/v1', headers: { 'X-Branch': 'main' } }
 * ```
 * @returns - The template with placeholders replaced
 */
export function replacePlaceholders(
   template: any,
   replacements: Record<string, string | number>
): any {
   if (typeof template === 'string') {
      return template.replace(/\{([^}]+)\}/g, (_, key) => {
         const foundKey = Object.keys(replacements).find(
            (k) => k.toLowerCase() === key.toLowerCase()
         );
         return foundKey !== undefined ? String(replacements[foundKey]) : '';
      });
   }
   if (Array.isArray(template)) {
      return template.map((item) => replacePlaceholders(item, replacements));
   }
   if (typeof template === 'object' && template !== null) {
      return Object.fromEntries(
         Object.entries(template).map(([key, value]) => [
            key,
            replacePlaceholders(value, replacements),
         ])
      );
   }
   return template;
}
