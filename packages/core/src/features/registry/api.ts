const registryCache = new Map();

/**
 * Fetch one or more registry paths, with caching.
 */
async function fetchRegistry(paths, registryUrl) {
   const results = [];
   for (const path of paths) {
      const cacheKey = `${registryUrl}/${path}`;
      if (registryCache.has(cacheKey)) {
         results.push(await registryCache.get(cacheKey));
         continue;
      }
      const promise = fetch(`${registryUrl}/${path}`)
         .then(async (res) => {
            if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
            return res.json();
         })
         .catch((err) => {
            registryCache.delete(cacheKey);
            throw err;
         });
      registryCache.set(cacheKey, promise);
      const resolvedPromise = await promise;
      results.push(resolvedPromise);
   }
   return results;
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
   // Remove leading slash if present
   const normalized = name.replace(/^\/+/, '');
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
   // Remove leading slash if present
   const normalized = filePath.replace(/^\/+/, '');
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