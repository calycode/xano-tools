export function prepareRequest({ baseUrl, path, method, headers, parameters = [], body }) {
   // 1. Split parameters by their "in"
   const pathParams = {};
   const queryParams = {};
   const headerParams = {};

   parameters.forEach((param) => {
      const value = param.example ?? param.default ?? guessDummyForType(param.schema?.type);
      if (param.in === 'path') pathParams[param.name] = value;
      else if (param.in === 'query') queryParams[param.name] = value;
      else if (param.in === 'header') headerParams[param.name] = value;
      // (You can add cookie param support if needed)
   });

   // 2. Replace path params: /foo/{id}/{name} => /foo/1/1
   let fullUrl = baseUrl + path.replace(/\{(\w+?)\}/g, (_, key) => pathParams[key] ?? '1');

   // 3. Append query string if any
   if (Object.keys(queryParams).length > 0) {
      const queryString = new URLSearchParams(queryParams).toString();
      fullUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
   }

   // 4. Merge headers (config + endpoint + OpenAPI header params)
   const finalHeaders = {
      'Content-Type': 'application/json',
      ...headers,
      ...headerParams,
   };

   return {
      url: fullUrl,
      method: method.toUpperCase(),
      headers: finalHeaders,
      body: body && Object.keys(body).length > 0 ? JSON.stringify(mockFromSchema(body)) : undefined,
   };
}

// Generate mock data from schema
function mockFromSchema(schema) {
   if (!schema || typeof schema !== 'object') return guessDummyForType(schema?.type);

   // Handle enums
   if (schema.enum && schema.enum.length > 0) return schema.enum[0];

   // Use default or example if available
   if (schema.default !== undefined) return schema.default;
   if (schema.example !== undefined) return schema.example;

   // Handle types
   const obj = {};
   switch (schema.type) {
      case 'object':
         if (schema.properties) {
            for (const [k, v] of Object.entries(schema.properties)) {
               obj[k] = mockFromSchema(v);
            }
         }
         return obj;
      case 'array':
         if (schema.items) return [mockFromSchema(schema.items)];
         return [];
      default:
         return guessDummyForType(schema.type);
   }
}

// Dummy value generator for types
function guessDummyForType(type) {
   switch (type) {
      case 'string':
         return 'string';
      case 'integer':
         return 1;
      case 'number':
         return 1.23;
      case 'boolean':
         return false;
      case 'array':
         return [];
      case 'object':
         return {};
      default:
         return '';
   }
}
