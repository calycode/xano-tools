import { intro, log } from '@clack/prompts';
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
import type { CoreContext } from '@calycode/types';

async function addToXano({
   componentNames,
   context = {},
   core,
}: {
   componentNames: string[];
   context: CoreContext;
   core: any;
}) {
   // [ ] !!! fix: to use the context resolver !!!!
   const startDir = process.cwd();
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance: context.instance,
      workspace: context.workspace,
      branch: context.branch,
      startDir,
   });

   intro('Add components to your Xano instance');

   if (!componentNames?.length) componentNames = (await promptForComponents()) as string[];

   const results = { installed: [], failed: [], skipped: [] };

   for (const componentName of componentNames) {
      try {
         const registryItem = await getRegistryItem(componentName);
         const sortedFiles = sortFilesByType(registryItem.files);
         for (const file of sortedFiles) {
            const success = await installComponentToXano(
               file,
               {
                  instanceConfig,
                  workspaceConfig,
                  branchConfig,
               },
               core
            );
            if (success)
               results.installed.push({ component: componentName, file: file.target || file.path });
            else
               results.failed.push({
                  component: componentName,
                  file: file.target || file.path,
                  error: 'Installation failed',
               });
         }
         log.step(`Installed: ${componentName}`);
      } catch (error) {
         results.failed.push({ component: componentName, error: error.message });
      }
   }
   return results;
}

// [ ] CORE
/**
 * Function that creates the required components in Xano.
 *
 * @param {*} file
 * @param {*} resolvedContext
 * @returns {Boolean} - success: true, failure: false
 */
async function installComponentToXano(file, resolvedContext, core) {
   const { instanceConfig, workspaceConfig, branchConfig } = resolvedContext;

   const urlMapping = {
      'registry:function': `workspace/${workspaceConfig.id}/function?branch=${branchConfig.label}`,
      'registry:table': `workspace/${workspaceConfig.id}/table`,
   };

   // If query, extend the default urlMapping with the populated query creation API group.
   if (file.type === 'registry:query') {
      const targetApiGroup = await getApiGroupByName(
         file['api-group-name'],
         {
            instanceConfig,
            workspaceConfig,
            branchConfig,
         },
         core
      );

      urlMapping[
         'registry:query'
      ] = `workspace/${workspaceConfig.id}/apigroup/${targetApiGroup.id}/api?branch=${branchConfig.label}`;
   }

   const xanoToken = await core.loadToken(instanceConfig.name);
   const xanoApiUrl = `${instanceConfig.url}/api:meta`;

   try {
      // [ ] TODO: implement override checking. For now just try the POST and Xano will throw error anyways...

      // Fetch the text content of the registry file (xano-script)
      const content = await fetchRegistryFileContent(file.path);

      const response = await fetch(`${xanoApiUrl}/${urlMapping[file.type]}`, {
         method: 'POST',
         headers: {
            Authorization: `Bearer ${xanoToken}`,
            'Content-Type': 'text/x-xanoscript',
         },
         body: content,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return true;
   } catch (error) {
      console.error(`Failed to install ${file.target || file.path}:`, error);
      return false;
   }
}

function registerRegistryAddCommand(program, core) {
   const cmd = program
      .command('registry-add')
      .description('Add a prebuilt component to the current Xano context.');

   addFullContextOptions(cmd);
   cmd.option('--components', 'Comma-separated list of components to add')
      .option(
         '--registry <url>',
         'URL to the component registry. Default: http://localhost:5500/registry/definitions'
      )
      .action(
         withErrorHandler(async (options) => {
            if (options.registry) {
               process.env.Caly_REGISTRY_URL = options.registry;
            }

            await addToXano({
               componentNames: options.components,
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
         'Scaffold a Xano registry folder with a sample component. Xano registry can be used to share and reuse prebuilt components. In the registry you have to follow the [registry](https://nextcurve.hu/schemas/registry/registry.json) and [registry item](https://nextcurve.hu/schemas/registry/registry-item.json) schemas.'
      )
      .option('--output <path>', 'Output path for the registry')
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
