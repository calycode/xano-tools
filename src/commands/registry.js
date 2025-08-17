import { intro, log } from '@clack/prompts';
import {
   addFullContextOptions,
   fetchRegistryFileContent,
   getRegistryItem,
   loadAndValidateContext,
   promptForComponents,
   scaffoldRegistry,
   sortFilesByType,
   withErrorHandler,
} from '../utils/index.js';
import { loadToken } from '../config/loaders.js';

async function addToXano(componentNames, context = {}) {
   const { instanceConfig, workspaceConfig, branchConfig } = loadAndValidateContext({
      instance: context.instance,
      workspace: context.workspace,
      branch: context.branch,
   });

   intro('Add components to your Xano instance');

   if (!componentNames?.length) componentNames = await promptForComponents();

   const results = { installed: [], failed: [], skipped: [] };

   for (const componentName of componentNames) {
      try {
         const registryItem = await getRegistryItem(componentName);
         // [ ] TODO: add sorting of registry item files where the table is the first, function comes second and queries come last
         const sortedFiles = sortFilesByType(registryItem.files);
         for (const file of sortedFiles) {
            const success = await installComponentToXano(file, {
               instanceConfig,
               workspaceConfig,
               branchConfig,
            });
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

/**
 * Function that creates the required components in Xano.
 * WIP: queries are to be done.
 *
 * @param {*} file
 * @param {*} resolvedContext
 * @returns {Boolean} - success: true, failure: false
 */
async function installComponentToXano(file, resolvedContext) {
   const { instanceConfig, workspaceConfig, branchConfig } = resolvedContext;

   //[ ] TODO: add 'registry:query' url, but that needs to also take into account the existence of a target api group.
   // So in order to add 'query' we need to also do a 'check existing api groups > find the currently provided name > select the id || create new api group with provided name > select id' and then proceed.
   // When query is added, remove the if()
   if (file.type === 'registry:query') return false;
   const urlMapping = {
      'registry:function': `workspace/${workspaceConfig.id}/function?branch=${branchConfig.label}`,
      'registry:table': `workspace/${workspaceConfig.id}/table`,
   };
   const xanoToken = loadToken(instanceConfig.name);
   const xanoApiUrl = `${instanceConfig.url}/api:meta`;

   try {
      // [ ] TODO: implement override checking. For now just try the POST and Xano will throw error anyways...
      /*
      if (!overwrite) {
         const existsResponse = await fetch(`${xanoApiUrl}/metadata/${file.target || file.path}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${xanoToken}`, 'Content-Type': 'application/json' },
         });
         if (existsResponse.ok) {
            console.log(`File ${file.target || file.path} already exists, skipping...`);
            return false;
         }
      }
*/

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

function registerRegistryAddCommand(program) {
   const cmd = program
      .command('registry-add')
      .description('Add a prebuilt component to the current Xano context.');

   addFullContextOptions(cmd);
   cmd.option('--components', 'Comma-separated list of components to add')
      .option(
         '--registry <url>',
         'URL to the component registry. Default: http://localhost:5500/registry-definitions'
      )
      .action(
         withErrorHandler(async (options) => {
            if (options.registry) {
               process.env.XCC_REGISTRY_URL = options.registry;
            }

            await addToXano(options.components, {
               instance: options.instance,
               workspace: options.workspace,
               branch: options.branch,
            });
         })
      );
}

function registerRegistryScaffoldCommand(program) {
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
               outputPath: options.output,
               instance: options.instance,
            });
         })
      );
}

export { registerRegistryAddCommand, registerRegistryScaffoldCommand };
