// cli/node-config-storage.ts
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ConfigStorage } from '../types/config/config-storage';

const baseDir = path.join(os.homedir(), '.xano-community-cli');
const configPath = path.join(baseDir, 'config.json');
const instancesDir = path.join(baseDir, 'instances');
const tokensDir = path.join(baseDir, 'tokens');

export const nodeConfigStorage: ConfigStorage = {
   async ensureDirs() {
      [instancesDir, tokensDir].forEach((dir) => {
         if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      });
   },

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

   async loadToken(instance) {
      const envVarName = `XANO_TOKEN_${instance.toUpperCase().replace(/-/g, '_')}`;
      const envToken = process.env[envVarName];
      if (envToken) {
         return envToken;
      }
      const p = path.join(tokensDir, `${instance}.token`);
      if (!fs.existsSync(p)) {
         throw new Error(
            `Token not found for instance: ${instance}. Please provide it via the ${envVarName} environment variable or run 'xcc setup'.`
         );
      }
      return fs.readFileSync(p, 'utf-8').trim();
   },

   async saveToken(instance, token) {
      const p = path.join(tokensDir, `${instance}.token`);
      fs.writeFileSync(p, token, { mode: 0o600 });
   },

   // ----- FILESYSTEM OPS -----
   async mkdir(dirPath, options) {
      await fs.promises.mkdir(dirPath, options);
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
};
