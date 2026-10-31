import { metaApiGet, sanitizeFileName } from '@repo/utils';
import type { Caly } from '..';
import type { CoreContext } from '@repo/types';
import { fetchAllPages, mapConcurrent } from '../utils/methods/fetch-plan';

const SUPPORTED_ENTITIES = [
   'addon',
   'agent',
   'agent/trigger',
   'apigroup',
   'function',
   'mcp_server',
   'mcp_server/trigger',
   'middleware',
   'realtime/channel',
   'realtime/channel/trigger',
   'table',
   'table/trigger',
   'task',
   'tool',
   'trigger',
   'workflow_test',
];

/** Independent entity fetches in flight at once. */
const FETCH_CONCURRENCY = 4;

/** Page size for metadata list endpoints. */
const PER_PAGE = 500;

async function fetchMetadataPage({ baseUrl, token, path, label, branchLabel, page }) {
   const response = await metaApiGet({
      baseUrl,
      token,
      path,
      query: {
         branch: branchLabel,
         include_xanoscript: true,
         page,
         per_page: PER_PAGE,
         sort: 'name',
         order: 'asc',
      },
   });

   if (!response || typeof response !== 'object' || !Array.isArray(response.items)) {
      throw new Error(
         `Invalid metadata response for ${label ?? path} (page ${page}): expected an object with an items array`
      );
   }

   return {
      items: response.items,
      total: response.total,
      next: response.next,
   };
}

async function fetchAndProcessEntities({
   baseUrl,
   token,
   workspaceId,
   branchLabel,
   entity,
   apiGroupId,
}) {
   const label = apiGroupId ? `apigroup/${apiGroupId}/${entity}` : entity;
   const path = apiGroupId
      ? `/workspace/${workspaceId}/apigroup/${apiGroupId}/${entity}`
      : `/workspace/${workspaceId}/${entity}`;

   const tempResults: { path: string; content: string }[] = [];

   const allItems = await fetchAllPages<any>({
      label,
      perPage: PER_PAGE,
      fetchPage: ({ page }) =>
         fetchMetadataPage({ baseUrl, token, path, label, branchLabel, page }),
   });

   for (const item of allItems) {
      const { name, xanoscript } = item;
      const sanitizedName = sanitizeFileName(name);
      const path =
         entity === 'api'
            ? `${sanitizedName}/${item.verb.toUpperCase()}`
            : entity === 'table'
            ? `table/${sanitizedName}`
            : entity === 'apigroup'
            ? `app/${sanitizedName}`
            : `${entity}/${sanitizedName}`;
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

   // Supported entities: functions, tables, api groups > apis.
   // Results stay grouped in SUPPORTED_ENTITIES order; only the fetches overlap.
   // In-flight mappers keep running after mapConcurrent rejects, so a shared
   // flag stops them from emitting progress for a run that already failed.
   let failed = false;
   let completedEntities = 0;
   const entityResults = await mapConcurrent(
      SUPPORTED_ENTITIES,
      async (entity) => {
         try {
            const tempResults = await fetchAndProcessEntities({
               baseUrl,
               token,
               workspaceId,
               branchLabel,
               entity,
               apiGroupId: null,
            });
            completedEntities++;
            if (!failed) {
               core.emit('progress', {
                  name: 'xs-repo-generation',
                  payload: {
                     entity,
                  },
                  percent: (completedEntities / SUPPORTED_ENTITIES.length) * 60,
               });
            }
            return tempResults;
         } catch (error) {
            failed = true;
            throw error;
         }
      },
      { concurrency: FETCH_CONCURRENCY }
   );
   results.push(...entityResults.flat());

   // Handle the APIs which include first fetching the available api groups and then looping through them.
   const apiGroups = await fetchAllPages<any>({
      label: 'apigroup',
      perPage: PER_PAGE,
      fetchPage: ({ page }) =>
         fetchMetadataPage({
            baseUrl,
            token,
            path: `/workspace/${workspaceId}/apigroup`,
            label: 'apigroup',
            branchLabel,
            page,
         }),
   });
   core.emit('progress', {
      name: 'xs-repo-generation',
      payload: {
         entity: 'api',
      },
      percent: 60,
   });

   let completedGroups = 0;
   const apiResults = await mapConcurrent(
      apiGroups,
      async (apiGroup) => {
         try {
            const apiGroupPath = sanitizeFileName(apiGroup.name);
            const tempResults = await fetchAndProcessEntities({
               baseUrl,
               token,
               workspaceId,
               branchLabel,
               entity: 'api',
               apiGroupId: apiGroup.id,
            });

            completedGroups++;
            if (!failed) {
               core.emit('progress', {
                  name: 'xs-repo-generation',
                  payload: {
                     entity: 'api',
                  },
                  percent: 60 + (completedGroups / apiGroups.length) * 40,
               });
            }

            return tempResults.map((item) => ({
               // Add the apigroup name to the path for nice folder structure
               path: `app/${apiGroupPath}/${item.path}`,
               content: item.content,
            }));
         } catch (error) {
            failed = true;
            throw error;
         }
      },
      { concurrency: FETCH_CONCURRENCY }
   );
   results.push(...apiResults.flat());

   core.emit('end', {
      name: 'xs-repo-generation',
      payload: {
         count: results.length,
      },
   });

   return results;
}

export { buildXanoscriptRepoImplementation };
