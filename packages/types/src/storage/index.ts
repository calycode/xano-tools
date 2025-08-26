// core/config-storage.ts
import { InstanceConfig, CoreContext } from '..';
/**
 * Storage interface for XCC configuration and file operations.
 * Abstracts filesystem operations to allow different storage implementations (Node.js, browser, etc.).
 * 
 * @example
 * ```typescript
 * // Node.js implementation
 * import { nodeConfigStorage } from '@mihalytoth20/xcc-cli';
 * const xcc = new XCC(nodeConfigStorage);
 * 
 * // Custom implementation
 * class CustomStorage implements ConfigStorage {
 *   async loadGlobalConfig() {
 *     // Custom storage logic
 *   }
 *   // ... implement other methods
 * }
 * ```
 */
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
   readdir(path: string): Promise<string[]>;
   writeFile(path: string, data: string | Uint8Array): Promise<void>;
   readFile(path: string): Promise<string | Uint8Array>;
   exists(path: string): Promise<boolean>;

   // Tar methods
   tarExtract(tarGzBuffer: Uint8Array): Promise<{ [filename: string]: Uint8Array | string }>;
   // Optionally add readFile, exists, etc. as needed
}
