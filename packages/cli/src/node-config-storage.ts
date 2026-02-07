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
 * Walks up the directory tree to find the first directory containing
 * .xano-tools/cli.config.json, starting from startDir or process.cwd().
 * @param startDir Optional directory to start search from. Defaults to process.cwd().
 * @returns The project root directory containing the config file.
 * @throws {Error} if no config file is found up to the filesystem root.
 */
async function walkDirs(startDir?: string): Promise<string> {
   let dir = startDir ?? process.cwd();

   while (true) {
      const configPath = path.join(dir, DEFAULT_LOCAL_CONFIG_FILE);

      if (fs.existsSync(configPath)) {
         return dir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) {
         // reached root
         throw new Error(
            `No local config found under any parent directories. Looked for ${dir}/${DEFAULT_LOCAL_CONFIG_FILE}`
         );
      }
      dir = parent;
   }
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

function selectiveDeepMerge(source: any, target: any): any {
   // Only merge the keys we care about; otherwise, leave target as is.
   // Sanitize source to prevent prototype pollution
   const safeSource = sanitizeObject(source);
   const result = { ...target };
   for (const key of MERGE_KEYS) {
      if (safeSource[key]) {
         if (
            typeof safeSource[key] === 'object' &&
            typeof target[key] === 'object' &&
            safeSource[key] !== null &&
            target[key] !== null
         ) {
            result[key] = { ...target[key], ...safeSource[key] };
         } else {
            result[key] = safeSource[key];
         }
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
      [TOKENS_DIR].forEach((dir) => {
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
      const configPath = path.join(projectRoot, DEFAULT_LOCAL_CONFIG_FILE);
      if (!fs.existsSync(projectRoot)) {
         fs.mkdirSync(projectRoot, { recursive: true });
      }
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
   },

   async loadInstanceConfig(workingDir?: string): Promise<any> {
      const projectRoot = await walkDirs(workingDir);
      const configPath = path.join(projectRoot, DEFAULT_LOCAL_CONFIG_FILE);
      if (!fs.existsSync(configPath)) throw new Error(`Local config not found: ${configPath}`);
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
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
      let dir = path.resolve(startDir);
      let mergedConfig: any = {};
      let branchConfig: any = null;
      let workspaceConfig: any = null;
      let instanceConfig: any = null;
      const foundLevels: { branch?: string; workspace?: string; instance?: string } = {};

      while (dir && dir !== path.dirname(dir)) {
         for (const configFile of configFiles) {
            const configPath = path.join(dir, configFile);
            if (fs.existsSync(configPath)) {
               try {
                  const raw = fs.readFileSync(configPath, 'utf-8');
                  const config = JSON.parse(raw);

                  // Special handling by config file type
                  if (configFile === 'branch.config.json') {
                     mergedConfig = selectiveDeepMerge(config, mergedConfig);
                     branchConfig = config;
                     foundLevels.branch = branchConfig.label;
                  } else if (configFile === 'workspace.config.json') {
                     mergedConfig = selectiveDeepMerge(config, mergedConfig);
                     workspaceConfig = config;
                     foundLevels.workspace = workspaceConfig.name;
                  } else if (configFile === 'instance.config.json') {
                     mergedConfig = selectiveDeepMerge(config, mergedConfig);
                     instanceConfig = config;
                     foundLevels.instance = instanceConfig.name;
                  }
               } catch (err) {
                  console.warn(`⚠️  Failed to load or parse ${configPath}: ${err}`);
               }
            }
         }
         dir = path.dirname(dir);
      }

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
