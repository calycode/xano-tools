import { intro, text, password, spinner, outro, log, confirm } from '@clack/prompts';
import {
   ensureDirs,
   loadGlobalConfig,
   saveGlobalConfig,
   saveInstanceConfig,
   saveToken,
} from '../config/loaders.js';
import { ensureGitignore } from '../utils/version-control/safeVersionControl.js';
import { sanitizeInstanceName } from '../utils/sanitize.js';
import { metaApiGet } from '../utils/metadata/api-helper.js';

// DEFAULT SETTINGS:
const defaultLintRules = {
   'is-valid-verb': 'error',
   'is-camel-case': 'warn',
   'is-description-present': 'warn',
};

export async function setupInstanceWizard() {
   intro('✨ Xano CLI Instance Setup ✨');
   ensureDirs();
   ensureGitignore();

   // Gather info
   const name = (
      await text({ message: 'Name this Xano instance (e.g. prod, staging, client-a):' })
   ).trim();

   const safeName = sanitizeInstanceName(name);

   if (!safeName) {
      log.error('Instance name must contain at least one letter or number.');
      outro();
      return;
   }

   if (safeName !== name) {
      log.info(`Using "${safeName}" as the instance key.`);
   }

   const url = (await text({ message: `What's the base URL for "${name}"?` })).trim();
   const apiKey = await password({ message: `Enter the Metadata API key for "${name}":` });

   log.step('Storing credentials...');

   // Save token
   saveToken(name, apiKey);

   // Prepare spinner for workspace fetch
   const s = spinner();
   s.start('Fetching workspaces from Xano...');

   // Fetch workspaces using Meta API
   const workspaces = await metaApiGet({
      baseUrl: url,
      token: apiKey,
      path: '/workspace',
   });

   s.stop('Workspaces fetched!');

   s.start('Fetching branch information for each workspace...');

   for (const ws of workspaces) {
      const branches = await metaApiGet({
         baseUrl: url,
         token: apiKey,
         path: `/workspace/${ws.id}/branch`,
      });
      // Filter out backup branches
      ws.branches = branches.filter((b) => !b.backup);
   }

   s.stop('Branch information fetched!');

   // Save instance config
   saveInstanceConfig(name, {
      name,
      url,
      tokenFile: `../tokens/${name}.token`,
      lint: {
         rules: defaultLintRules,
      },
      process: {
         output: 'output/{instance}/repo/{workspace}/{branch}',
      },
      openApiSpec: {
         output: 'output/{instance}/oas/{workspace}/{branch}/{api_group_normalized_name}',
      },
      workspaces,
   });

   // Register in global config
   const global = loadGlobalConfig();
   if (!global.instances.includes(name)) global.instances.push(name);

   // Optionally set as current context
   let setAsCurrent = true;
   if (global.currentContext?.instance && global.currentContext.instance !== safeName) {
      setAsCurrent = await confirm({
         message: `Set "${name}" as your current context?`,
         initialValue: true,
      });
   }
   if (setAsCurrent) {
      global.currentContext = {
         instance: safeName,
         workspace: workspaces.length ? workspaces[0].id : null,
         branch:
            workspaces.length && workspaces[0].branches.length
               ? workspaces[0].branches[0].label
               : null,
      };
   }
   saveGlobalConfig(global);

   outro(
      `🚀 Instance "${name}" added! Workspaces fetched from Xano. Use switch-context to change.\n`
   );
}
