import {
   Context,
   InstanceConfig,
   WorkspaceConfig,
   BranchConfig,
   ApiGroupConfig,
   CurrentContextConfig,
   ConfigStorage,
} from '@repo/types';

/**
 * Find a workspace by id or name. This is the single place workspace references
 * are resolved, shared by core and the CLI.
 */
function findWorkspaceConfig(
   instanceConfig: InstanceConfig | undefined,
   workspace: unknown,
): WorkspaceConfig | null {
   if (!instanceConfig?.workspaces || workspace == null) {
      return null;
   }
   return (
      (instanceConfig.workspaces as any[]).find(
         (ws) => String(ws.id) === String(workspace) || ws.name === workspace,
      ) ?? null
   );
}

/** Find a branch by label or id. */
function findBranchConfig(
   workspaceConfig: WorkspaceConfig | null,
   branch: unknown,
): BranchConfig | null {
   if (!workspaceConfig?.branches) {
      return null;
   }
   return (
      workspaceConfig.branches.find(
         (b) => b.label === branch || String((b as any).id) === String(branch),
      ) ?? null
   );
}

/** Find an API group by id or name. */
function findApiGroupConfig(
   workspaceConfig: WorkspaceConfig | null,
   apigroup: unknown,
): ApiGroupConfig | null {
   if (!workspaceConfig?.apigroups || apigroup == null) {
      return null;
   }
   return (
      (workspaceConfig.apigroups as any[]).find(
         (g) => String(g.id) === String(apigroup) || g.name === apigroup,
      ) ?? null
   );
}

/**
 * Loads and merges the current context config from the directory tree.
 * Explicit `context` overrides win over levels found in the tree. Returns
 * { instanceConfig, workspaceConfig, branchConfig, apigroupConfig }.
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
   const { instanceConfig, foundLevels } = storage.loadMergedConfig(startDir);

   const workspace = context.workspace ?? foundLevels.workspace ?? null;
   const branch = context.branch ?? foundLevels.branch ?? null;
   const apigroup = context.apigroup ?? null;

   const workspaceConfig = findWorkspaceConfig(instanceConfig, workspace);
   // Fall back to the first branch when only a workspace is known (e.g. backups,
   // which require instance + workspace but not branch).
   const branchConfig =
      findBranchConfig(workspaceConfig, branch) ?? workspaceConfig?.branches?.[0] ?? null;
   const apigroupConfig = findApiGroupConfig(workspaceConfig, apigroup);

   return {
      instanceConfig: instanceConfig ?? null,
      workspaceConfig,
      branchConfig,
      apigroupConfig,
   };
}

export { getCurrentContextConfigImplementation };
