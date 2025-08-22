import { loadGlobalConfig, loadInstanceConfig } from '../../../cli/config/loaders';
import {
   Context,
   InstanceConfig,
   WorkspaceConfig,
   BranchConfig,
   ApiGroupConfig,
   CurrentContextConfig,
} from '../../../types';

// [ ] CORE, needs fs
/**
 * Safely loads the config for the current context.
 * Returns { instanceConfig, workspaceConfig, branchConfig, apigroupConfig }
 * If any level is not found, returns null for that level.
 */
export function getCurrentContextConfig(
   globalConfig?: any,
   context: Context = {}
): CurrentContextConfig {
   if (!globalConfig) globalConfig = loadGlobalConfig();

   const resolvedContext: Context = {
      instance: context.instance ?? globalConfig.currentContext?.instance ?? null,
      workspace: context.workspace ?? globalConfig.currentContext?.workspace ?? null,
      branch: context.branch ?? globalConfig.currentContext?.branch ?? null,
      apigroup: context.apigroup ?? globalConfig.currentContext?.apigroup ?? null,
   };

   const { instance, workspace, branch, apigroup } = resolvedContext;

   let instanceConfig: InstanceConfig | null = null;
   let workspaceConfig: WorkspaceConfig | null = null;
   let branchConfig: BranchConfig | null = null;
   let apigroupConfig: ApiGroupConfig | null = null;

   if (!instance) {
      return {
         instanceConfig: null,
         workspaceConfig: null,
         branchConfig: null,
         apigroupConfig: null,
      };
   }

   try {
      instanceConfig = loadInstanceConfig(instance);
   } catch {
      return {
         instanceConfig: null,
         workspaceConfig: null,
         branchConfig: null,
         apigroupConfig: null,
      };
   }

   if (instanceConfig && workspace) {
      workspaceConfig =
         (instanceConfig.workspaces ?? []).find(
            (ws) => String(ws.id) === String(workspace) || ws.name === workspace
         ) ?? null;
   }

   if (workspaceConfig && branch) {
      branchConfig = (workspaceConfig.branches ?? []).find((b) => b.label === branch) ?? null;
   }

   if (workspaceConfig && apigroup) {
      apigroupConfig =
         (workspaceConfig.apigroups ?? []).find(
            (g) => String(g.id) === String(apigroup) || g.name === apigroup
         ) ?? null;
   }

   return { instanceConfig, workspaceConfig, branchConfig, apigroupConfig };
}
