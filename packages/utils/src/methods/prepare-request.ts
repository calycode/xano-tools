// --- Types ---
import { Schema, PrepareRequestArgs, PreparedRequest } from '@mihalytoth20/xcc-types';

/**
 * Prepares an HTTP request from OpenAPI specification parameters.
 * Processes path parameters, query parameters, headers, and request body to create a complete HTTP request.
 *
 * @param args - Request preparation arguments
 * @param args.baseUrl - The base URL for the API
 * @param args.path - The endpoint path with optional {placeholders}
 * @param args.method - HTTP method (GET, POST, PUT, etc.)
 * @param args.headers - Additional headers to include
 * @param args.parameters - OpenAPI parameter definitions
 * @param args.body - Request body schema for POST/PUT requests
 * @returns A prepared request object ready for execution
 *
 * @example
 * ```typescript
 * const request = prepareRequest({
 *   baseUrl: 'https://api.example.com',
 *   path: '/users/{id}',
 *   method: 'GET',
 *   parameters: [
 *     { name: 'id', in: 'path', schema: { type: 'string' } },
 *     { name: 'include', in: 'query', schema: { type: 'string' } }
 *   ]
 * });
 * // Returns: { url: 'https://api.example.com/users/1?include=string', method: 'GET', ... }
 * ```
 */
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

   // 2. Replace path params using URL constructor for better validation
   let processedPath = path.replace(/\{(\w+?)\}/g, (_, key) =>
      pathParams[key] !== undefined ? String(pathParams[key]) : '1'
   );

   const fullUrl = new URL(processedPath, baseUrl).toString();

   // 3. Append query string using URLSearchParams
   const urlObj = new URL(fullUrl);
   Object.entries(queryParams).forEach(([key, value]) => {
      urlObj.searchParams.set(key, String(value));
   });
   const url = urlObj.toString();

   // 4. Merge headers (config + endpoint + OpenAPI header params)
   const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
      ...headerParams,
   };

   // 5. Prepare body if present
   let preparedBody: string | undefined = undefined;
   if (body && typeof body === 'object' && Object.keys(body).length > 0) {
      preparedBody = JSON.stringify(mockFromSchema(body));
   }

   return {
      url,
      method: method.toUpperCase(),
      headers: finalHeaders,
      body: preparedBody,
   };
}

/**
 * Generates mock data from an OpenAPI schema definition.
 * Creates realistic sample data based on schema types, examples, and constraints.
 *
 * @param schema - OpenAPI schema definition
 * @returns Mock data that conforms to the schema
 *
 * @example
 * ```typescript
 * const mockData = mockFromSchema({
 *   type: 'object',
 *   properties: {
 *     name: { type: 'string', example: 'John' },
 *     age: { type: 'integer', default: 25 }
 *   }
 * });
 * // Returns: { name: 'John', age: 25 }
 * ```
 */
// --- Helper: Generate mock data from schema ---
function mockFromSchema(schema?: Schema): unknown {
   if (!schema || typeof schema !== 'object') return guessDummyForType(schema?.type);

   if (Array.isArray(schema.enum) && schema.enum.length > 0) return schema.enum[0];

   if (schema.default !== undefined) return schema.default;
   if (schema.example !== undefined) return schema.example;

   switch (schema.type) {
      case 'object':
         if (schema.properties && typeof schema.properties === 'object') {
            return Object.fromEntries(
               Object.entries(schema.properties).map(([k, v]) => [k, mockFromSchema(v)])
            );
         }
         return {};
      case 'array':
         return schema.items ? [mockFromSchema(schema.items)] : [];
      default:
         return guessDummyForType(schema.type);
   }
}

/**
 * Generates dummy values for basic OpenAPI types.
 * Provides fallback values when schema examples or defaults are not available.
 *
 * @param type - The OpenAPI type (string, integer, number, boolean, etc.)
 * @returns A dummy value appropriate for the specified type
 *
 * @example
 * ```typescript
 * const stringValue = guessDummyForType('string'); // Returns: 'string'
 * const numberValue = guessDummyForType('integer'); // Returns: 1
 * const boolValue = guessDummyForType('boolean'); // Returns: false
 * ```
 */
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
