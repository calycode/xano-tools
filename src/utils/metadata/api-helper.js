// ESM style
export async function metaApiRequest({
   baseUrl,
   token,
   method = 'GET',
   path = '', // e.g. '/workspace', '/workspace/123/apigroup'
   pathParams = {}, // {workspace_id: 123, apigroup_id: 456}
   query = {}, // {page: 1, per_page: 100}
   body = null, // arbitrary object, for POST/PUT
   headers = {}, // additional headers if needed
}) {
   // Expand path params (e.g. /workspace/{workspace_id} -> /workspace/123)
   let fullPath = path;
   for (const [key, value] of Object.entries(pathParams)) {
      fullPath = fullPath.replace(`{${key}}`, encodeURIComponent(value));
   }

   // Add query string
   let url = baseUrl.replace(/\/+$/, '') + '/api:meta' + fullPath;
   const queryString = new URLSearchParams(query).toString();
   if (queryString) url += '?' + queryString;

   // Compose headers
   const fetchHeaders = {
      ...headers,
      Authorization: `Bearer ${token}`,
      // Add content-type for POST/PUT if there is a body (unless overridden)
      ...(body ? { 'Content-Type': 'application/json' } : {}),
   };

   // Make the request
   const res = await fetch(url, {
      method,
      headers: fetchHeaders,
      ...(body ? { body: JSON.stringify(body) } : {}),
   });

   let result;
   try {
      result = await res.json();
   } catch {
      result = await res.text();
   }

   if (!res.ok) {
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
}) {
   let fullPath = path;
   for (const [key, value] of Object.entries(pathParams)) {
      fullPath = fullPath.replace(`{${key}}`, encodeURIComponent(value));
   }
   let url = baseUrl.replace(/\/+$/, '') + '/api:meta' + fullPath;
   const queryString = new URLSearchParams(query).toString();
   if (queryString) url += '?' + queryString;

   const fetchHeaders = {
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
