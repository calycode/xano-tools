/**
 * Node.js filesystem-based implementation of ConfigStorage for  Caly CLI.
 * Stores configuration files in the user's home directory under .xano-tools/
 *
 * Directory structure:
 * - ~/.xano-tools/config.json (global configuration)
 * - ~/.xano-tools/tokens/ (API tokens with restricted permissions)
 */
import fs from 'node:fs';
import path from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { x } from 'tar';
import { ConfigStorage, InstanceConfig } from '@repo/types';

const BASE_DIR = path.join(homedir(), '.xano-tools');
const GLOBAL_CONFIG_PATH = path.join(BASE_DIR, 'config.json');
const TOKENS_DIR = path.join(BASE_DIR, 'tokens');
const INSTANCES_DIR = path.join(BASE_DIR, 'instances');
const DEFAULT_LOCAL_CONFIG_FILE = 'instance.config.json';
const MERGE_KEYS = ['test'];

/**
 * Validates an instance name to prevent path traversal attacks.
 * Only allows alphanumeric characters, hyphens, and underscores.
 * @param instance - Instance name to validate
 * @throws {Error} if instance name contains invalid characters
 */
function validateInstanceName(instance: string): void {
   if (!instance || typeof instance !== 'string') {
      throw new Error('Instance name must be a non-empty string');
   }
   // Allow only alphanumeric, hyphen, underscore - prevents path traversal
   if (!/^[a-zA-Z0-9_-]+$/.test(instance)) {
      throw new Error(
         `Invalid instance name: "${instance}". Instance names can only contain letters, numbers, hyphens, and underscores.`
      );
   }
}

/**
 * Keys that should be filtered out to prevent prototype pollution attacks.
 * These keys can modify object prototypes if spread into objects.
 */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * The only directory walk in the CLI. Walks from `startDir` to the filesystem
 * root, calling `visit` per directory until it returns true. Shared by project
 * root discovery, merged config loading, and instance config lookup.
 */
function walkUp(
   startDir: string | undefined,
   visit: (dir: string) => boolean | void
): string | null {
   let dir = path.resolve(startDir ?? process.cwd());

   while (true) {
      if (visit(dir)) {
         return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) {
         return null;
      }
      dir = parent;
   }
}

/**
 * Finds the nearest directory containing `sentinel`, starting from startDir.
 * @throws {Error} when no matching directory exists up to the filesystem root.
 */
function findProjectRoot(
   startDir: string = process.cwd(),
   sentinel: string = DEFAULT_LOCAL_CONFIG_FILE
): string {
   const found = walkUp(startDir, (dir) => fs.existsSync(path.join(dir, sentinel)));
   if (!found) {
      throw new Error(`Project root not found (missing ${sentinel})`);
   }
   return found;
}

/**
 * Filters out dangerous keys from an object to prevent prototype pollution.
 * @param obj - Object to sanitize
 * @returns New object without dangerous keys
 */
function sanitizeObject(obj: any): any {
   if (obj === null || typeof obj !== 'object') {
      return obj;
   }
   const result: any = Array.isArray(obj) ? [] : {};
   for (const key of Object.keys(obj)) {
      if (DANGEROUS_KEYS.includes(key)) {
         continue; // Skip dangerous keys
      }
      result[key] = sanitizeObject(obj[key]);
   }
   return result;
}

/**
 * Overlays a parent level onto the merge keys accumulated from nearer levels.
 * Only `MERGE_KEYS` propagate, and the nearer level wins on conflicts, so a
 * nested branch config overrides the same key higher up the tree.
 */
function mergeConfigLevels(nearest: any, parent: any): any {
   const safeNearest = sanitizeObject(nearest);
   const safeParent = sanitizeObject(parent);
   const result: any = {};

   for (const key of MERGE_KEYS) {
      const near = safeNearest[key];
      const far = safeParent[key];
      if (near === undefined && far === undefined) continue;

      if (
         typeof near === 'object' &&
         near !== null &&
         typeof far === 'object' &&
         far !== null
      ) {
         result[key] = { ...far, ...near };
      } else {
         result[key] = near !== undefined ? near : far;
      }
   }

   return result;
}

/**
 * Node.js implementation of the ConfigStorage interface.
 * Provides file system operations and configuration management for the Caly CLI.
 *
 * @example
 * ```typescript
 * import { Caly } from '@calycode/caly-core';
 * import { nodeConfigStorage } from '@calycode/cli';
 *
 * const calyInstance = new Caly(nodeConfigStorage);
 * ```
 */
