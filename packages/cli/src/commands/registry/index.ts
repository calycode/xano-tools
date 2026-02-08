import { addFullContextOptions, withErrorHandler } from '../../utils';
import { addToXano, scaffoldRegistry } from './implementation/registry';

function registerRegistryCommands(program, core) {
   const registryNamespace = program
      .command('registry')
      .description(
         'Registry related operations. Use this when you wish to add prebuilt components to your Xano instance.'
      );

   const registryAddCommand = registryNamespace
      .command('add')
      .description(
         'Add a prebuilt component to the current Xano context, essentially by pushing an item from the registry to the Xano instance.'
      );

   addFullContextOptions(registryAddCommand);
    registryAddCommand.argument(
       '[components...]',
       'Space delimited list of components to add to your Xano instance.'
    );
   registryAddCommand
      .option(
         '--registry <url>',
         'URL to the component registry. Default: http://localhost:5500/registry/definitions'
      )
      .action(
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

   // Also add the scaffolding command.
   registryNamespace
      .command('scaffold')
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

export { registerRegistryCommands };
