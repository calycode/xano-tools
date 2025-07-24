import { loadGlobalConfig, loadInstanceConfig } from '../../config/loaders.js';

/**
 * Safely loads the config for the current context.
 * Returns { instanceConfig, workspaceConfig, apigroupConfig }
 * If any level is not found, returns null for that level.
 */
export function getCurrentContextConfig(globalConfig, { instance, workspace, apigroup } = {}) {
   let instanceConfig = null;
   let workspaceConfig = null;
   let apigroupConfig = null;

   if (!instance) {
      globalConfig = loadGlobalConfig();
   }

   instance = globalConfig.currentContext.instance ?? null;
   workspace = globalConfig.currentContext.workspace ?? null;
   apigroup = globalConfig.currentContext.apigroup ?? null;

   if (instance) {
      try {
         instanceConfig = loadInstanceConfig(instance);
      } catch (e) {
         // Could log here: `console.warn('Instance not found:', instance)`
         return { instanceConfig: null, workspaceConfig: null, apigroupConfig: null };
      }
   }

   if (instanceConfig && workspace) {
      workspaceConfig =
         (instanceConfig.workspaces || []).find(
            (ws) => ws.id == workspace || ws.name === workspace
         ) || null;
   }

   if (workspaceConfig && apigroup) {
      apigroupConfig =
         (workspaceConfig.apigroups || []).find((g) => g.id == apigroup || g.name === apigroup) ||
         null;
   }

   return { instanceConfig, workspaceConfig, apigroupConfig };
}
