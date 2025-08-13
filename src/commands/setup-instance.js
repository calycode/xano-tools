import { intro, text, password, outro, log, confirm } from '@clack/prompts';
import {
   ensureDirs,
   loadGlobalConfig,
   saveGlobalConfig,
   saveInstanceConfig,
   saveToken,
} from '../config/loaders.js';
import {
   ensureGitignore,
   fetchWorkspacesAndBranches,
   sanitizeInstanceName,
   withErrorHandler,
   withSpinner,
} from '../utils/index.js';

// DEFAULT SETTINGS:
const DEFAULT_LINT_RULES = {
   'is-valid-verb': 'error',
   'is-camel-case': 'warn',
   'is-description-present': 'warn',
};

const DEFAULT_ASSERTS = {
   statusOk: 'error',
   responseDefined: 'error',
   responseSchema: 'warn',
};

async function setupInstanceWizard() {
   intro('✨ Xano CLI Instance Setup ✨');

   // 1. Make sure the core repo setup is healthy:
   ensureDirs();
   ensureGitignore();

   // 2. Gather info
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

   // 3. Store credentials.
   saveToken(name, apiKey);
   log.step('Stored credentials.');

   // 4. Fetch workspaces and branches with spinner
   const workspaces = await withSpinner('Fetching workspaces and branches from Xano.', () =>
      fetchWorkspacesAndBranches({ url, apiKey })
   );

   // 5. Save instance config
   saveInstanceConfig(name, {
      name,
      url,
      tokenFile: `../tokens/${name}.token`,
      lint: {
         output: 'output/{instance}/lint/{workspace}/{branch}',
         rules: DEFAULT_LINT_RULES,
      },
      test: {
         output: 'output/{instance}/tests/{workspace}/{branch}/{group}',
         headers: {
            'X-Branch': '{branch}',
            'X-Data-Source': 'test',
         },
         DEFAULT_ASSERTS,
      },
      process: {
         output: 'output/{instance}/repo/{workspace}/{branch}',
      },
      'xano-script': {
         output: 'output/{instance}/xano-script/{workspace}/{branch}',
      },
      openApiSpec: {
         output: 'output/{instance}/oas/{workspace}/{branch}/{api_group_normalized_name}',
      },
      backups: {
         output: 'output/{instance}/backups/{workspace}/{branch}',
      },
      workspaces,
   });
   log.step('Stored instance configuration.');

   // 6. Register in global config
   const global = loadGlobalConfig();
   const { currentContext } = global;
   if (!global.instances.includes(name)) global.instances.push(name);

   // 7. Optionally set as current context
   let setAsCurrent = true;
   if (currentContext?.instance && currentContext.instance !== safeName) {
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

export function registerSetupCommand(program) {
   program
      .command('setup')
      .description('Setup Xano Community CLI configurations')
      .action(
         withErrorHandler(async () => {
            await setupInstanceWizard();
         })
      );
}
