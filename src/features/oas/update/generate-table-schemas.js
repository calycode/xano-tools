import { metaApiGet, getCurrentContextConfig } from '../../../utils/index.js';

import { loadToken } from '../../../config/loaders.js';

/**
 * Maps Xano field types to JSON Schema types
 */
const typeMap = {
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
 * Recursively converts Xano schema field to JSON Schema property
 */
function convertField(field) {
   const jsonSchema = {};

   // Basic type mapping
   const baseType = typeMap[field.type] || 'string';

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

   // Handle vector type:
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
      (jsonSchema.title = 'sub-object'), (jsonSchema.properties = {});
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
 * Converts full schema
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

async function generateTableSchemas() {
   const { instanceConfig, workspaceConfig } = getCurrentContextConfig();

   const tableSchemas = {};

   const workspaceTablesRaw = await metaApiGet({
      baseUrl: instanceConfig.url,
      path: `/workspace/${workspaceConfig.id}/table`,
      query: {
         sort: 'name',
         order: 'asc',
         page: 1,
         per_page: 500,
      },
      token: loadToken(instanceConfig.name),
   });

   const workspaceTables = workspaceTablesRaw.items;

   for (const table of workspaceTables) {
      const workspaceTableSchemaRaw = await metaApiGet({
         baseUrl: instanceConfig.url,
         path: `/workspace/${workspaceConfig.id}/table/${table.id}/schema`,
         token: loadToken(instanceConfig.name),
      });

      const workspaceTableSchema = workspaceTableSchemaRaw;

      tableSchemas[`Table.${table.name.replace(' ', '_')}`] = {
         title: `Table.${table.name.replace(' ', '_')}`,
         description: `#### Table id: ${table.id}. ${
            table.auth ? '\n\n **This table is used for AUTH.**' : ''
         }`,
         type: 'object',
         properties: convertXanoSchemaToJsonSchema(workspaceTableSchema, { includeInternal: true })
            .properties,
      };
   }

   return tableSchemas;
}

export { generateTableSchemas };
