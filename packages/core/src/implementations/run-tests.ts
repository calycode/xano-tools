import { testRunner } from '../features/testing';
import type { Caly } from '..';
import { ApiGroupConfig, BranchConfig, CoreContext, InstanceConfig, TestConfigEntry, TestGroupResult, WorkspaceConfig } from '@repo/types';

async function runTestsImplementation({
   context,
   groups,
   testConfig,
   core,
   storage,
   initialRuntimeValues,
   contextConfigs,
}: {
   context: CoreContext;
   groups: ApiGroupConfig[];
   testConfig: TestConfigEntry[];
   core: Caly;
   storage: Caly['storage'];
   initialRuntimeValues: Record<string, any>;
   contextConfigs?: {
      instanceConfig?: InstanceConfig;
      workspaceConfig?: WorkspaceConfig;
      branchConfig?: BranchConfig;
   };
}): Promise<TestGroupResult[]> {
   return await testRunner({
      context,
      groups,
      testConfig,
      core,
      storage,
      initialRuntimeValues,
      contextConfigs,
   });
}

export { runTestsImplementation };
