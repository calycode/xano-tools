import {
   BranchConfig,
   ConfigStorage,
   Context,
   CoreContext,
   CurrentContextConfig,
   EventMap,
   InstanceConfig,
   WorkspaceConfig,
} from '../types';
import { TypedEmitter } from './utils/event-handling/event-emitter';
import { doOasUpdate } from './features/oas/generate';
import { exportBackupImplementation, restoreBackupImplementation } from './implementations/backups';
import { generateRepoImplementation } from './implementations/generate-repo';
import { getCurrentContextConfigImplementation } from './implementations/get-current-context';
import { loadAndValidateContextImplementation } from './implementations/load-and-validate-context';
import { setupInstanceImplementation } from './implementations/setup';
import { switchContextImplementation } from './implementations/switch-context';
import { updateOpenapiSpecImplementation } from './implementations/generate-oas';

export class XCC extends TypedEmitter<EventMap> {
   constructor(private storage: ConfigStorage) {
      super();
      this.storage = storage;
   }

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
      groups: any
   ): Promise<void> {
      return updateOpenapiSpecImplementation(this.storage, this, {
         instance,
         workspace,
         branch,
         groups,
      });
   }

   async exportBackup({ instance, workspace, branch }): Promise<Record<string, string>> {
      return exportBackupImplementation({
         instance,
         workspace,
         branch,
         core: this,
      });
   }

   async generateRepo(jsonData: any): Promise<{ path: string; content: string }[]> {
      const response = await generateRepoImplementation(jsonData, this);
      return response;
   }

   /**
    *
    * Expexts the prepared FORMDATA that will only be uploaded by the axios
    *
    * @param
    * @returns Axios response
    */
   async restoreBackup({ instance, workspace, formData }): Promise<any> {
      return restoreBackupImplementation({
         instance,
         workspace,
         formData,
         core: this,
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
   async loadAndValidateContext({ instance, workspace, branch }: Context): Promise<{
      instanceConfig: InstanceConfig;
      workspaceConfig: WorkspaceConfig;
      branchConfig: BranchConfig;
      globalConfig: any;
   }> {
      return loadAndValidateContextImplementation(this.storage, { instance, workspace, branch });
   }

   async getCurrentContextConfig(
      globalConfig?: any,
      context: Context = {}
   ): Promise<CurrentContextConfig> {
      return getCurrentContextConfigImplementation({
         storage: this.storage,
         globalConfig,
         context,
      });
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
