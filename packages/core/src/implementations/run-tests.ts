import { testRunner } from '../features/testing';
import type { Caly } from '..';
import { ApiGroupConfig, CoreContext, AssertDefinition } from '@repo/types';

// Define test config entry type inline to match the testing module
interface TestConfigEntry {
   path: string;
   method: string;
   headers: Record<string, string>;
   queryParams: Array<{ name: string; in: 'path' | 'query' | 'header' | 'cookie'; value: any }> | null;
   requestBody: any;
   store?: Array<{ key: string; path: string }>;
   customAsserts?: AssertDefinition;
}

interface TestResult {
   path: string;
   method: string;
   success: boolean;
   errors: Array<{ key: string; message: string }> | string | null;
   warnings: Array<{ key: string; message: string }> | null;
   duration: number;
}

interface TestGroupResult {
   group: ApiGroupConfig;
   results: TestResult[];
}

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
