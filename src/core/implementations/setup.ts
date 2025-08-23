import { outro, log } from '@clack/prompts';
import { ConfigStorage } from '../../types';
import { sanitizeInstanceName, fetchWorkspacesAndBranches } from '../utils';

// DEFAULT SETTINGS:
const DEFAULT_LINT_RULES: Record<string, 'error' | 'warn' | 'off'> = {
   'is-valid-verb': 'error',
   'is-camel-case': 'warn',
   'is-description-present': 'warn',
};

const DEFAULT_ASSERTS: Record<string, 'error' | 'warn' | 'off'> = {
   statusOk: 'error',
   responseDefined: 'error',
   responseSchema: 'warn',
};

/**
 * The core, non-interactive logic for setting up an instance.
 * Can be called by the interactive wizard or directly for CI/CD.
 * @param {ConfigStorage} storage - The actual storage implementation provided by the consumer on XCC class instentiation
 * @param {object} options
 * @param {string} options.name - The user-provided name for the instance.
 * @param {string} options.url - The instance base URL.
 * @param {string} options.apiKey - The Metadata API key.
 * @param {boolean} [options.setAsCurrent=true] - Whether to set this as the current context.
 */
export async function setupInstanceImplementation(
   storage: ConfigStorage,
   options: {
      name: string;
      url: string;
      apiKey: string;
      setAsCurrent?: boolean;
   }
) {
   const { name, url, apiKey, setAsCurrent = true } = options;
   // 1. Sanitize and validate name
   const safeName = sanitizeInstanceName(name);
   if (!safeName) {
      throw new Error('Instance name must contain at least one letter or number.');
   }
   if (safeName !== name) {
      log.info(`Using "${safeName}" as the instance key.`);
   }

   // 2. Health checks and setup
   await storage.ensureDirs();

   // 3. Store credentials
   await storage.saveToken(safeName, apiKey);
   log.step(`Stored credentials for "${safeName}".`);

   // 4. Fetch workspaces and branches
   const workspaces = await fetchWorkspacesAndBranches({ url, apiKey });

   // 5. Save instance config
   await storage.saveInstanceConfig(safeName, {
      name: safeName,
      url,
      tokenFile: `../tokens/${safeName}.token`,
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
   const global = await storage.loadGlobalConfig();
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
   await storage.saveGlobalConfig(global);

   outro(`🚀 Instance "${safeName}" configured! Use 'xcc switch-context' to change.`);
}
