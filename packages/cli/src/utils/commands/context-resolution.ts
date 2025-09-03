import path from 'path';
import fs from 'fs';

const DEFAULT_LOCAL_CONFIG_SUBDIR = '.xano-tools';
const DEFAULT_LOCAL_CONFIG_FILE = 'cli.config.json';

/**
 * Finds and loads local CoreContext config from cwd or parent dirs.
 * Returns null if not found.
 */
function resolveLocalCliContext(startDir = process.cwd()) {
   let dir = startDir;
   while (dir !== path.dirname(dir)) {
      const configPath = path.join(dir, DEFAULT_LOCAL_CONFIG_SUBDIR, DEFAULT_LOCAL_CONFIG_FILE);
      if (fs.existsSync(configPath)) {
         try {
            const data = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(data); // Should be CoreContext shape: {instance, workspace, branch}
         } catch (err) {
            console.warn(`⚠️  Failed to parse local CLI context at ${configPath}:`, err);
            return null;
         }
      }
      dir = path.dirname(dir);
   }
   return null;
}

async function resolveEffectiveContext(opts, core) {
   // 1. CLI args take precedence
   const cliContext = {
      instance: opts.instance,
      workspace: opts.workspace,
      branch: opts.branch,
      apigroup: opts.apigroup,
   };

   // 2. Local config (if present)
   const localContext = resolveLocalCliContext();

   // 3. Global config fallback
   const globalConfig = await core.storage.loadGlobalConfig();
   const globalContext = globalConfig.currentContext || {};

   // Merge with priority: CLI > local > global
   return {
      instance: cliContext.instance ?? localContext?.instance ?? globalContext.instance ?? null,
      workspace: cliContext.workspace ?? localContext?.workspace ?? globalContext.workspace ?? null,
      branch: cliContext.branch ?? localContext?.branch ?? globalContext.branch ?? null,
      apigroup: cliContext.apigroup ?? localContext?.apigroup ?? globalContext.apigroup ?? null,
   };
}

export { resolveEffectiveContext };
