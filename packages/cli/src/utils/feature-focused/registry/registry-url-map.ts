import { RegistryItemType, InstallUrlParams, UrlMappingFn } from '@repo/types';

const registryUrlMapping: Record<RegistryItemType, UrlMappingFn> = {
   'registry:table': ({ workspaceConfig }) => `workspace/${workspaceConfig.id}/table`,
   'registry:function': ({ workspaceConfig, branchConfig }) =>
      `workspace/${workspaceConfig.id}/function?branch=${branchConfig.label}`,
   'registry:apigroup': ({ workspaceConfig, branchConfig }) =>
      `workspace/${workspaceConfig.id}/apigroup?branch=${branchConfig.label}`,
   'registry:query': ({ workspaceConfig, branchConfig, apiGroupId }) => {
      if (!apiGroupId) throw new Error('apiGroupId is required for registry:query');
      return `workspace/${workspaceConfig.id}/apigroup/${apiGroupId}/api?branch=${branchConfig.label}`;
   },
   'registry:addon': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/addon?branch=${branchConfig.label}`,
   'registry:middleware': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/middleware?branch=${branchConfig.label}`,
   'registry:task': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/task?branch=${branchConfig.label}`,
   'registry:tool': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/tool?branch=${branchConfig.label}`,
   'registry:mcp': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/mcp_server?branch=${branchConfig.label}`,
   'registry:agent': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/agent?branch=${branchConfig.label}`,
   'registry:realtime': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/realtime/channel?branch=${branchConfig.label}`,
   'registry:workspace/trigger': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/trigger?branch=${branchConfig.label}`,
   'registry:table/trigger': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/table/trigger?branch=${branchConfig.label}`,
   'registry:mcp/trigger': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/mcp_server/trigger?branch=${branchConfig.label}`,
   'registry:agent/trigger': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/agent/trigger?branch=${branchConfig.label}`,
   'registry:realtime/trigger': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/realtime/channel/trigger?branch=${branchConfig.label}`,
   'registry:test': ({ workspaceConfig, branchConfig }) =>
      `/workspace/${workspaceConfig.id}/workflow_test?branch=${branchConfig.label}`,
};

// Helper to get the endpoint for a file type
export function resolveInstallUrl(fileType: RegistryItemType, params: InstallUrlParams): string {
   const mappingFn = registryUrlMapping[fileType];
   if (!mappingFn) throw new Error(`No URL mapping for type: ${fileType}`);
   return mappingFn(params);
}
