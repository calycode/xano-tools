import type { Caly } from '..';
import { rebuildDirectoryStructure } from '../features/process-xano';

async function generateRepoImplementation({
   jsonData,
   storage,
   core,
   instance,
   workspace,
   branch,
}: {
   jsonData: any;
   storage: any;
   core: Caly;
   instance?: string;
   workspace?: string;
   branch?: string;
}): Promise<{ path: string; content: string }[]> {
   return await rebuildDirectoryStructure({
      jsonData,
      storage,
      core,
      instance,
      workspace,
      branch,
   });
}

export { generateRepoImplementation };
