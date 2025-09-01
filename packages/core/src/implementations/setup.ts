import { ConfigStorage, AssertDefinition } from '@calycode/types';
import { sanitizeInstanceName, fetchWorkspacesAndBranches } from '@calycode/utils';

// DEFAULT SETTINGS:
const DEFAULT_LINT_RULES: Record<string, 'error' | 'warn' | 'off'> = {
   'is-valid-verb': 'error',
   'is-camel-case': 'warn',
   'is-description-present': 'warn',
};

const DEFAULT_ASSERTS: AssertDefinition = {
   statusOk: { level: 'error' },
   responseDefined: { level: 'error' },
   responseSchema: { level: 'warn' },
};

/**
 * The core, non-interactive logic for setting up an instance.
 * Can be called by the interactive wizard or directly for CI/CD.
 * @param {ConfigStorage} storage - The actual storage implementation provided by the consumer on Caly class instentiation
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
   }

   // 2. Health checks and setup
   await storage.ensureDirs();

   // 3. Store credentials
   await storage.saveToken(safeName, apiKey);

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
         output: 'output/{instance}/repo/{workspace}/{branch}',
      },
      xanoscript: {
         output: 'output/{instance}/xanoscript/{workspace}/{branch}',
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
   }
   await storage.saveGlobalConfig(global);
}
