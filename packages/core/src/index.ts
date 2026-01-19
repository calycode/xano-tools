import {
   ApiGroupConfig,
   BranchConfig,
   ConfigStorage,
   Context,
   CoreContext,
   CurrentContextConfig,
   EventMap,
   InstanceConfig,
   WorkspaceConfig,
} from '@repo/types';
import { TypedEmitter } from './utils/event-handling/event-emitter';
import { buildXanoscriptRepoImplementation } from './implementations/build-xanoscript-repo';
import { doOasUpdate } from './features/oas/generate';
import { exportBackupImplementation, restoreBackupImplementation } from './implementations/backups';
import { generateRepoImplementation } from './implementations/generate-repo';
import { getCurrentContextConfigImplementation } from './implementations/get-current-context';
import { loadAndValidateContextImplementation } from './implementations/load-and-validate-context';
import { runTestsImplementation } from './implementations/run-tests';
import { setupInstanceImplementation } from './implementations/setup';
import { switchContextImplementation } from './implementations/switch-context';
import { updateOpenapiSpecImplementation } from './implementations/generate-oas';
import { generateInternalDocsImplementation } from './implementations/generate-internal-docs';
import { getRegistryIndex } from './features/registry/api';
import { installRegistryItemToXano } from './features/registry/install-to-xano';

/**
 * Main Caly class that provides core functionality for Xano development workflows.
 * Extends TypedEmitter to provide event-driven architecture for CLI operations.
 *
 * @example
 * ```typescript
 * import { Caly } from '@calycode/caly-core';
 * import { nodeConfigStorage } from '@calycode/cli';
 *
 * const calyInstance = new Caly(nodeConfigStorage);
 *
 * // Setup a new Xano instance
 * await calyInstance.setupInstance({
 *   name: 'production',
 *   url: 'https://x123.xano.io',
 *   apiKey: 'your-api-key'
 * });
 *
 * // Generate OpenAPI specification
 * await calyInstance.updateOpenapiSpec('production', 'main', 'master', ['api']);
 * ```
 */
// [ ] TODO: create a default in-memory storage implementation
export class Caly extends TypedEmitter<EventMap> {
   /**
    * Creates a new Caly instance with the provided storage implementation.
    * @param storage - Storage implementation for configuration and file operations
    */
   constructor(private storage: ConfigStorage) {
      super();
      this.storage = storage;
   }

   // ----- MAIN FEATURES ----- //
   /**
    * Sets up a new Xano instance configuration with authentication and workspace discovery.
    * This is typically the first step when configuring Caly for a new Xano deployment.
    *
    * @param options - Instance setup configuration
    * @param options.name - Unique name for this instance (will be sanitized)
    * @param options.url - Base URL of the Xano instance (e.g., 'https://x123.xano.io')
    * @param options.apiKey - Metadata API key for authentication
    * @param options.setAsCurrent - Whether to set this as the active context (default: true)
    * @throws {Error} When instance name is invalid or API authentication fails
    *
    * @example
    * ```typescript
    * await calyInstance.setupInstance({
    *   name: 'production',
    *   url: 'https://x123.xano.io',
    *   apiKey: 'your-metadata-api-key',
    *   setAsCurrent: true
    * });
    * ```
    */
   async setupInstance(options: {
      name: string;
      url: string;
      apiKey: string;
      setAsCurrent?: boolean;
      projectRoot: string;
   }) {
      return setupInstanceImplementation(this.storage, options);
   }

   /**
    * @deprecated This has been deprecated in favor for feature invokation level overrides.
    * Switches the current active context to a different instance, workspace, or branch.
    * Updates the global configuration to reflect the new active context.
    *
    * @param context - The new context to switch to
    * @param context.instance - Instance name to switch to
    * @param context.workspace - Workspace identifier to switch to
    * @param context.branch - Branch name to switch to
    * @throws {Error} When the specified context configuration is invalid
    *
    * @example
    * ```typescript
    * await calyInstance.switchContext({
    *   instance: 'staging',
    *   workspace: 'main',
    *   branch: 'develop'
    * });
    * ```
    */
   async switchContext({ instance, workspace, branch }: CoreContext): Promise<void> {
      return switchContextImplementation(this.storage, { instance, workspace, branch });
   }

