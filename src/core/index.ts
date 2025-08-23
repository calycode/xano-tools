import { ConfigStorage, Context, InstanceConfig, WorkspaceConfig, BranchConfig } from '../types';
import { setupInstanceImplementation } from './implementations/setup';
import { loadAndValidateContextImplementation } from './implementations/load-and-validate-context';

export class XCC {
   constructor(private storage: ConfigStorage) {}

   async setupInstance(options: {
      name: string;
      url: string;
      apiKey: string;
      setAsCurrent?: boolean;
   }) {
      return setupInstanceImplementation(this.storage, options);
   }

   async loadAndValidateContext(overrides: Partial<Context>): Promise<{
      instanceConfig: InstanceConfig;
      workspaceConfig: WorkspaceConfig;
      branchConfig: BranchConfig;
      globalConfig: any;
   }> {
      return loadAndValidateContextImplementation(this.storage, overrides);
   }
}
