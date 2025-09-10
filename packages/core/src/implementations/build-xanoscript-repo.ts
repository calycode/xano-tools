import { metaApiGet, sanitizeFileName } from '@calycode/utils';
import type { Caly } from '..';
import type { CoreContext } from '@calycode/types';

async function fetchAndProcessEntities({
   baseUrl,
   token,
   workspaceId,
   branchLabel,
   entity,
   apiGroupId,
}) {
   const path = apiGroupId
      ? `/workspace/${workspaceId}/apigroup/${apiGroupId}/${entity}`
      : `/workspace/${workspaceId}/${entity}`;

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
   const allItems = allItemsResponse.items ?? [];

   for (const item of allItems) {
      const { name, xanoscript } = item;
      const sanitizedName = sanitizeFileName(name);
      const path = entity === 'api' ? sanitizedName : `${entity}/${sanitizedName}`;
      const metaDataContent = item;
      delete metaDataContent.xanoscript;
      tempResults.push({
         path: `${path}/meta.json`,
         content: JSON.stringify(metaDataContent, null, 2),
      });

      const xanoScriptContent =
         xanoscript.value ??
         `
      ${entity} ${name} {
          "description" = "Xanoscript fetching failed with message: ${xanoscript.message}"
      }
      `;
      tempResults.push({ path: `${path}/script.freezed.xs`, content: xanoScriptContent });
   }

   return tempResults;
}

async function buildXanoscriptRepoImplementation({
   storage,
   core,
   options,
}: {
   storage: Caly['storage'];
   core: Caly;
   options: CoreContext;
}): Promise<{ path: string; content: string }[]> {
   const { instance, workspace, branch } = options;

   core.emit('start', { name: 'xs-repo-generation', payload: options });

   // [ ] THIS IS WHERE THE ROOT OF ALL EVIL IS
   const results: { path: string; content: string }[] = [];
   const startDir = storage.getStartDir();
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      branch,
      startDir,
   });

   const baseUrl = instanceConfig.url;
   const token = await storage.loadToken(instanceConfig.name);
   const workspaceId = workspaceConfig.id;
   const branchLabel = branchConfig.label;
   // Supported entities: functions, tables, api groups > apis
   // [ ] Add hidden pagination to make sure that all functions and queries are captured.
   for (const entity of ['function', 'table']) {
      core.emit('progress', {
         name: 'xs-repo-generation',
         payload: {
            entity,
         },
         percent: ((['function', 'table'].indexOf(entity) + 1) / 3) * 60,
      });
      const tempResults = await fetchAndProcessEntities({
         baseUrl,
         token,
         workspaceId,
         branchLabel,
         entity,
         apiGroupId: null,
      });
      results.push(...tempResults);
      core.emit('progress', {
         name: 'xs-repo-generation',
         payload: {
            entity,
         },
         percent: ((['function', 'table'].indexOf(entity) + 1) / 2) * 60,
      });
   }

   // Handle the APIs which include first fetching the availabel api groups and then looping through them.
   const apiGroupsResponse = await metaApiGet({
      baseUrl,
      token,
      path: `/workspace/${workspaceId}/apigroup`,
      query: {
         branch: branchLabel,
         page: 1,
         per_page: 500,
         sort: 'name',
         order: 'asc',
      },
   });
   const apiGroups = apiGroupsResponse.items ?? [];
   core.emit('progress', {
      name: 'xs-repo-generation',
      payload: {
         entity: 'api',
      },
      percent: 60,
   });
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

      core.emit('progress', {
         name: 'xs-repo-generation',
         payload: {
            entity: 'api',
         },
         percent: 60 + (apiGroups.indexOf(apiGroup) + 1) / apiGroups.length,
      });

      results.push(
         ...tempResults.map((item) => ({
            // ADd the apigroup name to the path for nice folder structure
            path: `${apiGroupPath}/${item.path}`,
            content: item.content,
         }))
      );
   }

   core.emit('end', {
      name: 'xs-repo-generation',
      payload: {
         count: results.length,
      },
   });

   return results;
}

export { buildXanoscriptRepoImplementation };

//
