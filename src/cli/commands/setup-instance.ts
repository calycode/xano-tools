import { intro, text, password, outro, log, confirm } from '@clack/prompts';
import {
   ensureDirs,
   loadGlobalConfig,
   saveGlobalConfig,
   saveInstanceConfig,
   saveToken,
} from '../config/loaders';
import {
   ensureGitignore,
   fetchWorkspacesAndBranches,
   sanitizeInstanceName,
   withErrorHandler,
   withSpinner,
} from '../utils/index';

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

// [ ] CORE, needs fs
/**
 * The core, non-interactive logic for setting up an instance.
 * Can be called by the interactive wizard or directly for CI/CD.
 * @param {object} options
 * @param {string} options.name - The user-provided name for the instance.
 * @param {string} options.url - The instance base URL.
 * @param {string} options.apiKey - The Metadata API key.
 * @param {boolean} [options.setAsCurrent=true] - Whether to set this as the current context.
 */
async function setupInstance({ name, url, apiKey, setAsCurrent = true }) {
   // 1. Sanitize and validate name
   const safeName = sanitizeInstanceName(name);
   if (!safeName) {
      throw new Error('Instance name must contain at least one letter or number.');
   }
   if (safeName !== name) {
      log.info(`Using "${safeName}" as the instance key.`);
   }

   // 2. Health checks and setup
   ensureDirs();
   ensureGitignore();

   // 3. Store credentials
   saveToken(safeName, apiKey);
   log.step(`Stored credentials for "${safeName}".`);

   // 4. Fetch workspaces and branches
   const workspaces = await withSpinner(
      `Fetching workspaces and branches for "${safeName}"...`,
      () => fetchWorkspacesAndBranches({ url, apiKey })
   );

   // 5. Save instance config
   saveInstanceConfig(safeName, {
      name: safeName,
      url,
      lint: {
         output: 'output/{instance}/lint/{workspace}/{branch}',
         rules: DEFAULT_LINT_RULES,
      },
      test: {
         output: 'output/{instance}/tests/{workspace}/{branch}/{api_group_normalized_name}',
         headers: {
            'X-Branch': '{branch}',
            'X-Data-Source': 'test',
         },
         defaultAsserts: DEFAULT_ASSERTS,
      },
      process: {
         output: 'output/repo/{instance}/{workspace}/{branch}',
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
      registry: {
         output: 'registry',
      },
      workspaces,
   });
   log.step('Stored instance configuration.');

   // 6. Register in global config
   const global = loadGlobalConfig();
   if (!global.instances.includes(safeName)) {
      global.instances.push(safeName);
   }

   // 7. Optionally set as current context
   if (setAsCurrent) {
      global.currentContext = {
         instance: safeName,
         workspace: workspaces.length ? workspaces[0].id : null,
         branch:
            workspaces.length && workspaces[0].branches.length
               ? workspaces[0].branches[0].label
               : null,
      };
      log.step(`Set "${safeName}" as the current context.`);
   }
   saveGlobalConfig(global);

   outro(`🚀 Instance "${safeName}" configured! Use 'xcc switch-context' to change.`);
}

// [ ] CLI
async function setupInstanceWizard() {
   intro('✨ Xano CLI Instance Setup ✨');

   // Gather info from user
   // [ ] TODO: update the .trim() implementation in order to have clearer types.
   // [ ] TODO: actually wrap the clack.cc methods into custom wrapper to return proper types and avoid .ts errors...
   const name = (
      (await text({
         message: 'Name this Xano instance (e.g. prod, staging, client-a):',
      })) as string
   ).trim();
   const url = ((await text({ message: `What's the base URL for "${name}"?` })) as string).trim();
   const apiKey = await password({ message: `Enter the Metadata API key for "${name}":` });

   // Check if we should set it as the current context
   const global = loadGlobalConfig();
   const { currentContext } = global;
   let setAsCurrent = true;
   if (currentContext?.instance && currentContext.instance !== sanitizeInstanceName(name)) {
      setAsCurrent = (await confirm({
         message: `Set "${name}" as your current context?`,
         initialValue: true,
      })) as boolean;
   }

   // Run the core setup logic
   await setupInstance({ name, url, apiKey, setAsCurrent });
}

// [ ] CLI
export function registerSetupCommand(program) {
   program
      .command('setup')
      .description('Setup Xano instance configurations (interactively or via flags)')
      .option('--name <name>', 'Instance name (for non-interactive setup)')
      .option('--url <url>', 'Instance base URL (for non-interactive setup)')
      .option('--token <token>', 'Metadata API token (for non-interactive setup)')
      .option('--no-set-current', 'Do not set this instance as the current context')
      .action(
         withErrorHandler(async (opts) => {
            if (opts.name && opts.url && opts.token) {
               // Non-interactive mode for CI/CD
               await setupInstance({
                  name: opts.name,
                  url: opts.url,
                  apiKey: opts.token,
                  setAsCurrent: opts.setCurrent, // commander turns --no-set-current to setCurrent: false
               });
            } else {
               // Interactive wizard for local development
               await setupInstanceWizard();
            }
         })
      );
}
