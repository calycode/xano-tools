import { getRegistryIndex } from '../../index';

const typePriority = {
   'registry:table': 1,
   'registry:function': 2,
   'registry:query': 3,
   // All other types get a default (lower) priority
};

function sortFilesByType(files) {
   return files.slice().sort((a, b) => {
      const aPriority = typePriority[a.type] || 99;
      const bPriority = typePriority[b.type] || 99;
      return aPriority - bPriority;
   });
}

async function promptForComponents() {
   try {
      const registry = await getRegistryIndex();
      console.log('Available components:');
      registry.items.forEach((item, index) => {
         console.log(`${index + 1}. ${item.name} - ${item.description}`);
      });
      // For now, just select the first one or use a prompt library for real selection
      return ['function-1'];
   } catch (error) {
      console.error('Failed to fetch available components:', error);
      return [];
   }
}

export { sortFilesByType, promptForComponents };
