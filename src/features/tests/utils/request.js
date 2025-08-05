// src/tests/utils/request.js
export function prepareRequest({ baseUrl, path, method, headers, body, queryParams }) {
  let fullUrl = baseUrl + path.replace(/\{(\w+?)\}/g, '1');

  // Append query parameters to the URL if specified
  if (queryParams) {
    const queryString = new URLSearchParams(queryParams).toString();
    fullUrl += `?${queryString}`;
  }

  return {
    url: fullUrl,
    method: method.toUpperCase(),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  };
}