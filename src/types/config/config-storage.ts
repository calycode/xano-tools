// core/config-storage.ts
import { InstanceConfig, CoreContext } from '..';
export interface ConfigStorage {
   ensureDirs(): Promise<void>;
   loadGlobalConfig(): Promise<{
      currentContext: CoreContext;
      instances: string[];
   }>;
   loadInstanceConfig(instance: string): Promise<InstanceConfig>;
   loadToken(instance: string): Promise<string>;
   saveGlobalConfig(config: any): Promise<void>;
   saveInstanceConfig(instance: string, data: InstanceConfig): Promise<void>;
   saveToken(instance: string, token: string): Promise<void>;
}
