import { loadToken } from '../../../config/loaders';
import { getRegistryIndex, metaApiGet, metaApiPost } from '../../index';

// [ ] CLI, whole file

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

// [ ] Extract to core utilities
async function getApiGroupByName(
   groupName,
   { instanceConfig, workspaceConfig, branchConfig }: any
) {
   const foundGroup = await metaApiGet({
      baseUrl: instanceConfig.url,
      token: await loadToken(instanceConfig.name),
      path: `/workspace/${workspaceConfig.id}/apigroup`,
      query: {
         branch: branchConfig.label,
         per_page: 100,
         page: 1,
      },
   });

   let selectedGroup = foundGroup.items.find((group) => group.name === groupName);

   if (selectedGroup) {
      return selectedGroup;
   } else {
      selectedGroup = await metaApiPost({
         baseUrl: instanceConfig.url,
         token: await loadToken(instanceConfig.name),
         path: `/workspace/${workspaceConfig.id}/apigroup`,
         body: {
            name: groupName,
            branch: branchConfig.label,
            swagger: false,
            docs: '',
         },
      });
   }
}

export { sortFilesByType, promptForComponents, getApiGroupByName };
