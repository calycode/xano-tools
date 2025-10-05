import {
   Context,
   InstanceConfig,
   WorkspaceConfig,
   BranchConfig,
   ApiGroupConfig,
   CurrentContextConfig,
   ConfigStorage,
   CoreContext,
} from '@repo/types';

/**
 * Loads and merges the current context config from the directory tree.
 * Returns { instanceConfig, workspaceConfig, branchConfig, apigroupConfig }
 */
async function getCurrentContextConfigImplementation({
   storage,
   context = {},
   startDir,
}: {
   storage: ConfigStorage;
   context?: Context;
   startDir: string;
}): Promise<CurrentContextConfig> {
   let {
      workspaceConfig,
      branchConfig,
      instanceConfig,
      foundLevels,
   }: {
      mergedConfig: InstanceConfig;
      workspaceConfig?: WorkspaceConfig;
      branchConfig?: BranchConfig;
      instanceConfig?: InstanceConfig;
      foundLevels: CoreContext;
   } = storage.loadMergedConfig(startDir);

   // Extract context from config & override with explicit context
   const workspace = context.workspace ?? foundLevels.workspace ?? null;
   const branch = context.branch ?? foundLevels.branch ?? null;
   const apigroup = context.apigroup ?? null;

   // "instanceConfig" is always the fully merged config
   // Optionally, you can also extract the raw configs at each level if needed

   let apigroupConfig: ApiGroupConfig | null = null;

   // If your config contains workspaces/branches as arrays, extract the matching config objects
   if (!workspaceConfig) {
      workspaceConfig =
         (instanceConfig.workspaces as any[]).find(
            (ws) => String(ws.id) === String(workspace) || ws.name === workspace
         ) ?? null;
   }
   if (!branchConfig) {
      branchConfig = (workspaceConfig.branches ?? []).find((b) => b.label === branch) ?? null;
   }

   // If you have apigroups as well, extract here
   if (workspaceConfig && apigroup) {
      apigroupConfig =
         (workspaceConfig.apigroups ?? []).find(
            (g) => String(g.id) === String(apigroup) || g.name === apigroup
         ) ?? null;
   }

   return {
      instanceConfig: instanceConfig,
      workspaceConfig,
      branchConfig,
      apigroupConfig,
   };
}

export { getCurrentContextConfigImplementation };
