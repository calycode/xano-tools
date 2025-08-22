// core/config.ts
import { ConfigStorage, InstanceConfig, WorkspaceConfig, BranchConfig, Context } from '../types';
import { getCurrentContextConfig } from '../utils';

export async function loadAndValidateContext(
   storage: ConfigStorage,
   overrides: Partial<Context>
): Promise<{
   instanceConfig: InstanceConfig;
   workspaceConfig: WorkspaceConfig;
   branchConfig: BranchConfig;
   globalConfig: any;
}> {
   const globalConfig = await storage.loadGlobalConfig();
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