   /**
    * Generates OpenAPI Specification (OAS) documents from Xano API definitions.
    * Creates comprehensive API documentation with schemas, endpoints, and examples.
    *
    * @param instance - Name of the configured Xano instance
    * @param workspace - Workspace identifier
    * @param branch - Branch name within the workspace
    * @param groups - Array of API group names to generate specs for, or ['all'] for all groups
    * @returns Promise resolving to array of generated OAS documents with metadata
    * @throws {Error} When instance/workspace/branch configuration is invalid
    *
    * @example
    * ```typescript
    * // Generate OAS for specific API groups
    * const results = await calyInstance.updateOpenapiSpec(
    *   'production',
    *   'main',
    *   'master',
    *   ['user-api', 'admin-api']
    * );
    *
    * // Generate OAS for all API groups
    * const allResults = await calyInstance.updateOpenapiSpec(
    *   'production',
    *   'main',
    *   'master',
    *   ['all']
    * );
    * ```
    */
   async updateOpenapiSpec(
      instance: string,
      workspace: string,
      branch: string,
      groups: any,
      startDir: string,
      includeTables?: boolean,
   ): Promise<{ group: string; oas: any; generatedItems: { path: string; content: string }[] }[]> {
      return updateOpenapiSpecImplementation(
         this.storage,
         this,
         {
            instance,
            workspace,
            branch,
            groups,
            includeTables,
         },
         startDir,
      );
   }

   /**
    * Exports a backup of the specified Xano workspace and branch.
    * Downloads workspace data including functions, tables, and configurations.
    *
    * @param options - Backup export configuration
    * @param options.instance - Name of the configured Xano instance
    * @param options.workspace - Workspace identifier to backup
    * @param options.branch - Branch name to backup
    * @returns Promise resolving to backup data as key-value pairs
    * @throws {Error} When backup export fails or context is invalid
    *
    * @example
    * ```typescript
    * const backupData = await calyInstance.exportBackup({
    *   instance: 'production',
    *   workspace: 'main',
    *   branch: 'master'
    * });
    * ```
    */
   async exportBackup({ instance, workspace, branch, outputDir }): Promise<Record<string, string>> {
      return exportBackupImplementation({
         outputDir,
         instance,
         workspace,
         branch,
         core: this,
      });
   }

   /**
    * Generates a browsable repository structure from Xano workspace schema JSON (that comes form the metadata and a yaml file).
    * Processes queries, functions, and tables into organized file structures.
    *
    * @param jsonData - Raw Xano workspace data to process
    * @returns Promise resolving to array of generated files with paths and content
    * @throws {Error} When data processing fails
    *
    * @example
    * ```typescript
    * const workspaceData = await fetchWorkspaceData();
    * const repoFiles = await calyInstance.generateRepo(workspaceData);
    *
    * // Save files to disk
    * for (const file of repoFiles) {
    *   await fs.writeFile(file.path, file.content);
    * }
    * ```
    */
   async generateRepo({
      jsonData,
      instance,
      workspace,
      branch,
   }: {
      jsonData: any;
      instance?: string;
      workspace?: string;
      branch?: string;
   }): Promise<{ path: string; content: string }[]> {
      const response = await generateRepoImplementation({
         jsonData,
         storage: this.storage,
         core: this,
         instance,
         workspace,
         branch,
      });

      return response;
   }

