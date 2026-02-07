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
 */
async function fetchRegistry(paths, registryUrl) {
    const promises = paths.map(async (path) => {
       const safePath = validateRegistryPath(path);
       const cacheKey = `${registryUrl}/${safePath}`;
       if (registryCache.has(cacheKey)) {
          return await registryCache.get(cacheKey);
       }
       const promise = fetch(`${registryUrl}/${safePath}`)
          .then(async (res) => {
             if (!res.ok) throw new Error(`Failed to fetch ${safePath}: ${res.status}`);
             return res.json();
          })
          .catch((err) => {
             registryCache.delete(cacheKey);
             throw err;
          });
       registryCache.set(cacheKey, promise);
       return await promise;
    });
    return await Promise.all(promises);
}

/**
 * Get the main registry index.
 */
async function getRegistryIndex(registryUrl) {
   const [result] = await fetchRegistry(['index.json'], registryUrl);
   return result;
}

/**
 * Get a registry item by name.
 * E.g., getRegistryItem('function-1')
 */
async function getRegistryItem(name, registryUrl) {
   const normalized = validateRegistryPath(name);
   const [result] = await fetchRegistry([`${normalized}.json`], registryUrl);
   return result;
}

/**
 * Get registry item content, prioritizing inline content over file paths.
 */
async function fetchRegistryFileContent(item, filePath, registryUrl) {
   if (item.content) {
      return item.content;
   }
   const normalized = validateRegistryPath(filePath);
   const url = `${registryUrl}/${normalized}`;
   const res = await fetch(url);
   if (!res.ok) throw new Error(`Failed to fetch file content: ${filePath} (${res.status})`);
   return await res.text();
}

/**
 * Clear the in-memory registry cache.
 */
function clearRegistryCache() {
   registryCache.clear();
}

export { getRegistryIndex, getRegistryItem, fetchRegistryFileContent, clearRegistryCache };