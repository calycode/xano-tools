import { loadGlobalConfig } from '../../config/loaders';
import { getCurrentContextConfig } from '../index';
import { Context, InstanceConfig, WorkspaceConfig, BranchConfig } from '../../../types';

// [ ] CORE, needs fs
/**
 * Loads and validates the context needed for OpenAPI spec update.
 * @param {object} overrides - Optional instance/workspace/branch/group overrides from CLI.
 * @returns {object} - { instanceConfig, workspaceConfig, branchConfig, globalConfig }
 * @throws {Error} - If any required context is missing.
 */
function loadAndValidateContext(overrides: Partial<Context>): {
   instanceConfig: InstanceConfig;
   workspaceConfig: WorkspaceConfig;
   branchConfig: BranchConfig;
   globalConfig: any;
} {
   const globalConfig = loadGlobalConfig();
   const context = { ...globalConfig.currentContext, ...overrides };
   const { instanceConfig, workspaceConfig, branchConfig } = getCurrentContextConfig(
      globalConfig,
      context
   );
   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      throw new Error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
   }
   return { instanceConfig, workspaceConfig, branchConfig, globalConfig };
}

export { loadAndValidateContext };
