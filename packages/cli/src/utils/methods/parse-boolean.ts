/**
 * Parse a boolean environment variable.
 *
 * Recognizes `1/true/yes/on` and `0/false/no/off` case-insensitively; any other
 * value (including unset) falls back to `defaultValue`.
 */
export function parseBooleanEnv(envValue: string | undefined, defaultValue: boolean): boolean {
   if (!envValue) {
      return defaultValue;
   }

   const normalized = envValue.trim().toLowerCase();
   if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
   }
   if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
   }
   return defaultValue;
}
