import { testRunner } from '../features/testing';
import type { Caly } from '..';
import { ApiGroupConfig, CoreContext, AssertDefinition, TestConfigEntry, TestResult, TestGroupResult } from '@repo/types';

async function runTestsImplementation({
   context,
   groups,
   testConfig,
   core,
   storage,
   initialRuntimeValues,
}: {
   context: CoreContext;
   groups: ApiGroupConfig[];
   testConfig: TestConfigEntry[];
   core: Caly;
   storage: Caly['storage'];
   initialRuntimeValues: Record<string, any>;
}): Promise<TestGroupResult[]> {
   return await testRunner({ context, groups, testConfig, core, storage, initialRuntimeValues });
}

export { runTestsImplementation };
