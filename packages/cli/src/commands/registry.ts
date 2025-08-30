import { intro, log } from '@clack/prompts';
import {
   addFullContextOptions,
   fetchRegistryFileContent,
   getRegistryItem,
   promptForComponents,
   scaffoldRegistry,
   sortFilesByType,
   withErrorHandler,
} from '../utils/index';

// [ ] CORE
async function addToXano(
   componentNames: string[],
   context: { instance?: string; workspace?: string; branch?: string } = {},
   core
) {
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance: context.instance,
      workspace: context.workspace,
      branch: context.branch,
   });

   intro('Add components to your Xano instance');

   if (!componentNames?.length) componentNames = (await promptForComponents()) as string[];

   const results = { installed: [], failed: [], skipped: [] };

   for (const componentName of componentNames) {
      try {
         const registryItem = await getRegistryItem(componentName);
         const sortedFiles = sortFilesByType(registryItem.files);
         for (const file of sortedFiles) {
            // extract into the 'content' key
            file.content = await fetchRegistryFileContent(file.path);

            const success = await core.installXanoscriptToXano(file, {
               instance: instanceConfig.name,
               workspace: workspaceConfig.name,
               branch: branchConfig.label,
            });

            if (success) {
               results.installed.push({ component: componentName, file: file.target || file.path });
            } else {
               results.failed.push({
                  component: componentName,
                  file: file.target || file.path,
                  error: 'Installation failed',
               });
            }
         }
         log.step(`Installed: ${componentName}`);
      } catch (error) {
         results.failed.push({ component: componentName, error: error.message });
      }
   }
   return results;
}

// [ ] CLI
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

            await addToXano(
               options.components,
               {
                  instance: options.instance,
                  workspace: options.workspace,
                  branch: options.branch,
               },
               core
            );
         })
      );
}

// [ ] CLI
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
               outputPath: options.output,
               instance: options.instance,
               core,
            });
         })
      );
}

export { registerRegistryAddCommand, registerRegistryScaffoldCommand };
