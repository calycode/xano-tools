import { intro, log } from '@clack/prompts';
import type { CoreContext } from '@repo/types';
import {
   addFullContextOptions,
   fetchRegistryFileContent,
   getApiGroupByName,
   getRegistryItem,
   promptForComponents,
   scaffoldRegistry,
   sortFilesByType,
   withErrorHandler,
} from '../utils/index';
import { resolveConfigs } from '../utils/index';

async function addToXano({
   componentNames,
   context = {},
   core,
}: {
   componentNames: string[];
   context: CoreContext;
   core: any;
}): Promise<{
   installed: Array<{ component: string; file: string; response: any }>;
   failed: Array<{ component: string; file: string; error: string; response?: any }>;
   skipped: Array<any>;
}> {
   const { instanceConfig, workspaceConfig, branchConfig } = await resolveConfigs({
      cliContext: context,
      core,
   });

   intro('Adding components to your Xano instance:');

   if (!componentNames?.length) componentNames = (await promptForComponents()) as string[];

   const results = { installed: [], failed: [], skipped: [] };

   for (const componentName of componentNames) {
      try {
         const registryItem = await getRegistryItem(componentName);
         const sortedFiles = sortFilesByType(registryItem.files);
         for (const file of sortedFiles) {
            const installResult = await installComponentToXano(
               file,
               { instanceConfig, workspaceConfig, branchConfig },
               core
            );
            if (installResult.success) {
               results.installed.push({
                  component: componentName,
                  file: file.target || file.path,
                  response: installResult.body,
               });
            } else {
               results.failed.push({
                  component: componentName,
                  file: file.target || file.path,
                  error: installResult.error || 'Installation failed',
                  response: installResult.body,
               });
            }
         }
      } catch (error) {
         results.failed.push({ component: componentName, error: error.message });
      }
   }

   // --- Output summary table ---
   if (results.installed.length) {
      log.success('Installed components:');
      results.installed.forEach(({ component, file }) => {
         log.info(`${component}\nFile: ${file}\n---`);
      });
   }
   if (results.failed.length) {
      log.error('Failed components:');
      results.failed.forEach(({ component, file, error }) => {
         log.warn(`${component}\nFile: ${file}\nError: ${error}\n---`);
      });
   }
   if (!results.installed.length && !results.failed.length) {
      log.info('\nNo components were installed.');
   }

   return results;
}

/**
 * Installs a component file to Xano.
 *
 * @param {Object} file - The component file metadata.
 * @param {Object} resolvedContext - The resolved context configs.
 * @param {any} core - Core utilities.
 * @returns {Promise<{ success: boolean, error?: string, body?: any }>}
 */
async function installComponentToXano(file, resolvedContext, core) {
   const { instanceConfig, workspaceConfig, branchConfig } = resolvedContext;

   const urlMapping = {
      'registry:function': `workspace/${workspaceConfig.id}/function?branch=${branchConfig.label}`,
      'registry:table': `workspace/${workspaceConfig.id}/table`,
   };

   if (file.type === 'registry:query') {
      const targetApiGroup = await getApiGroupByName(
         file['api-group-name'],
         { instanceConfig, workspaceConfig, branchConfig },
         core
      );
      urlMapping[
         'registry:query'
      ] = `workspace/${workspaceConfig.id}/apigroup/${targetApiGroup.id}/api?branch=${branchConfig.label}`;
   }

   const xanoToken = await core.loadToken(instanceConfig.name);
   const xanoApiUrl = `${instanceConfig.url}/api:meta`;

   try {
      const content = await fetchRegistryFileContent(file.path);
      const response = await fetch(`${xanoApiUrl}/${urlMapping[file.type]}`, {
         method: 'POST',
         headers: {
            Authorization: `Bearer ${xanoToken}`,
            'Content-Type': 'text/x-xanoscript',
         },
         body: content,
      });

      let body;
      try {
         body = await response.json();
      } catch (jsonErr) {
         // If response is not JSON, treat as failure
         return {
            success: false,
            error: `Invalid JSON response: ${jsonErr.message}`,
         };
      }

      // 1. If HTTP error, always fail
      if (!response.ok) {
         return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText} - ${body?.message || ''}`,
            body,
         };
      }

      // 2. If "code" and "message" fields are present, treat as error (API-level error)
      if (body && body.code && body.message) {
         return {
            success: false,
            error: `${body.code}: ${body.message}`,
            body,
         };
      }

      // 3. If "xanoscript" is present and has a non-ok status, treat as error
      if (body && body.xanoscript && body.xanoscript.status !== 'ok') {
         return {
            success: false,
            error: `XanoScript error: ${body.xanoscript.message || 'Unknown error'}`,
            body,
         };
      }

      // If all checks pass, treat as success
      return { success: true, body };
   } catch (error) {
      // Only catch truly unexpected errors (network, programming, etc.)
      console.error(`Failed to install ${file.target || file.path}:`, error);
      return { success: false, error: error.message };
   }
}

function registerRegistryAddCommand(program, core) {
   const cmd = program
      .command('registry-add')
      .description(
         'Add a prebuilt component to the current Xano context, essentially by pushing an item from the registry to the Xano instance.'
      );

   addFullContextOptions(cmd);
   cmd.argument(
      '<components...>',
      'Space delimited list of components to add to your Xano instance.'
   );
   cmd.option(
      '--registry <url>',
      'URL to the component registry. Default: http://localhost:5500/registry/definitions'
   ).action(
      withErrorHandler(async (components, options) => {
         if (options.registry) {
            console.log('command registry option: ', options.registry);
            process.env.CALY_REGISTRY_URL = options.registry;
         }
         await addToXano({
            componentNames: components,
            context: {
               instance: options.instance,
               workspace: options.workspace,
               branch: options.branch,
            },
            core,
         });
      })
   );
}

function registerRegistryScaffoldCommand(program, core) {
   program
      .command('registry-scaffold')
      .description(
         'Scaffold a Xano registry folder with a sample component. Xano registry can be used to share and reuse prebuilt components. In the registry you have to follow the [registry](https://calycode.com/schemas/registry/registry.json) and [registry item](https://calycode.com/schemas/registry/registry-item.json) schemas.'
      )
      .option('--output <path>', 'Local output path for the registry')
      .option(
         '--instance <instance>',
         'The instance name. This is used to fetch the instance configuration. The value provided at the setup command.'
      )
      .action(
         withErrorHandler(async (options) => {
            await scaffoldRegistry({
               registryRoot: options.output,
            });
         })
      );
}

export { registerRegistryAddCommand, registerRegistryScaffoldCommand };
