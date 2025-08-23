// core/config-storage.ts
import { InstanceConfig, CoreContext } from '..';
// core/config-storage.ts
export interface ConfigStorage {
   ensureDirs(): Promise<void>;
   loadGlobalConfig(): Promise<{ currentContext: CoreContext; instances: string[] }>;
   loadInstanceConfig(instance: string): Promise<InstanceConfig>;
   loadToken(instance: string): Promise<string>;
   saveGlobalConfig(config: any): Promise<void>;
   saveInstanceConfig(instance: string, data: InstanceConfig): Promise<void>;
   saveToken(instance: string, token: string): Promise<void>;

   // Add generic file/directory methods:
   mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
   writeFile(path: string, data: string | Uint8Array): Promise<void>;
   // Optionally add readFile, exists, etc. as needed
}
