import { metaApiGet, sanitizeFileName } from '@mihalytoth20/xcc-utils';
import type { XCC } from '..';
import type { CoreContext } from '@mihalytoth20/xcc-types';

async function fetchAndProcessEntities({
   baseUrl,
   token,
   workspaceId,
   branchLabel,
   entity,
   apiGroupId,
}) {
   const path = [
      '/workspace',
      workspaceId,
      apiGroupId ? `/api-group/${apiGroupId}` : '',
      entity,
   ].join('/');

   const tempResults: { path: string; content: string }[] = [];

   const allItemsResponse = await metaApiGet({
      baseUrl,
      token,
      path: path,
      query: {
         branch: branchLabel,
         page: 1,
         per_page: 500,
         sort: 'name',
         order: 'asc',
      },
   });
   const allItems = allItemsResponse.data.items ?? [];

   for (const item of allItems) {
      const { name, xanoscript } = item;
      const sanitizedName = sanitizeFileName(name);
      const path = entity === 'api' ? sanitizedName : `${entity}/${sanitizedName}`;
      const metaDataContent = item;
      delete metaDataContent.xanoscript;
      tempResults.push({
         path: `${path}.json`,
         content: JSON.stringify(metaDataContent),
      });

      const xanoScriptContent =
         xanoscript.value ??
         `
      ${entity} ${name} {
          "description" = "Xanoscript fetching failed with message: ${xanoscript.message}"
      }
      `;
      tempResults.push({ path: `${path}.xs`, content: xanoScriptContent });
   }

   return tempResults;
}

async function buildXanoscriptRepoImplementation(
   storage: XCC['storage'],
   core: XCC,
   options: CoreContext
): Promise<{ path: string; content: string }[]> {
   const { instance, workspace, branch } = options;

   core.emit('start', { name: 'start-xs-repo-generation', payload: options });

   const results: { path: string; content: string }[] = [];

   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      branch,
   });

   const baseUrl = instanceConfig.url;
   const token = await core.loadToken(instanceConfig.name);
   const workspaceId = workspaceConfig.id;
   const branchLabel = branchConfig.label;
   // Supported entities: functions, tables, api groups > apis
   // [ ] Add hidden pagination to make sure that all functions and queries are captured.
   for (const entity of ['functions', 'tables']) {
      const tempResults = await fetchAndProcessEntities({
         baseUrl,
         token,
         workspaceId,
         branchLabel,
         entity,
         apiGroupId: null,
      });
      results.push(...tempResults);
   }

   // Handle the APIs which include first fetching the availabel api groups and then looping through them.
   const apiGroupsResponse = await metaApiGet({
      baseUrl,
      token,
      path: `/workspace/${workspaceId}/api-group`,
      query: {
         branch: branchLabel,
         page: 1,
         per_page: 500,
         sort: 'name',
         order: 'asc',
      },
   });
   const apiGroups = apiGroupsResponse.data.items ?? [];
   for (const apiGroup of apiGroups) {
      const apiGroupPath = sanitizeFileName(apiGroup.name);
      const tempResults = await fetchAndProcessEntities({
         baseUrl,
         token,
         workspaceId,
         branchLabel,
         entity: 'api',
         apiGroupId: apiGroup.id,
      });

      results.push(
         ...tempResults.map((item) => ({
            // ADd the apigroup name to the path for nice folder structure
            path: `${apiGroupPath}/${item.path}`,
            content: item.content,
         }))
      );
   }

   return results;
}

export { buildXanoscriptRepoImplementation };

//
