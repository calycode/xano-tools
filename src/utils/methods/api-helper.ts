type PathParams = Record<string, string | number>;
type QueryParams = Record<string, string | number | boolean | undefined>;
type Headers = Record<string, string>;
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface MetaApiRequestOptions {
   baseUrl: string;
   token: string;
   method?: HTTPMethod;
   path?: string;
   pathParams?: PathParams;
   query?: QueryParams;
   body?: unknown;
   headers?: Headers;
   allowError?: boolean;
}

interface MetaApiRequestBlobOptions {
   baseUrl: string;
   token: string;
   method?: HTTPMethod;
   path?: string;
   pathParams?: PathParams;
   query?: QueryParams;
   body?: unknown;
   headers?: Headers;
}

// ESM style
export async function metaApiRequest({
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
   // Expand path params (e.g. /workspace/{workspace_id} -> /workspace/123)
   let fullPath = path;
   for (const [key, value] of Object.entries(pathParams)) {
      fullPath = fullPath.replace(`{${key}}`, encodeURIComponent(String(value)));
   }

   // Add query string
   let url = baseUrl.replace(/\/+$/, '') + '/api:meta' + fullPath;
   const queryString = new URLSearchParams(
      Object.fromEntries(
         Object.entries(query)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
      )
   ).toString();
   if (queryString) url += '?' + queryString;

   // Compose headers
   const fetchHeaders: Headers = {
      ...headers,
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
   };

   // Make the request
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

export async function metaApiRequestBlob({
   baseUrl,
   token,
   method = 'GET',
   path = '',
   pathParams = {},
   query = {},
   body = null,
   headers = {},
}: MetaApiRequestBlobOptions): Promise<Buffer> {
   let fullPath = path;
   for (const [key, value] of Object.entries(pathParams)) {
      fullPath = fullPath.replace(`{${key}}`, encodeURIComponent(String(value)));
   }
   let url = baseUrl.replace(/\/+$/, '') + '/api:meta' + fullPath;
   const queryString = new URLSearchParams(
      Object.fromEntries(
         Object.entries(query)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
      )
   ).toString();
   if (queryString) url += '?' + queryString;

   const fetchHeaders: Headers = {
      ...headers,
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
   };

   const res = await fetch(url, {
      method,
      headers: fetchHeaders,
      ...(body ? { body: JSON.stringify(body) } : {}),
   });

   if (!res.ok) {
      throw new Error(`Xano API ${method} ${url} failed: ${res.statusText} (${res.status})`);
   }
   const buffer = await res.arrayBuffer();
   return Buffer.from(buffer); // Node.js Buffer
}
// Optional: helper for common GET
export function metaApiGet(opts) {
   return metaApiRequest({ ...opts, method: 'GET' });
}

// Optional: helper for common POST
export function metaApiPost(opts) {
   return metaApiRequest({ ...opts, method: 'POST' });
}

// Optional: helper for common PUT
export function metaApiPut(opts) {
   return metaApiRequest({ ...opts, method: 'PUT' });
}

// Optional: helper for common DELETE
export function metaApiDelete(opts) {
   return metaApiRequest({ ...opts, method: 'DELETE' });
}
