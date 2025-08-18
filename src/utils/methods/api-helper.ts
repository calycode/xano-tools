import {
   MetaApiRequestBlobOptions,
   MetaApiRequestOptions,
   PathParams,
   QueryParams,
   Headers,
   HTTPMethod,
} from '../../types';

// Internal shared helper for building URLs
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

   // Compose base URL
   let url = baseUrl.replace(/\/+$/, '') + '/api:meta' + fullPath;

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

// Internal shared helper for headers
function buildHeaders(token: string, headers: Headers = {}, body: unknown = null): Headers {
   return {
      ...headers,
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
   };
}

// Main JSON request
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

// Main blob request
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
   const buffer = await res.arrayBuffer();
   return Buffer.from(buffer);
}

// Factory for HTTP method helpers
function makeMetaApiMethod<M extends HTTPMethod>(method: M) {
   return (opts: Omit<MetaApiRequestOptions, 'method'>) => metaApiRequest({ ...opts, method });
}

// Exported helpers
export const metaApiGet = makeMetaApiMethod('GET');
export const metaApiPost = makeMetaApiMethod('POST');
