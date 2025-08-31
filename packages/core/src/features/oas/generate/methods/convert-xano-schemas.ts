/**
 * Maps Xano field types to JSON Schema types
 */
const TYPE_MAP = {
   int: 'integer',
   decimal: 'number',
   text: 'string',
   enum: 'string',
   timestamp: 'integer',
   object: 'object',
   json: 'object',
   vector: 'number',
};

/**
 * Recursively converts a Xano schema field to JSON Schema property.
 * @param {object} field - Xano field descriptor.
 * @returns {object} - JSON Schema property.
 */
function convertField(field) {
   const jsonSchema: any = {};

   // Basic type mapping
   const baseType = TYPE_MAP[field.type] || 'string';

   // Handle lists
   if (field.style === 'list') {
      jsonSchema.type = 'array';
      jsonSchema.items = convertField({
         ...field,
         style: 'single', // Treat items as individual objects
      });
      return jsonSchema;
   }

   jsonSchema.type = baseType;

   // Handle vector type
   // [ ] Handle vector as a more relevant type
   if (field.type === 'vector') {
      jsonSchema.type = 'array';
      jsonSchema.items = { type: 'number' };
   }

   // Enum values
   if (field.type === 'enum' && Array.isArray(field.values)) {
      jsonSchema.enum = field.values;
   }

   // Default values
   if (field.default !== '') {
      jsonSchema.default = isNaN(field.default) ? field.default : Number(field.default);
   }

   // Nullable handling
   if (field.nullable) {
      jsonSchema.type = [jsonSchema.type, 'null'];
   }

   // Add description if exists
   if (field.description) {
      jsonSchema.description = field.description;
   }

   // Nested objects
   if (field.children) {
      jsonSchema.title = 'sub-object';
      jsonSchema.properties = {};
      const requiredFields = [];
      for (const child of field.children) {
         jsonSchema.properties[child.name] = convertField(child);
         if (child.required) {
            requiredFields.push(child.name);
         }
      }
      if (requiredFields.length) {
         jsonSchema.required = requiredFields;
      }
   }

   return jsonSchema;
}

/**
 * Converts a full Xano table schema to JSON Schema.
 * @param {Array} xanoSchema - Array of field descriptors.
 * @param {object} [options]
 * @returns {object} - JSON Schema object.
 */
function convertXanoSchemaToJsonSchema(xanoSchema, { includeInternal = false } = {}) {
   const jsonSchema = {
      type: 'object',
      properties: {},
      required: [],
   };

   for (const field of xanoSchema) {
      if (!includeInternal && field.access === 'internal') continue;

      jsonSchema.properties[field.name] = convertField(field);

      if (field.required) {
         jsonSchema.required.push(field.name);
      }
   }

   if (jsonSchema.required.length === 0) {
      delete jsonSchema.required;
   }

   return jsonSchema;
}

export { convertXanoSchemaToJsonSchema };
