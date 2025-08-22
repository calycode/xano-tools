// Minimal schema type (customize as needed)
import { TableSchemaItem } from '../../../types';

/**
 * Checks if a schema is "empty".
 * - null/undefined
 * - empty array
 * - object with no keys except type/description
 * - properties or items present but empty
 */
export function isEmptySchema(schema: unknown): boolean {
   if (schema == null) return true; // null or undefined

   if (Array.isArray(schema)) {
      return schema.length === 0;
   }

   if (typeof schema === 'object') {
      const obj = schema as TableSchemaItem;

      // Only type/description keys
      const keys = Object.keys(obj).filter((k) => !['type', 'description'].includes(k));
      if (keys.length === 0) return true;

      // Empty properties
      if ('properties' in obj && obj.properties && Object.keys(obj.properties).length === 0) {
         return true;
      }

      // Empty items (recursive)
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
