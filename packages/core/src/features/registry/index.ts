import { metaApiGet, metaApiPost } from '@calycode/utils';

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

/**
 * Function that creates the required components in Xano.
 *
 * @param {*} file
 * @param {*} resolvedContext
 * @returns {Boolean} - success: true, failure: false
 */
async function installComponentToXano({file, resolvedContext, core}) {
   const { instanceConfig, workspaceConfig, branchConfig } = resolvedContext;
   const { target, path, content, type: fileType, 'api-group-name': apiGroupName } = file;

   const urlMapping = {
      'registry:function': `workspace/${workspaceConfig.id}/function?branch=${branchConfig.label}`,
      'registry:table': `workspace/${workspaceConfig.id}/table`,
   };

   // If query, extend the default urlMapping with the populated query creation API group.
   if (fileType === 'registry:query') {
      const targetApiGroup = await getApiGroupByName(
         apiGroupName,
         {
            instanceConfig,
            workspaceConfig,
            branchConfig,
         },
         core
      );

      urlMapping[
         'registry:query'
      ] = `workspace/${workspaceConfig.id}/apigroup/${targetApiGroup.id}/api?branch=${branchConfig.label}`;
   }

   const xanoToken = await core.loadToken(instanceConfig.name);
   const xanoApiUrl = `${instanceConfig.url}/api:meta`;

   try {
      // [ ] TODO: implement override checking. For now just try the POST and Xano will throw error anyways...

      const response = await fetch(`${xanoApiUrl}/${urlMapping[file.type]}`, {
         method: 'POST',
         headers: {
            Authorization: `Bearer ${xanoToken}`,
            'Content-Type': 'text/x-xanoscript',
         },
         body: content,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return true;
   } catch (error) {
      console.error(`Failed to install ${target || path}:`, error);
      return false;
   }
}

export { installComponentToXano };
