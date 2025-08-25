import { rebuildDirectoryStructure } from '../features/process-xano';

function generateRepoImplementation(jsonData: any): { path: string; content: string }[] {
   return rebuildDirectoryStructure(jsonData);
}

export { generateRepoImplementation };
