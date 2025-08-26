/**
 * Recursively replaces {placeholders} in strings, arrays, or objects with values from replacements.
 * Keys are matched case-insensitively.
 *
 * @param template - The template (string, array, or object)
 * @param replacements - Key-value pairs for replacement
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
