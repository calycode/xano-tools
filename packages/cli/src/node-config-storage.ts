/**
 * Node.js filesystem-based implementation of ConfigStorage for  Caly CLI.
 * Stores configuration files in the user's home directory under .xano-tools/
 *
 * Directory structure:
 * - ~/.xano-tools/config.json (global configuration)
 * - ~/.xano-tools/instances/ (instance-specific configurations)
 * - ~/.xano-tools/tokens/ (API tokens with restricted permissions)
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { x } from 'tar';
import { tmpdir } from 'os';
import { join } from 'path';
import { ConfigStorage } from '@calycode/types';

const baseDir = path.join(os.homedir(), '.xano-tools');
const configPath = path.join(baseDir, 'config.json');
const instancesDir = path.join(baseDir, 'instances');
const tokensDir = path.join(baseDir, 'tokens');

/**
 * Node.js implementation of the ConfigStorage interface.
 * Provides file system operations and configuration management for the Caly CLI.
 *
 * @example
 * ```typescript
 * import { XCC } from '@calycode/caly-core';
 * import { nodeConfigStorage } from '@calycode/cli';
 *
 * const xcc = new XCC(nodeConfigStorage);
 * ```
 */
export const nodeConfigStorage: ConfigStorage = {
   /**
    * Ensures that required configuration directories exist.
    * Creates ~/.xano-tools/instances and ~/.xano-tools/tokens if they don't exist.
    */
   async ensureDirs() {
      [instancesDir, tokensDir].forEach((dir) => {
         if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      });
   },

   /**
    * Loads the global XCC configuration from ~/.xano-tools/config.json.
    * Returns default configuration if file doesn't exist.
    * @returns Global configuration object with current context and instance list
    */
   async loadGlobalConfig() {
      if (!fs.existsSync(configPath)) {
         return { currentContext: {}, instances: [] };
      }
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
   },

   async saveGlobalConfig(config) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
   },

   async loadInstanceConfig(instance) {
      const p = path.join(instancesDir, `${instance}.json`);
      if (!fs.existsSync(p)) throw new Error(`Instance config not found: ${instance}`);
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
   },

   async saveInstanceConfig(instance, data) {
      const p = path.join(instancesDir, `${instance}.json`);
      fs.writeFileSync(p, JSON.stringify(data, null, 2));
   },

   /**
    * Loads API token for the specified instance.
    * First checks for environment variable (XANO_TOKEN_INSTANCENAME), then falls back to token file.
    * @param instance - Instance name to load token for
    * @returns The API token string
    * @throws {Error} When token is not found in either location
    */
   async loadToken(instance) {
      const envVarName = `XANO_TOKEN_${instance.toUpperCase().replace(/-/g, '_')}`;
      const envToken = process.env[envVarName];
      if (envToken) {
         return envToken;
      }
      const p = path.join(tokensDir, `${instance}.token`);
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
    */
   async saveToken(instance, token) {
      const p = path.join(tokensDir, `${instance}.token`);
      fs.writeFileSync(p, token, { mode: 0o600 });
   },

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

         // Read all files in tempDir
         const files = await fs.promises.readdir(tempDir);
         for (const file of files) {
            if (file.endsWith('.yaml')) {
               result[file] = await fs.promises.readFile(join(tempDir, file));
            }
         }
      } finally {
         // Clean up tempDir here
         await fs.promises.rm(tempDir, { recursive: true });
      }

      return result;
   },
};
