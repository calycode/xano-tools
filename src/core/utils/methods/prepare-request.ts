// --- Types ---
import { Schema, PrepareRequestArgs, PreparedRequest } from '../../../types';

// [ ] CORE
// --- Main Function ---
export function prepareRequest({
   baseUrl,
   path,
   method,
   headers = {},
   parameters = [],
   body,
}: PrepareRequestArgs): PreparedRequest {
   // 1. Split parameters by their "in"
   const pathParams: Record<string, unknown> = {};
   const queryParams: Record<string, unknown> = {};
   const headerParams: Record<string, unknown> = {};
   // const cookieParams: Record<string, unknown> = {}; // For future support

   parameters.forEach((param) => {
      const value = param.example ?? param.default ?? guessDummyForType(param.schema?.type);
      switch (param.in) {
         case 'path':
            pathParams[param.name] = value;
            break;
         case 'query':
            queryParams[param.name] = value;
            break;
         case 'header':
            headerParams[param.name] = value;
            break;
         // case 'cookie':
         //   cookieParams[param.name] = value;
         //   break;
      }
   });

   // 2. Replace path params: /foo/{id}/{name} => /foo/1/1
   const fullUrl =
      baseUrl +
      path.replace(/\{(\w+?)\}/g, (_, key) =>
         pathParams[key] !== undefined ? String(pathParams[key]) : '1'
      );

   // 3. Append query string if any
   let url = fullUrl;
   if (Object.keys(queryParams).length > 0) {
      const queryString = new URLSearchParams(
         Object.fromEntries(Object.entries(queryParams).map(([k, v]) => [k, String(v)]))
      ).toString();
      url += (url.includes('?') ? '&' : '?') + queryString;
   }

   // 4. Merge headers (config + endpoint + OpenAPI header params)
   const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
      ...headerParams,
   };

   // 5. Prepare body if present
   let preparedBody: string | undefined = undefined;
   if (body && Object.keys(body).length > 0) {
      preparedBody = JSON.stringify(mockFromSchema(body));
   }

   return {
      url,
      method: method.toUpperCase(),
      headers: finalHeaders,
      body: preparedBody,
   };
}

// --- Helper: Generate mock data from schema ---
function mockFromSchema(schema?: Schema): unknown {
   if (!schema || typeof schema !== 'object') return guessDummyForType(schema?.type);

   // Handle enums
   if (schema.enum && schema.enum.length > 0) return schema.enum[0];

   // Use default or example if available
   if (schema.default !== undefined) return schema.default;
   if (schema.example !== undefined) return schema.example;

   // Handle types
   switch (schema.type) {
      case 'object':
         if (schema.properties) {
            const obj: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(schema.properties)) {
               obj[k] = mockFromSchema(v);
            }
            return obj;
         }
         return {};
      case 'array':
         if (schema.items) return [mockFromSchema(schema.items)];
         return [];
      default:
         return guessDummyForType(schema.type);
   }
}

// --- Helper: Dummy value generator for types ---
function guessDummyForType(type?: string): unknown {
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
