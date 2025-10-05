import { ConfigStorage, AssertDefinition } from '@repo/types';
import { sanitizeInstanceName, fetchWorkspacesAndBranches } from '@repo/utils';

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
      projectRoot: string;
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

   const instanceConfig = {
      name: safeName,
      url,
      tokenRef: safeName,
      lint: {
         output: '{@}/{workspace}/{branch}/lint',
         rules: DEFAULT_LINT_RULES,
      },
      test: {
         output: '{@}/{workspace}/{branch}/tests/{api_group_normalized_name}',
         headers: {
            'X-Branch': '{branch}',
            'X-Data-Source': 'test',
         },
         defaultAsserts: DEFAULT_ASSERTS,
      },
      process: {
         output: '{@}/{workspace}/{branch}/src',
      },
      xanoscript: {
         output: '{@}/{workspace}/{branch}/xanoscript',
      },
      openApiSpec: {
         output: '{@}/{workspace}/{branch}/oas/{api_group_normalized_name}',
      },
      codegen: {
         output: '{@}/{workspace}/{branch}/codegen/{api_group_normalized_name}',
      },
      backups: {
         output: '{@}/{workspace}/{branch}/backups',
      },
      registry: {
         output: '{@}/registry',
      },
      workspaces,
   };

   // 5. Setup the whole directory for each workspace and it's branches as well:
   // 5.1: Workspaces directory creation
   const workspaceDirMap = {};

   await Promise.all(
      workspaces.map(async (workspace) => {
         const workspaceCleanName = sanitizeInstanceName(workspace.name);
         const workspaceDir = `${options.projectRoot}/${workspaceCleanName}`;
         workspaceDirMap[workspace.name] = workspaceDir;
         await storage.mkdir(workspaceDir, { recursive: true });
         await storage.writeFile(
            `${workspaceDir}/workspace.config.json`,
            JSON.stringify(workspace, null, 2)
         );
      })
   );

   // 5.2: Branches directory creation
   await Promise.all(
      workspaces.map(async (workspace) => {
         const workspaceDir = workspaceDirMap[workspace.name];
         await Promise.all(
            workspace.branches.map(async (branch) => {
               const branchDir = `${workspaceDir}/${branch.label}`;
               await storage.mkdir(branchDir, { recursive: true });
               await storage.writeFile(
                  `${branchDir}/branch.config.json`,
                  JSON.stringify(branch, null, 2)
               );
            })
         );
      })
   );

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

   // 8. Set up the local context and config file, that can help with context resolution
   // when the projectRoot input is a blank string, then the local config goes into the './xano-tools/' path
   await storage.saveInstanceConfig(options.projectRoot, instanceConfig);

   await storage.saveGlobalConfig(global);
}
