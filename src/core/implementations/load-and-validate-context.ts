// core/config.ts
import { ConfigStorage, InstanceConfig, WorkspaceConfig, BranchConfig, Context } from '../../types';
import { getCurrentContextConfigImplementation } from './get-current-context';

function assignDefined<T>(base: T, overrides: Partial<T>): T {
   const result = { ...base };
   for (const key in overrides) {
      if (overrides[key] !== undefined) {
         result[key] = overrides[key]!;
      }
   }
   return result;
}

export async function loadAndValidateContextImplementation(
   storage: ConfigStorage,
   overrides: Partial<Context>
): Promise<{
   instanceConfig: InstanceConfig;
   workspaceConfig: WorkspaceConfig;
   branchConfig: BranchConfig;
   globalConfig: any;
}> {
   const globalConfig = await storage.loadGlobalConfig();
   const context = assignDefined(globalConfig.currentContext, overrides);
   const { instanceConfig, workspaceConfig, branchConfig } =
      await getCurrentContextConfigImplementation({ storage, globalConfig, context });
   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      throw new Error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
   }
   return { instanceConfig, workspaceConfig, branchConfig, globalConfig };
}
