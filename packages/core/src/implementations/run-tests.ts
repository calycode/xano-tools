import { testRunnerReworked } from '../features/testing';
import type { Caly } from '..';
import { ApiGroupConfig, CoreContext, PrepareRequestArgs } from '@calycode/types';

async function runTestsImplementation({
   context,
   groups,
   testConfig,
   core,
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
      customAsserts: string[];
   }[];
   core: Caly;
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
   return await testRunnerReworked({ context, groups, testConfig, core });
}

export { runTestsImplementation };
