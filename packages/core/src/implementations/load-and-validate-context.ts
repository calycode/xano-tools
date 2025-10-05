// core/config.ts
import {
   ConfigStorage,
   InstanceConfig,
   WorkspaceConfig,
   BranchConfig,
   Context,
} from '@repo/types';
import { getCurrentContextConfigImplementation } from './get-current-context';

export async function loadAndValidateContextImplementation({
   storage,
   overrides,
   startDir,
}: {
   storage: ConfigStorage;
   overrides: Partial<Context>;
   startDir: string;
}): Promise<{
   instanceConfig: InstanceConfig;
   workspaceConfig: WorkspaceConfig;
   branchConfig: BranchConfig;
}> {
   //const globalConfig = await storage.loadGlobalConfig();
   //const context = assignDefined(globalConfig.currentContext, overrides);
   const { instanceConfig, workspaceConfig, branchConfig } =
      await getCurrentContextConfigImplementation({ storage, startDir, context: overrides });
   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      throw new Error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
   }
   return { instanceConfig, workspaceConfig, branchConfig };
}
