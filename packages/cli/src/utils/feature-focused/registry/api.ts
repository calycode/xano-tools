const registryCache = new Map();

/**
 * Validates and normalizes a registry path to prevent path traversal.
 * Removes leading slashes, blocks ".." components, and ensures safe URL construction.
 * @param inputPath - The path to validate
 * @returns Normalized safe path
 * @throws {Error} if path contains traversal attempts
 */
function validateRegistryPath(inputPath: string): string {
   // Remove leading slashes
   let normalized = inputPath.replace(/^\/+/, '');

   // Block path traversal attempts
   // Check for ".." in path components (handles both / and \ separators)
   if (/(^|\/)\.\.($|\/|\\)|(^|\\)\.\.($|\/|\\)/.test(normalized)) {
      throw new Error(`Invalid registry path: "${inputPath}" contains path traversal`);
   }

   // Also block encoded traversal attempts
   if (normalized.includes('%2e%2e') || normalized.includes('%2E%2E')) {
      throw new Error(`Invalid registry path: "${inputPath}" contains encoded path traversal`);
   }

   return normalized;
}

/**
 * Fetch one or more registry paths, with caching.
 *
 * **Note**: The default registry URL (http://localhost:5500/registry) uses HTTP
 * because it's intended for local development. In production, set the
 * CALY_REGISTRY_URL environment variable to an HTTPS endpoint.
 */
async function fetchRegistry(paths: string[]) {
   const REGISTRY_URL = process.env.CALY_REGISTRY_URL || 'http://localhost:5500/registry';
   const results = [];
   for (const path of paths) {
      // Validate path to prevent traversal attacks
      const safePath = validateRegistryPath(path);

      if (registryCache.has(safePath)) {
         results.push(await registryCache.get(safePath));
         continue;
      }
      const promise = fetch(`${REGISTRY_URL}/${safePath}`)
         .then(async (res) => {
            if (!res.ok) throw new Error(`Failed to fetch ${safePath}: ${res.status}`);
            return res.json();
         })
         .catch((err) => {
            registryCache.delete(safePath);
            throw err;
         });
      registryCache.set(safePath, promise);
      const resolvedPromise = await promise;
      results.push(resolvedPromise);
   }
   return results;
}

/**
 * Get the main registry index.
 */
async function getRegistryIndex() {
   const [result] = await fetchRegistry(['index.json']);
   return result;
}

/**
 * Get a registry item by name.
 * E.g., getRegistryItem('function-1')
 */
async function getRegistryItem(name: string) {
   // validateRegistryPath is called inside fetchRegistry
   const [result] = await fetchRegistry([`${name}.json`]);
   return result;
}

/**
 * Get a registry item content by path.
 *
 * **Note**: The default registry URL (http://localhost:5500/registry) uses HTTP
 * because it's intended for local development. In production, set the
 * CALY_REGISTRY_URL environment variable to an HTTPS endpoint.
 */
async function fetchRegistryFileContent(inputPath: string) {
   const REGISTRY_URL = process.env.CALY_REGISTRY_URL || 'http://localhost:5500/registry';
   // Validate path to prevent traversal attacks
   const normalized = validateRegistryPath(inputPath);
   const url = `${REGISTRY_URL}/${normalized}`;
   const res = await fetch(url);
   if (!res.ok) throw new Error(`Failed to fetch file content: ${inputPath} (${res.status})`);
   return await res.text();
}

/**
 * Clear the in-memory registry cache.
 */
function clearRegistryCache() {
   registryCache.clear();
}

export { getRegistryIndex, getRegistryItem, fetchRegistryFileContent, clearRegistryCache };
