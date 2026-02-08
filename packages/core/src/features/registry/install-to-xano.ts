import { BranchConfig, InstanceConfig, InstallResults, WorkspaceConfig } from '@repo/types';
import type { Caly } from '../..';
import { sortFilesByType } from './general';
import { fetchRegistryFileContent } from './api';

interface InstallParams {
   instanceConfig: InstanceConfig;
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
   'registry:mcp': (p) => `mcp_server`,
   'registry:agent': (p) => `agent`,
   'registry:realtime': (p) => `realtime/channel`,
   'registry:test': (p) => `workflow_test`,
   'registry:workspace/trigger': (p) => `trigger`,

   // Complex/Nested paths
   'registry:query': (p) => `apigroup/${p.apiGroupId}/api`,
   'registry:table/trigger': (p) => {
      if (!p.file?.tableId) {
         throw new Error('tableId required for table trigger installation');
      }
      return `table/${p.file.tableId}/trigger`;
   },
   'registry:mcp/trigger': (p) => {
      if (!p.file?.mcpId) {
         throw new Error('mcpId required for MCP trigger installation');
      }
      return `mcp_server/${p.file.mcpId}/trigger`;
   },
   'registry:agent/trigger': (p) => {
      if (!p.file?.agentId) {
         throw new Error('agentId required for agent trigger installation');
      }
      return `agent/${p.file.agentId}/trigger`;
   },
   'registry:realtime/trigger': (p) => {
      if (!p.file?.realtimeId) {
         throw new Error('realtimeId required for realtime trigger installation');
      }
      return `realtime/channel/${p.file.realtimeId}/trigger`;
   },
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
   resolvedContext: {
      instanceConfig: InstanceConfig;
      workspaceConfig: WorkspaceConfig;
      branchConfig: BranchConfig;
   },
   registryUrl: string,
   core: Caly,
) {
   const { instanceConfig, workspaceConfig, branchConfig } = resolvedContext;

   if (!instanceConfig) {
      throw new Error('instanceConfig is required for registry installation');
   }

   const results: InstallResults = {
      installed: [],
      failed: [],
      skipped: [],
   };

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
         if (file.content != null) {
            content = file.content;
         } else if (!file.path) {
            throw new Error(`File entry has neither content nor path: ${JSON.stringify(file)}`);
         } else {
            // Use the safe fetchRegistryFileContent function from api.ts
            content = await fetchRegistryFileContent(file, file.path, registryUrl);
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
            results.installed.push({
               component: item.name,
               file: file.path || '<inline>',
               response: body,
            });
         } else {
            // Try to parse the error response to detect "already exists" / duplicate cases
            let errorMessage = `HTTP ${response.status}`;
            let isSkipped = false;
            try {
               const errorBody = await response.json();
               if (errorBody?.message) {
                  errorMessage = errorBody.message;
               }
               // Detect known "already exists" / duplicate patterns from Xano
               const msg = (errorBody?.message || '').toLowerCase();
               if (
                  msg.includes('already exists') ||
                  msg.includes('duplicate') ||
                  msg.includes('conflict') ||
                  response.status === 409
               ) {
                  isSkipped = true;
               }
            } catch {
               // Response was not JSON, use status code only
               if (response.status === 409) {
                  isSkipped = true;
               }
            }

            if (isSkipped) {
               results.skipped.push({
                  component: item.name,
                  file: file.path || '<inline>',
                  error: errorMessage,
               });
            } else {
               results.failed.push({
                  component: item.name,
                  file: file.path || '<inline>',
                  error: errorMessage,
               });
            }
         }
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         results.failed.push({
            component: item.name,
            file: file.path || '<inline>',
            error: message,
         });
      }
   }

   return results;
}

export { installRegistryItemToXano };
