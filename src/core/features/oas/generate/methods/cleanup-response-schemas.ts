// TODO: add in the [path][method]['200'] to expected schemas mapping...
// [ ] CORE, needs yielding
/**
 * Recursively normalize an old OAS schema to JSON Schema 2020-12 compliance.
 * @param schema The input (possibly legacy) schema object.
 * @returns The normalized JSON Schema 2020-12 object.
 */
function normalizeToJsonSchema(schema) {
   if (!schema || typeof schema !== 'object') return schema;

   // If array of field descriptors (legacy custom), convert to object schema
   if (Array.isArray(schema)) {
      // Convert [{name, ...}, ...] to {type:object, properties:{}, required:[]}
      const out = { type: 'object', properties: {}, required: [] };
      for (const field of schema) {
         if (!field.name) continue;
         out.properties[field.name] = normalizeToJsonSchema(field);
         if (field.required) out.required.push(field.name);
      }
      if (out.required.length === 0) delete out.required;
      return out;
   }

   // If already a JSON Schema object
   const out = { ...schema };

   // Fix required: if it's an array of indexes, convert to property names
   if (Array.isArray(out.required) && out.properties) {
      // If required is array of numbers, map to property names by index
      if (typeof out.required[0] === 'number') {
         const keys = Object.keys(out.properties);
         out.required = out.required.map((idx) => keys[idx]).filter(Boolean);
      }
      // Remove empty required
      if (out.required.length === 0) delete out.required;
   }

   // Fix nullability
   if (out.nullable === true && out.type && typeof out.type === 'string') {
      out.type = [out.type, 'null'];
      delete out.nullable;
   }

   // Fix minItems/maxItems
   if (typeof out.minItems === 'string') out.minItems = Number(out.minItems);
   if (typeof out.maxItems === 'string') out.maxItems = Number(out.maxItems);

   // Handle enums (may be under 'enum' or 'values')
   if (out.values && !out.enum) {
      out.enum = out.values;
      delete out.values;
   }

   // Recursively fix properties
   if (out.properties && typeof out.properties === 'object') {
      for (const [k, v] of Object.entries(out.properties)) {
         out.properties[k] = normalizeToJsonSchema(v);
      }
   }

   // Recursively fix items
   if (out.items) {
      out.items = normalizeToJsonSchema(out.items);
   }

   // Recursively fix additionalProperties if it's an object
   if (out.additionalProperties && typeof out.additionalProperties === 'object') {
      out.additionalProperties = normalizeToJsonSchema(out.additionalProperties);
   }

   // Recursively fix allOf/oneOf/anyOf
   ['allOf', 'oneOf', 'anyOf'].forEach((key) => {
      if (Array.isArray(out[key])) {
         out[key] = out[key].map(normalizeToJsonSchema);
      }
   });

   // Remove legacy/unknown fields if needed (optional)
   // delete out.nullable; // already handled above

   return out;
}

function cleanupResponseSchemas(oas) {
   const spec = oas;

   const queryToSchemaMap = new Map([]);

   Object.entries(spec.paths).forEach(([path, pathItem]) => {
      Object.entries(pathItem).forEach(([method, methodItem]) => {
         const methodUpper = method.toUpperCase();
         const mapKey = `${methodUpper}:${path}`;

         // Fix the summary:
         methodItem.summary = mapKey;

         // Fix requestBody schema
         if (methodItem.requestBody?.content?.['application/json']?.schema) {
            methodItem.requestBody.content['application/json'].schema = normalizeToJsonSchema(
               methodItem.requestBody.content['application/json'].schema
            );
         }

         // Fix requestBody schema
         if (methodItem.requestBody?.content?.['multipart/form-data']?.schema) {
            methodItem.requestBody.content['multipart/form-data'].schema = normalizeToJsonSchema(
               methodItem.requestBody.content['multipart/form-data'].schema
            );
         }

         Object.entries(methodItem.responses).forEach(([statusCode, response]: [string, any]) => {
            // Replace entire response object with $ref for standard responses
            switch (statusCode) {
               case '400':
                  methodItem.responses[statusCode] = {
                     $ref: '#/components/responses/BadRequest',
                  };
                  break;
               case '401':
                  methodItem.responses[statusCode] = {
                     $ref: '#/components/responses/Unauthorized',
                  };
                  break;
               case '403':
                  methodItem.responses[statusCode] = {
                     $ref: '#/components/responses/AccessDenied',
                  };
                  break;
               case '404':
                  methodItem.responses[statusCode] = {
                     $ref: '#/components/responses/NotFound',
                  };
                  break;
               case '429':
                  methodItem.responses[statusCode] = {
                     $ref: '#/components/responses/TooManyRequests',
                  };
                  break;
               case '500':
                  methodItem.responses[statusCode] = {
                     $ref: '#/components/responses/InternalServerError',
                  };
                  break;
               case '200':
                  if (queryToSchemaMap.has(mapKey)) {
                     const customSchema = queryToSchemaMap.get(mapKey);
                     methodItem.responses[statusCode] = {
                        description: 'Successful response',
                        content: {
                           'application/json': {
                              schema: customSchema,
                           },
                        },
                     };
                  }
                  if (
                     !queryToSchemaMap.has(mapKey) &&
                     response?.content?.['application/json']?.schema
                  ) {
                     const schema = response?.content?.['application/json']?.schema;
                     if (schema) normalizeToJsonSchema(schema);
                  }
                  break;
               default: {
                  const schema = response?.content?.['application/json']?.schema;
                  if (schema) normalizeToJsonSchema(schema);
               }
            }
         });
      });
   });

   return spec;
}

export { cleanupResponseSchemas };
