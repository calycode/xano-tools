import { testRunner } from '../features/testing';
import type { Caly } from '..';
import { ApiGroupConfig, CoreContext, TestConfigEntry, TestGroupResult } from '@repo/types';
import type { FeatureContextConfigs } from '../utils/methods/resolve-feature-context';

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
   contextConfigs?: FeatureContextConfigs;
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
