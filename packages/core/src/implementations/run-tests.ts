import { testRunner } from '../features/testing';
import type { Caly } from '..';
import { ApiGroupConfig, CoreContext, PrepareRequestArgs, AssertDefinition } from '@calycode/types';

async function runTestsImplementation({
   context,
   groups,
   testConfig,
   core,
   storage,
}: {
   context: CoreContext;
   groups: ApiGroupConfig[];
   testConfig: {
      path: string;
      method: string;
      headers: { [key: string]: string };
      queryParams: PrepareRequestArgs['parameters'];
      requestBody: any;
      store?: { key: string; path: string }[];
      customAsserts: AssertDefinition;
   }[];
   core: Caly;
   storage: Caly['storage'];
}): Promise<
   {
      group: ApiGroupConfig;
      results: {
         path: string;
         method: string;
         success: boolean;
         errors: any;
         warnings: any;
         duration: number;
      }[];
   }[]
> {
   return await testRunner({ context, groups, testConfig, core, storage });
}

export { runTestsImplementation };
