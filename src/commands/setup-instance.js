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

   // Save instance config
   saveInstanceConfig(name, {
      name,
      url,
      tokenFile: `../tokens/${name}.token`,
      lint: {
         rules: defaultLintRules,
      },
      process: {
         output: 'output/{instance}/repo/{workspace}',
      },
      openApiSpec: {
         output: 'output/{instance}/oas/{workspace}/{api_group_normalized_name}.json',
      },
      workspaces,
   });

   // Register in global config
   const global = loadGlobalConfig();
   if (!global.instances.includes(name)) global.instances.push(name);

   // Optionally set as current context
   let setAsCurrent = true;
   if (global.currentContext?.instance && global.currentContext.instance !== name) {
      setAsCurrent = await confirm({
         message: `Set "${name}" as your current context?`,
         initialValue: true,
      });
   }
   if (setAsCurrent) {
      // Pick the first workspace as default, if available
      const wsNames = Object.keys(workspaces);
      global.currentContext = {
         instance: name,
         workspace: wsNames.length ? wsNames[0] : null,
      };
   }
   saveGlobalConfig(global);

   outro(
      `🚀 Instance "${name}" added! Workspaces fetched from Xano. Use switch-context to change.\n`
   );
}
