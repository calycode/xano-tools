import {
   MetaApiRequestBlobOptions,
   MetaApiRequestOptions,
   PathParams,
   QueryParams,
   Headers,
   HTTPMethod,
} from '@mihalytoth20/xcc-types';

/**
 * Internal helper for building Xano Metadata API URLs with path parameters and query strings.
 * @param baseUrl - The base URL of the Xano instance (e.g., 'https://x123.xano.io')
 * @param path - The API endpoint path (e.g., '/workspace/{id}')
 * @param pathParams - Object containing path parameter replacements for {placeholders}
 * @param query - Object containing query string parameters
 * @returns The complete URL with expanded path parameters and query string
 * @internal
 */
function buildMetaApiUrl(
   baseUrl: string,
   path: string = '',
   pathParams: PathParams = {},
   query: QueryParams = {}
): string {
   // Expand path params
   let fullPath = path;
   for (const [key, value] of Object.entries(pathParams)) {
      fullPath = fullPath.replace(`{${key}}`, encodeURIComponent(String(value)));
   }

   // Compose base URL using native URL constructor for better validation
   const metaPath = fullPath ? `/api:meta${fullPath}` : '/api:meta';
   let url = new URL(metaPath, baseUrl).toString();

   // Query string
   const queryString = new URLSearchParams(
      Object.fromEntries(
         Object.entries(query)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
      )
   ).toString();

   if (queryString) url += '?' + queryString;
   return url;
}

/**
 * Internal helper for building HTTP headers with authentication and content type.
 * @param token - Bearer token for Xano API authentication
 * @param headers - Additional headers to merge with defaults
 * @param body - Request body (used to determine if Content-Type should be set)
 * @returns Complete headers object with Authorization and Content-Type as needed
 * @internal
 */
function buildHeaders(token: string, headers: Headers = {}, body: unknown = null): Headers {
   return {
      ...headers,
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
   };
}

/**
 * Makes authenticated HTTP requests to the Xano Metadata API.
 * Handles JSON parsing, error handling, and authentication automatically.
 * 
 * @param options - Configuration options for the API request
 * @param options.baseUrl - The base URL of the Xano instance
 * @param options.token - Bearer token for authentication
 * @param options.method - HTTP method (defaults to 'GET')
 * @param options.path - API endpoint path with optional {placeholders}
 * @param options.pathParams - Object to replace {placeholders} in path
 * @param options.query - Query string parameters
 * @param options.body - Request body for POST/PUT requests (will be JSON stringified)
 * @param options.headers - Additional HTTP headers
 * @param options.allowError - If true, won't throw on non-2xx responses
 * @returns Promise resolving to the parsed JSON response or text if JSON parsing fails
 * @throws {Error} When API request fails and allowError is false
 * 
 * @example
 * ```typescript
 * // Get workspace information
 * const workspace = await metaApiRequest({
 *   baseUrl: 'https://x123.xano.io',
 *   token: 'your-api-token',
 *   method: 'GET',
 *   path: '/workspace/{id}',
 *   pathParams: { id: '123' }
 * });
 * 
 * // Create a new function
 * const newFunction = await metaApiRequest({
 *   baseUrl: 'https://x123.xano.io',
 *   token: 'your-api-token',
 *   method: 'POST',
 *   path: '/workspace/{workspaceId}/function',
 *   pathParams: { workspaceId: '123' },
 *   body: { name: 'my-function', code: 'return "hello"' }
 * });
 * ```
 */
async function metaApiRequest({
   baseUrl,
   token,
   method = 'GET',
   path = '',
   pathParams = {},
   query = {},
   body = null,
   headers = {},
   allowError = false,
}: MetaApiRequestOptions): Promise<any> {
   const url = buildMetaApiUrl(baseUrl, path, pathParams, query);
   const fetchHeaders = buildHeaders(token, headers, body);

   const res = await fetch(url, {
      method,
      headers: fetchHeaders,
      ...(body ? { body: JSON.stringify(body) } : {}),
   });

   let result: any;
   try {
      result = await res.json();
   } catch {
      result = await res.text();
   }

   if (!res.ok && !allowError) {
      const msg = result && result.message ? result.message : res.statusText;
      throw new Error(`Xano API ${method} ${url} failed: ${msg} (${res.status})`);
   }
   return result;
}

/**
 * Makes authenticated HTTP requests to the Xano Metadata API for binary data.
 * Similar to metaApiRequest but returns raw binary data as Uint8Array.
 * 
 * @param options - Configuration options for the API request
 * @param options.baseUrl - The base URL of the Xano instance
 * @param options.token - Bearer token for authentication
 * @param options.method - HTTP method (defaults to 'GET')
 * @param options.path - API endpoint path with optional {placeholders}
 * @param options.pathParams - Object to replace {placeholders} in path
 * @param options.query - Query string parameters
 * @param options.body - Request body for POST/PUT requests (will be JSON stringified)
 * @param options.headers - Additional HTTP headers
 * @returns Promise resolving to binary data as Uint8Array
 * @throws {Error} When API request fails (always throws on non-2xx responses)
 * 
 * @example
 * ```typescript
 * // Download workspace backup
 * const backupData = await metaApiRequestBlob({
 *   baseUrl: 'https://x123.xano.io',
 *   token: 'your-api-token',
 *   method: 'GET',
 *   path: '/workspace/{id}/backup',
 *   pathParams: { id: '123' }
 * });
 * 
 * // Save to file
 * await fs.writeFile('backup.tar.gz', backupData);
 * ```
 */
export async function metaApiRequestBlob({
   baseUrl,
   token,
   method = 'GET',
   path = '',
   pathParams = {},
   query = {},
   body = null,
   headers = {},
}: MetaApiRequestBlobOptions): Promise<Uint8Array> {
   const url = buildMetaApiUrl(baseUrl, path, pathParams, query);
   const fetchHeaders = buildHeaders(token, headers, body);

   const res = await fetch(url, {
      method,
      headers: fetchHeaders,
      ...(body ? { body: JSON.stringify(body) } : {}),
   });

   if (!res.ok) {
      throw new Error(`Xano API ${method} ${url} failed: ${res.statusText} (${res.status})`);
   }
   const arrayBuffer = await res.arrayBuffer();
   return new Uint8Array(arrayBuffer);
}

/**
 * Factory function for creating HTTP method-specific API request helpers.
 * @param method - The HTTP method to bind to the helper function
 * @returns A function that makes API requests with the specified method
 * @internal
 */
function makeMetaApiMethod<M extends HTTPMethod>(method: M) {
   return (opts: Omit<MetaApiRequestOptions, 'method'>) => metaApiRequest({ ...opts, method });
}

/**
 * Convenience function for making GET requests to the Xano Metadata API.
 * @param options - API request options (method is automatically set to 'GET')
 * @returns Promise resolving to the API response
 * 
 * @example
 * ```typescript
 * const workspaces = await metaApiGet({
 *   baseUrl: 'https://x123.xano.io',
 *   token: 'your-api-token',
 *   path: '/workspaces'
 * });
 * ```
 */
export const metaApiGet = makeMetaApiMethod('GET');

/**
 * Convenience function for making POST requests to the Xano Metadata API.
 * @param options - API request options (method is automatically set to 'POST')
 * @returns Promise resolving to the API response
 * 
 * @example
 * ```typescript
 * const newWorkspace = await metaApiPost({
 *   baseUrl: 'https://x123.xano.io',
 *   token: 'your-api-token',
 *   path: '/workspace',
 *   body: { name: 'My New Workspace' }
 * });
 * ```
 */
export const metaApiPost = makeMetaApiMethod('POST');