   /**
    * Generate a repository with separate .xs and .json metadata files based on workspace
    * this takes the metadata api and directly tries to rebuild the workspace as a repo.
    * It requires an instance, workspace and a branch selection. The rest it takes from Xano
    * @param options - Config object
    * @param options.workspace - Target workspace
    * @param options.branch - Target branch to fetch data for.
    * @returns Promise resolving to array of generated files with paths and content
    *
    * @example
    * ```typescript
    * const xanoScriptPath = 'output/instance/xanoscript/branch;
    * const xanoScriptFiles = await calyInstance.buildXanoscriptRepo({instance, workspace, branch});
    *
    * // Save files to disc:
    * for (const file of xanoScriptFiles) {
    *    await fs.writeFile(file.path, file.content)
    * }
    */
   async buildXanoscriptRepo({
      instance,
      workspace,
      branch,
   }): Promise<{ path: string; content: string }[]> {
      const response = await buildXanoscriptRepoImplementation({
         storage: this.storage,
         core: this,
         options: {
            instance,
            workspace,
            branch,
         },
      });
      return response;
   }

   /**
    * Creates a browseable internal documentation by processing the 'internal documentation' from each item in the system, combined with the inline comments and descriptions that are found inside the function stacks.
    *
    */
   async generateInternalDocs({
      jsonData,
      instance,
      workspace,
      branch,
   }: {
      jsonData: any;
      instance?: string;
      workspace?: string;
      branch?: string;
   }): Promise<{ path: string; content: string }[]> {
      const response = await generateInternalDocsImplementation({
         jsonData,
         storage: this.storage,
         core: this,
         instance,
         workspace,
         branch,
      });

      return response;
   }

   /**
    * Restores a Xano workspace from backup data.
    * Uploads prepared FormData containing backup files to restore workspace state.
    *
    * @param options - Backup restore configuration
    * @param options.instance - Name of the configured Xano instance
    * @param options.workspace - Workspace identifier to restore to
    * @param options.formData - Prepared FormData containing backup files
    * @returns Promise resolving to the restore operation response
    * @throws {Error} When restore operation fails or context is invalid
    *
    * @example
    * ```typescript
    * const formData = new FormData();
    * formData.append('backup', backupFile);
    *
    * const result = await calyInstance.restoreBackup({
    *   instance: 'staging',
    *   workspace: 'main',
    *   formData: formData
    * });
    * ```
    */
   async restoreBackup({ instance, workspace, formData }): Promise<any> {
      return restoreBackupImplementation({
         instance,
         workspace,
         formData,
         core: this,
      });
   }

   /**
    * Run tests based on provided testconfig file.
    */
   // [ ] Add JSDocs
   async runTests({
      context,
      groups,
      testConfig,
      initialRuntimeValues,
   }: {
      context: Context;
      groups: ApiGroupConfig[];
      testConfig: any;
      initialRuntimeValues: Record<string, any>;
   }): Promise<
      {
         group: ApiGroupConfig;
         results: {
            path: string;
            method: string;
            success: boolean;
            errors: any;
            warnings: any;
            duration: number;
         }[];
      }[]
   > {
      return await runTestsImplementation({
         context,
         groups,
         testConfig,
         core: this,
         storage: this.storage,
         initialRuntimeValues,
      });
   }

   // ----- SEMI-UTIL METHODS ----- //
   /**
    * Updates an OpenAPI specification with Xano-specific enhancements.
    * Processes the OAS to add custom schemas, examples, and metadata.
    *
    * @param options - OAS update configuration
    * @param options.inputOas - The base OpenAPI specification to enhance
    * @param options.instanceConfig - Instance configuration for context
    * @param options.workspaceConfig - Workspace configuration for context
    * @returns Promise resolving to enhanced OAS and generated supplementary files
    * @throws {Error} When OAS processing fails
    *
    * @example
    * ```typescript
    * const result = await calyInstance.doOasUpdate({
    *   inputOas: baseOpenApiSpec,
    *   instanceConfig: instanceConfig,
    *   workspaceConfig: workspaceConfig
    * });
    * ```
    */
   async doOasUpdate({
      inputOas,
      instanceConfig,
      workspaceConfig,
      includeTables = false,
   }): Promise<{
      oas: any;
      generatedItems: {
         path: string;
         content: string;
      }[];
   }> {
      return doOasUpdate({
         inputOas,
         instanceConfig,
         workspaceConfig,
         storage: this.storage,
         includeTables,
      });
   }

