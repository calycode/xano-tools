import fs from 'fs';
import path from 'path';
import { configPath, instancesDir, tokensDir } from './paths.js';

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
   const p = path.join(tokensDir, `${instance}.token`);
   if (!fs.existsSync(p)) throw new Error(`Token not found for instance: ${instance}`);
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
