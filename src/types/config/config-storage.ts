// core/config-storage.ts
export interface ConfigStorage {
   ensureDirs(): Promise<void>;
   loadGlobalConfig(): Promise<any>;
   saveGlobalConfig(config: any): Promise<void>;
   loadInstanceConfig(instance: string): Promise<any>;
   saveInstanceConfig(instance: string, data: any): Promise<void>;
   loadToken(instance: string): Promise<string>;
   saveToken(instance: string, token: string): Promise<void>;
}
