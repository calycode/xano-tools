import { loadGlobalConfig, loadInstanceConfig } from '../../config/loaders.js';

/**
 * Safely loads the config for the current context.
 * Returns { instanceConfig, workspaceConfig, apigroupConfig }
 * If any level is not found, returns null for that level.
 */
export function getCurrentContextConfig(globalConfig = null, context = {}) {
   if (!globalConfig) globalConfig = loadGlobalConfig();

   context.instance = context.instance || globalConfig.currentContext?.instance || null;
   context.workspace = context.workspace || globalConfig.currentContext?.workspace || null;
   context.branch = context.branch || globalConfig.currentContext?.branch || null;
   context.apigroup = context.apigroup || globalConfig.currentContext?.apigroup || null;

   let { instance, workspace, branch, apigroup } = context;
   let instanceConfig = null,
      workspaceConfig = null,
      branchConfig = null,
      apigroupConfig = null;

   if (instance) {
      try {
         instanceConfig = loadInstanceConfig(instance);
      } catch {
         return {};
      }
   }

   if (instanceConfig && workspace) {
      workspaceConfig =
         (instanceConfig.workspaces || []).find(
            (ws) => ws.id == workspace || ws.name === workspace
         ) || null;
   }

   if (workspaceConfig && branch) {
      branchConfig = (workspaceConfig.branches || []).find((b) => b.label === branch) || null;
   }

   if (workspaceConfig && apigroup) {
      apigroupConfig =
         (workspaceConfig.apigroups || []).find((g) => g.id == apigroup || g.name === apigroup) ||
         null;
   }

   return { instanceConfig, workspaceConfig, branchConfig, apigroupConfig };
}
