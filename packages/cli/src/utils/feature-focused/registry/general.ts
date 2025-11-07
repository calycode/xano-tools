import { metaApiGet, metaApiPost } from '@repo/utils';
import { getRegistryIndex } from '../../index';

const typePriority = {
   'registry:table': 0,
   'registry:addon': 1,
   'registry:function': 2,
   'registry:apigroup': 3,
   'registry:query': 4,
   'registry:middleware': 5,
   'registry:task': 6,
   'registry:tool': 7,
   'registry:mcp': 8,
   'registry:agent': 9,
   'registry:realtime': 10,
   'registry:workspace/trigger': 11,
   'registry:table/trigger': 12,
   'registry:mcp/trigger': 13,
   'registry:agent/trigger': 14,
   'registry:realtime/trigger': 15,
   'registry:test': 16,
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
   { instanceConfig, workspaceConfig, branchConfig }: any,
   core
) {
   const foundGroup = await metaApiGet({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
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
         token: await core.loadToken(instanceConfig.name),
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
