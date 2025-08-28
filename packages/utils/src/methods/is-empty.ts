// Minimal schema type (customize as needed)
import { TableSchemaItem } from '@mihalytoth20/xcc-types';

/**
 * Checks if a schema object is empty or contains no meaningful type information.
 * Uses native JavaScript methods for efficient object inspection.
 * 
 * @param schema - The schema object to check
 * @returns True if the schema is empty or meaningless, false otherwise
 * 
 * @example
 * ```typescript
 * const emptySchema = isEmptySchema({}); // true
 * const validSchema = isEmptySchema({ type: 'string' }); // false
 * const nestedEmpty = isEmptySchema({ type: 'object', properties: {} }); // true
 * ```
 */
export function isEmptySchema(schema: unknown): boolean {
   if (schema == null) return true;

   if (Array.isArray(schema)) {
      return schema.length === 0;
   }

   if (typeof schema === 'object') {
      const obj = schema as TableSchemaItem;
      const keys = Object.keys(obj).filter((k) => !['type', 'description'].includes(k));
      
      if (keys.length === 0) return true;

      if ('properties' in obj && obj.properties && Object.keys(obj.properties).length === 0) {
         return true;
      }

      if ('items' in obj && obj.items && isEmptySchema(obj.items)) {
         return true;
      }
   }

   return false;
}

/**
 * Checks if a value is not null, undefined, or empty string.
 */
export function isNotEmpty<T>(value: T | null | undefined | ''): value is T {
   return value !== null && value !== undefined && value !== '';
}
