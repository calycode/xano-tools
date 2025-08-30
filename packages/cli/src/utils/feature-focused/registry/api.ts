const registryCache = new Map();
const REGISTRY_URL = process.env.Caly_REGISTRY_URL || 'http://localhost:5500/registry-definitions';

// [ ] CLI, whole file
/**
 * Fetch one or more registry paths, with caching.
 */
async function fetchRegistry(paths) {
   const results = [];
   for (const path of paths) {
      if (registryCache.has(path)) {
         results.push(await registryCache.get(path));
         continue;
      }
      const promise = fetch(`${REGISTRY_URL}/${path}`).then(async (res) => {
         if (!res.ok) throw new Error(`Failed to fetch ${path}: ${res.status}`);
         return res.json();
      });
      registryCache.set(path, promise);
      results.push(await promise);
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
async function getRegistryItem(name) {
   // Remove leading slash if present
   const normalized = name.replace(/^\/+/, '');
   const [result] = await fetchRegistry([`${normalized}.json`]);
   return result;
}

/**
 * Get a registry item content by path.
 */
async function fetchRegistryFileContent(path) {
   // Remove leading slash if present
   const normalized = path.replace(/^\/+/, '');
   const url = `${REGISTRY_URL}/${normalized}`;
   const res = await fetch(url);
   if (!res.ok) throw new Error(`Failed to fetch file content: ${path} (${res.status})`);
   return await res.text();
}

/**
 * Clear the in-memory registry cache.
 */
function clearRegistryCache() {
   registryCache.clear();
}

export {
   fetchRegistry,
   getRegistryIndex,
   getRegistryItem,
   fetchRegistryFileContent,
   clearRegistryCache,
};
