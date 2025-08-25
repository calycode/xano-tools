import type { XCC } from '..';
import { rebuildDirectoryStructure } from '../features/process-xano';

async function generateRepoImplementation(jsonData: any, core: XCC): Promise<{ path: string; content: string }[]> {
   return await rebuildDirectoryStructure(jsonData, core);
}

export { generateRepoImplementation };
