const registryCache = new Map();
const REGISTRY_URL = process.env.REGISTRY_URL || 'http://localhost:3000/registry';

export async function fetchRegistry(paths) {
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

export async function getRegistryIndex() {
   const [result] = await fetchRegistry(['index.json']);
   return result;
}

export async function getRegistryItem(name) {
   const [result] = await fetchRegistry([`${name}.json`]);
   return result;
}

export function clearRegistryCache() {
   registryCache.clear();
}