   // ----- UTIL METHODS ----- //
   /**
    * Loads and validates the configuration for a specific Xano context.
    * Ensures that instance, workspace, and branch configurations exist and are valid.
    *
    * @param context - The context to load and validate
    * @param context.instance - Instance name to validate
    * @param context.workspace - Workspace identifier to validate
    * @param context.branch - Branch name to validate
    * @returns Promise resolving to validated configuration objects
    * @throws {Error} When any part of the context configuration is invalid or missing
    *
    * @example
    * ```typescript
    * const context = await calyInstance.loadAndValidateContext({
    *   instance: 'production',
    *   workspace: 'main',
    *   branch: 'master'
    * });
    * ```
    */
   async loadAndValidateContext({ instance, workspace, branch, startDir }): Promise<{
      instanceConfig: InstanceConfig;
      workspaceConfig: WorkspaceConfig;
      branchConfig: BranchConfig;
   }> {
      return loadAndValidateContextImplementation({
         storage: this.storage,
         overrides: { instance, workspace, branch },
         startDir,
      });
   }

   /**
    * Gets the current active context configuration, merging global config with provided overrides.
    * Resolves the effective instance, workspace, and branch for operations.
    *
    * @param globalConfig - Optional global configuration object (will be loaded if not provided)
    * @param context - Optional context overrides to merge with current context
    * @returns Promise resolving to the current effective context configuration
    *
    * @example
    * ```typescript
    * // Get current context
    * const currentContext = await calyInstance.getCurrentContextConfig();
    *
    * // Override specific context values
    * const overriddenContext = await calyInstance.getCurrentContextConfig(null, {
    *   branch: 'develop'
    * });
    * ```
    */
   async getCurrentContextConfig({
      startDir,
      context = {},
   }: {
      startDir?: any;
      context: Context;
   }): Promise<CurrentContextConfig> {
      return getCurrentContextConfigImplementation({
         storage: this.storage,
         startDir,
         context,
      });
   }

   /**
    * Loads the global Caly configuration containing instance list and current context.
    * @returns Promise resolving to the global configuration object
    *
    * @example
    * ```typescript
    * const config = await calyInstance.loadGlobalConfig();
    * ```
    */
   async loadGlobalConfig(): Promise<any> {
      return this.storage.loadGlobalConfig();
   }

   /**
    * Loads the configuration for a specific Xano instance.
    * @param instance - Name of the instance to load configuration for
    * @returns Promise resolving to the instance configuration
    * @throws {Error} When instance configuration is not found
    *
    * @example
    * ```typescript
    * const instanceConfig = await calyInstance.loadInstanceConfig('production');
    * console.log('Instance URL:', instanceConfig.url);
    * console.log('Available workspaces:', instanceConfig.workspaces);
    * ```
    */
   async loadInstanceConfig(instance: string): Promise<InstanceConfig> {
      return this.storage.loadInstanceConfig(instance);
   }

   /**
    * Loads the API token for a specific Xano instance.
    * First checks environment variables, then falls back to stored token files.
    * @param instance - Name of the instance to load token for
    * @returns Promise resolving to the API token string
    * @throws {Error} When token is not found in either location
    *
    * @example
    * ```typescript
    * const token = await calyInstance.loadToken('production');
    * // Use token for API requests
    * ```
    */
   async loadToken(instance: string): Promise<string> {
      return this.storage.loadToken(instance);
   }

   // ----- REGISTRY METHODS ----- //
    /**
     * Get the main registry index.
     */
    async getRegistryIndex(registryUrl: string) {
       return getRegistryIndex(registryUrl);
    }

    /**
     * Get a specific registry item by name.
     */
    async getRegistryItem(componentName: string, registryUrl: string) {
       const index = await this.getRegistryIndex(registryUrl);
       return index.find(item => item.name === componentName);
    }

    async installRegistryItemToXano(
       item: any,
       resolvedContext: { instanceConfig: any; workspaceConfig: any; branchConfig: any },
       registryUrl: string,
    ) {
       const results = await installRegistryItemToXano(item, resolvedContext, registryUrl, this);
       return results;
    }
}
