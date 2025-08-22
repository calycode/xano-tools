import fs from 'fs';
import path from 'path';
import { configPath, instancesDir, tokensDir } from './paths';

/**
 * This is the crucial part to be rewritten to allow use of consumers. So this is part of the core
 */
// [ ] CORE
function ensureDirs() {
   [instancesDir, tokensDir].forEach((dir) => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
   });
}

function loadGlobalConfig() {
   if (!fs.existsSync(configPath)) {
      return { currentContext: {}, instances: [] };
   }
   return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

function saveGlobalConfig(config) {
   fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

function loadInstanceConfig(instance) {
   const p = path.join(instancesDir, `${instance}.json`);
   if (!fs.existsSync(p)) throw new Error(`Instance config not found: ${instance}`);
   return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function saveInstanceConfig(instance, data) {
   const p = path.join(instancesDir, `${instance}.json`);
   fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function loadToken(instance) {
   // 1. Check for environment variable first.
   // This allows for non-interactive use in CI/CD environments.
   // e.g., for instance 'prod', it checks for XANO_TOKEN_PROD
   const envVarName = `XANO_TOKEN_${instance.toUpperCase().replace(/-/g, '_')}`;
   const envToken = process.env[envVarName];
   if (envToken) {
      return envToken;
   }

   // 2. Fallback to file-based token for local development
   const p = path.join(tokensDir, `${instance}.token`);
   if (!fs.existsSync(p)) {
      throw new Error(
         `Token not found for instance: ${instance}. Please provide it via the ${envVarName} environment variable or run 'xcc setup'.`
      );
   }
   return fs.readFileSync(p, 'utf-8').trim();
}

function saveToken(instance, token) {
   const p = path.join(tokensDir, `${instance}.token`);
   fs.writeFileSync(p, token, { mode: 0o600 });
}

export {
   ensureDirs,
   loadGlobalConfig,
   saveGlobalConfig,
   loadInstanceConfig,
   saveInstanceConfig,
   loadToken,
   saveToken,
};
