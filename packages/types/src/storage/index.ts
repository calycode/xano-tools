// core/config-storage.ts
import { InstanceConfig, CoreContext, WorkspaceConfig, BranchConfig } from '..';
/**
 * Storage interface for Caly configuration and file operations.
 * Abstracts filesystem operations to allow different storage implementations (Node.js, browser, etc.).
 *
 * @example
 * ```typescript
 * // Node.js implementation (see the cli)
 * import { nodeConfigStorage } from '@calycode/cli';
 * const calyInstance = new Caly(nodeConfigStorage);
 *
 * // Custom implementation
 * class CustomStorage implements ConfigStorage {
 *   async loadGlobalConfig() {
 *     // Custom storage logic
 *   }
 *   // ... implement all other methods
 * }
 * ```
 */
export interface ConfigStorage {
   ensureDirs(): Promise<void>;
   loadGlobalConfig(): Promise<{ currentContext: CoreContext; instances: string[] }>;
   /**
    * Loads the config for a named instance. Node resolves a per-instance copy
    * (falling back to the nearest local config); browser keys configs by name.
    */
   loadInstanceConfig(instance: string): Promise<InstanceConfig>;
   /**
    * Loads the nearest branch/workspace/instance config by walking up from
    * `startDir`. Implementations may return synchronously (Node/browser do);
    * callers should await it so both contracts work.
    */
   loadMergedConfig(
      startDir: string,
      configFiles?: string[]
   ):
      | {
           mergedConfig: any;
           instanceConfig?: InstanceConfig;
           workspaceConfig?: WorkspaceConfig;
           branchConfig?: BranchConfig;
           foundLevels: { branch?: string; workspace?: string; instance?: string };
        }
      | Promise<{
           mergedConfig: any;
           instanceConfig?: InstanceConfig;
           workspaceConfig?: WorkspaceConfig;
           branchConfig?: BranchConfig;
           foundLevels: { branch?: string; workspace?: string; instance?: string };
        }>;
   loadToken(instance: string): Promise<string>;
   saveGlobalConfig(config: any): Promise<void>;
   saveInstanceConfig(projectRoot: string, data: InstanceConfig): Promise<void>;
   saveToken(instance: string, token: string): Promise<void>;
   getStartDir(): string;

   // Add generic file/directory methods:
   mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
   readdir(path: string): Promise<string[]>;
   writeFile(path: string, data: string | Uint8Array): Promise<void>;
   streamToFile({
      path,
      stream,
   }: {
      path: string;
      stream: ReadableStream | NodeJS.ReadableStream;
   }): Promise<void>;
   readFile(path: string): Promise<string | Uint8Array>;
   exists(path: string): Promise<boolean>;

   // Tar methods
   tarExtract(tarGzBuffer: Uint8Array): Promise<{ [filename: string]: Uint8Array | string }>;
}
