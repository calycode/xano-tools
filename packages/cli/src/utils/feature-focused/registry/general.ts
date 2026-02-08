import { metaApiGet, metaApiPost } from '@repo/utils';
import { multiselect, isCancel } from '@clack/prompts';

const typePriority = {
   'registry:table': 1,
   'registry:addon': 2,
   'registry:function': 3,
   'registry:apigroup': 4,
   'registry:query': 5,
   'registry:middleware': 6,
   'registry:task': 7,
   'registry:tool': 8,
   'registry:mcp': 9,
   'registry:agent': 10,
   'registry:realtime': 11,
   'registry:workspace/trigger': 12,
   'registry:table/trigger': 13,
   'registry:mcp/trigger': 14,
   'registry:agent/trigger': 15,
   'registry:realtime/trigger': 16,
   'registry:test': 17,
};

function sortFilesByType(files) {
   return files.slice().sort((a, b) => {
      const bPriority = typePriority[b.type] || 99;
      const aPriority = typePriority[a.type] || 99;
      return aPriority - bPriority;
   });
}

async function promptForComponents(core, registryUrl) {
     try {
        const registry = await core.getRegistryIndex(registryUrl);

        const items = registry?.items ?? [];
        if (!items.length) {
           console.error('No components available in registry index.');
           return [];
        }

         const options = items.map((item) => ({
            value: item.name,
            label: item.description ? `${item.name} - ${item.description}` : item.name,
         }));

         const selected = await multiselect({
            message: 'Select components to add:',
            options,
            required: true,
         });

         if (isCancel(selected)) {
            return [];
         }

         return selected;
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
   return selectedGroup;
}

export { sortFilesByType, promptForComponents, getApiGroupByName };
