import { BranchConfig, InstanceConfig, WorkspaceConfig } from '@repo/types';
import type { Caly } from '../..';
import { sortFilesByType } from './general';

interface InstallParams {
    instanceConfig: InstanceConfig | null;
    workspaceConfig: WorkspaceConfig;
    branchConfig: BranchConfig;
    apiGroupId?: string | number;
    file?: any;
}

type UrlResolver = (params: InstallParams) => string;

const REGISTRY_MAP: Record<string, string | UrlResolver> = {
   // Simple static-like paths
   'registry:function': (p) => `function`,
   'registry:table': (p) => `table`,
   'registry:addon': (p) => `addon`,
   'registry:apigroup': (p) => `apigroup`,
   'registry:middleware': (p) => `middleware`,
   'registry:task': (p) => `task`,
   'registry:tool': (p) => `tool`,
   'registry:mcp': (p) => `mcp`,
   'registry:agent': (p) => `agent`,
   'registry:realtime': (p) => `realtime`,
   'registry:test': (p) => `test`,
   'registry:workspace/trigger': (p) => `trigger`,

   // Complex/Nested paths
   'registry:query': (p) => `apigroup/${p.apiGroupId}/query`,
   'registry:table/trigger': (p) => `table/${p.file?.tableId}/trigger`,
   'registry:mcp/trigger': (p) => `mcp/${p.file?.mcpId}/trigger`,
   'registry:agent/trigger': (p) => `agent/${p.file?.agentId}/trigger`,
   'registry:realtime/trigger': (p) => `realtime/${p.file?.realtimeId}/trigger`,
};

function resolveInstallUrl(type: string, params: InstallParams) {
   const { workspaceConfig, branchConfig } = params;

   const resolver = REGISTRY_MAP[type];

   if (!resolver) {
      throw new Error(`Unknown registry type: ${type}`);
   }

   const pathSegment = typeof resolver === 'function' ? resolver(params) : resolver;

   const baseUrl = `/workspace/${workspaceConfig.id}/${pathSegment}`;
   const queryParams = `?branch=${encodeURIComponent(branchConfig.label)}&include_xanoscript=true`;

   const finalUrl = `${baseUrl}${queryParams}`;

   return finalUrl;
}

async function installRegistryItemToXano(
   item: any,
   resolvedContext: { instanceConfig: any; workspaceConfig: any; branchConfig: any },
   registryUrl: string,
   core: Caly,
) {
    const { instanceConfig, workspaceConfig, branchConfig } = resolvedContext;
    const results = { installed: [], failed: [], skipped: [] };

     // Sort files
     let filesToInstall = sortFilesByType(item.files || []);

     // Handle content-only registry items
     if (filesToInstall.length === 0 && item.content) {
        filesToInstall = [{ path: item.name || 'inline', content: item.content, type: item.type }];
     }

     // Load token once
     const xanoToken = await core.loadToken(instanceConfig.name);

     for (const file of filesToInstall) {
       try {
          // Get content: use inline content if present, else fetch from file path
          let content;
          if (file.content) {
             content = file.content;
          } else {
             const normalized = file.path.replace(/^\/+/, '');
             const url = `${registryUrl}/${normalized}`;
             const res = await fetch(url);
             if (!res.ok)
                throw new Error(`Failed to fetch file content: ${file.path} (${res.status})`);
             content = await res.text();
          }

         // Determine install URL
         let apiGroupId;
         if (file.type === 'registry:query') {
            // For queries, apiGroupId is required, but since it's not provided, skip or error
            // In CLI, it's resolved via getApiGroupByName
            // For core, perhaps require it in the item or context
            // For now, throw error if not provided
            if (!file.apiGroupId) {
               throw new Error('apiGroupId required for query installation');
            }
            apiGroupId = file.apiGroupId;
         }

          // Post to Xano
          const xanoApiUrl = `${instanceConfig.url}/api:meta`;
          const installUrl = resolveInstallUrl(file.type, {
             instanceConfig,
             workspaceConfig,
             branchConfig,
             file,
             apiGroupId,
          });

          const response = await fetch(`${xanoApiUrl}${installUrl}`, {
            method: 'POST',
            headers: {
               Authorization: `Bearer ${xanoToken}`,
               'Content-Type': 'text/x-xanoscript',
            },
            body: content,
         });

          if (response.ok) {
             const body = await response.json();
             results.installed.push({ file: file.path || '<inline>', response: body });
          } else {
             results.failed.push({ file: file.path || '<inline>', error: `HTTP ${response.status}` });
          }
       } catch (error) {
          results.failed.push({ file: file.path || '<inline>', error: error.message });
       }
   }

   return results;
}

export { installRegistryItemToXano };
