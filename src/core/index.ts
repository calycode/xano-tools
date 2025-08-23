import {
   ConfigStorage,
   Context,
   InstanceConfig,
   WorkspaceConfig,
   BranchConfig,
   CurrentContextConfig,
   CoreContext,
} from '../types';
import { setupInstanceImplementation } from './implementations/setup';
import { loadAndValidateContextImplementation } from './implementations/load-and-validate-context';
import { getCurrentContextConfigImplementation } from './implementations/get-current-context';
import { switchContextImplementation } from './implementations/switch-context';
import { updateOpenapiSpecImplementation } from './implementations/generate-oas';
import { doOasUpdate } from './features/oas/generate';

export class XCC {
   constructor(private storage: ConfigStorage) {}

   // ----- MAIN FEATURES ----- //
   async setupInstance(options: {
      name: string;
      url: string;
      apiKey: string;
      setAsCurrent?: boolean;
   }) {
      return setupInstanceImplementation(this.storage, options);
   }

   async switchContext({ instance, workspace, branch }: CoreContext): Promise<void> {
      return switchContextImplementation(this.storage, { instance, workspace, branch });
   }

   async updateOpenapiSpec(
      instance: string,
      workspace: string,
      branch: string,
      // groups have to be the proper api group array not just a string...
      groups: any,
      printOutput: boolean = false
   ): Promise<void> {
      return updateOpenapiSpecImplementation(this.storage, this, {
         instance,
         workspace,
         branch,
         groups,
         printOutput,
      });
   }

   // ----- SEMI-UTIL METHODS ----- //
   async doOasUpdate({ inputOas, outputDir, instanceConfig, workspaceConfig }): Promise<any> {
      return doOasUpdate({
         inputOas,
         outputDir,
         instanceConfig,
         workspaceConfig,
         storage: this.storage,
      });
   }

   // ----- UTIL METHODS ----- //
   async loadAndValidateContext(overrides: Partial<Context>): Promise<{
      instanceConfig: InstanceConfig;
      workspaceConfig: WorkspaceConfig;
      branchConfig: BranchConfig;
      globalConfig: any;
   }> {
      return loadAndValidateContextImplementation(this.storage, overrides);
   }

   async getCurrentContextConfig(
      globalConfig?: any,
      context: Context = {}
   ): Promise<CurrentContextConfig> {
      return getCurrentContextConfigImplementation(this.storage, globalConfig, context);
   }

   async loadGlobalConfig(): Promise<any> {
      return this.storage.loadGlobalConfig();
   }

   async loadInstanceConfig(instance: string): Promise<InstanceConfig> {
      return this.storage.loadInstanceConfig(instance);
   }

   async loadToken(instance: string): Promise<string> {
      return this.storage.loadToken(instance);
   }
}