export const nodeConfigStorage: ConfigStorage = {
   /**
    * Ensures that required configuration directories exist.
    * Creates ~/.xano-tools/instances and ~/.xano-tools/tokens if they don't exist.
    */
   async ensureDirs() {
      [TOKENS_DIR, INSTANCES_DIR].forEach((dir) => {
         if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      });
   },

   /**
    * Loads the global Caly configuration from ~/.xano-tools/config.json.
    * Returns default configuration if file doesn't exist.
    * @returns Global configuration object with current context and instance list
    */
   async loadGlobalConfig() {
      if (!fs.existsSync(GLOBAL_CONFIG_PATH)) {
         return { currentContext: {}, instances: [] };
      }
      return JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf-8'));
   },

   async saveGlobalConfig(config) {
      fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2));
   },

   async saveInstanceConfig(projectRoot: string = '', config: InstanceConfig) {
      // Validate before writing anything: an invalid name must not clobber the
      // local instance.config.json on its way to the per-instance copy.
      if (config?.name) {
         validateInstanceName(config.name);
      }

      const configPath = path.join(projectRoot, DEFAULT_LOCAL_CONFIG_FILE);
      if (projectRoot && !fs.existsSync(projectRoot)) {
         fs.mkdirSync(projectRoot, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

      // Keep a per-instance copy so `--instance <name>` can select a config
      // from any directory (browser storage already keys configs by name).
      if (config?.name) {
         if (!fs.existsSync(INSTANCES_DIR)) {
            fs.mkdirSync(INSTANCES_DIR, { recursive: true });
         }
         fs.writeFileSync(
            path.join(INSTANCES_DIR, `${config.name}.json`),
            JSON.stringify(config, null, 2)
         );
      }
   },

   /**
    * Loads the config for a named instance from ~/.xano-tools/instances, falling
    * back to the nearest local instance.config.json. The argument is always an
    * instance name; `undefined` searches from the current working directory.
    */
   async loadInstanceConfig(instance?: string): Promise<any> {
      if (instance) {
         validateInstanceName(instance);
         const globalPath = path.join(INSTANCES_DIR, `${instance}.json`);
         if (fs.existsSync(globalPath)) {
            return JSON.parse(fs.readFileSync(globalPath, 'utf-8'));
         }
      }

      const projectRoot = findProjectRoot(process.cwd());
      const configPath = path.join(projectRoot, DEFAULT_LOCAL_CONFIG_FILE);
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (instance && config.name !== instance) {
         throw new Error(`Instance config not found: ${instance}`);
      }
      return config;
   },

   /**
    * Recursively walks up from startDir, merging only lint/test keys.
    * All other keys from workspace/branch configs are stored in workspaceConfig/branchConfig.
    */
   loadMergedConfig(
      startDir: string,
      configFiles: string[] = [
         'branch.config.json',
         'workspace.config.json',
         'instance.config.json',
      ]
   ): {
      mergedConfig: any;
      branchConfig?: any;
      workspaceConfig?: any;
      instanceConfig?: any;
      foundLevels: { branch?: string; workspace?: string; instance?: string };
   } {
      let mergedConfig: any = {};
      let branchConfig: any = null;
      let workspaceConfig: any = null;
      let instanceConfig: any = null;
      const foundLevels: { branch?: string; workspace?: string; instance?: string } = {};

      walkUp(startDir, (dir) => {
         for (const configFile of configFiles) {
            const configPath = path.join(dir, configFile);
            if (fs.existsSync(configPath)) {
               try {
                  const raw = fs.readFileSync(configPath, 'utf-8');
                  const config = JSON.parse(raw);

                  // Nearest level wins: only the first config of each kind found
                  // while walking up is kept. Parent levels still contribute
                  // merge keys (e.g. `test`) without overriding the nearest one.
                  mergedConfig = mergeConfigLevels(mergedConfig, config);
                  if (configFile === 'branch.config.json') {
                     if (!branchConfig) {
                        branchConfig = config;
                        foundLevels.branch = branchConfig.label;
                     }
                  } else if (configFile === 'workspace.config.json') {
                     if (!workspaceConfig) {
                        workspaceConfig = config;
                        foundLevels.workspace = workspaceConfig.name;
                     }
                  } else if (configFile === 'instance.config.json') {
                     if (!instanceConfig) {
                        instanceConfig = config;
                        foundLevels.instance = instanceConfig.name;
                     }
                  }
               } catch (err) {
                  console.warn(`⚠️  Failed to load or parse ${configPath}: ${err}`);
               }
            }
         }
         // Keep walking: parent levels still contribute to the selective merge.
      });

      return {
         mergedConfig,
         branchConfig,
         workspaceConfig,
         instanceConfig,
         foundLevels,
      };
   },

   /**
    * Loads API token for the specified instance.
    * First checks for environment variable (XANO_TOKEN_INSTANCENAME), then falls back to token file.
    * @param instance - Instance name to load token for
    * @returns The API token string
    * @throws {Error} When token is not found in either location or instance name is invalid
    */
   async loadToken(instance) {
      // Validate instance name to prevent path traversal
      validateInstanceName(instance);

      const envVarName = `XANO_TOKEN_${instance.toUpperCase().replace(/-/g, '_')}`;
      const envToken = process.env[envVarName];
      if (envToken) {
         return envToken;
      }
      const p = path.join(TOKENS_DIR, `${instance}.token`);
      if (!fs.existsSync(p)) {
         throw new Error(
            `Token not found for instance: ${instance}. Please provide it via the ${envVarName} environment variable or run 'caly setup'.`
         );
      }
      return fs.readFileSync(p, 'utf-8').trim();
   },

   /**
    * Saves API token for the specified instance with restricted file permissions.
    * Token file is created with 600 permissions (readable only by owner).
    * @param instance - Instance name to save token for
    * @param token - The API token to save
    * @throws {Error} When instance name is invalid
    */
   async saveToken(instance, token) {
      // Validate instance name to prevent path traversal
      validateInstanceName(instance);

      const p = path.join(TOKENS_DIR, `${instance}.token`);
      fs.writeFileSync(p, token, { mode: 0o600 });
   },

   /**
    * Get the current working directory as 'startDir' for reuse in the core methods.
    *
    * @return string
    */
   getStartDir() {
      return process.cwd();
   },
   //
   // ----- FILESYSTEM OPS -----
   async mkdir(dirPath, options) {
      await fs.promises.mkdir(dirPath, options);
   },
   async readdir(dirPath): Promise<string[]> {
      return await fs.promises.readdir(dirPath);
   },
   async writeFile(filePath, data) {
      await fs.promises.writeFile(filePath, data);
   },

   async streamToFile({
      path,
      stream,
   }: {
      path: string;
      stream: ReadableStream | NodeJS.ReadableStream;
   }): Promise<void> {
      const dest = fs.createWriteStream(path, { mode: 0o600 });
      let nodeStream: NodeJS.ReadableStream;

      // Convert if necessary
      if (typeof (stream as any).pipe === 'function') {
         // already a NodeJS stream
         nodeStream = stream as NodeJS.ReadableStream;
      } else {
         // WHATWG stream (from fetch in Node 18+)
         // Can only use fromWeb if available in the environment
         nodeStream = Readable.fromWeb(stream as any);
      }

      await new Promise<void>((resolve, reject) => {
         nodeStream.pipe(dest);
         dest.on('finish', () => resolve());
         dest.on('error', (err) => reject(err));
         nodeStream.on('error', (err) => reject(err));
      });
   },

   async readFile(filePath) {
      return await fs.promises.readFile(filePath); // returns Buffer
   },

   async exists(filePath) {
      try {
         await fs.promises.access(filePath);
         return true;
      } catch {
         return false;
      }
   },

   // ----- TAR helper -----
   async tarExtract(tarGzBuffer) {
      const tempDir = await fs.promises.mkdtemp(join(tmpdir(), 'extract-'));
      const tarGzPath = join(tempDir, `workspace-schema-export-${Date.now()}.tar.gz`);
      let result: { [filename: string]: Uint8Array } = {};

      try {
         await fs.promises.writeFile(tarGzPath, tarGzBuffer);

         // Extract with tar
         await x({ file: tarGzPath, cwd: tempDir });

         const entries = await fs.promises.readdir(tempDir, { recursive: true });

         for (const file of entries) {
            // Check for both extensions
            if (file.endsWith('.yaml') || file.endsWith('.json')) {
               const fullPath = join(tempDir, file);
               // Ensure we are reading a file, not a directory that happens to end in .json
               const stat = await fs.promises.stat(fullPath);
               if (stat.isFile()) {
                  result[file] = await fs.promises.readFile(fullPath);
               }
            }
         }
      } finally {
         await fs.promises.rm(tempDir, { recursive: true, force: true });
      }

      return result;
   },
};

export { findProjectRoot };
