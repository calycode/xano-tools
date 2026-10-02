import { addFullContextOptions, withErrorHandler } from '../../utils';
import { addToXano, scaffoldRegistry } from './implementation/registry';

function registerRegistryCommands(program, core) {
   const registryNamespace = program
      .command('registry')
      .summary('Share and consume prebuilt Xano components')
      .description(
         'Registry related operations. Use this when you wish to add prebuilt components to your Xano instance.'
      );

   const registryAddCommand = registryNamespace
      .command('add')
      .summary('Add a prebuilt component to Xano')
      .description(
         'Add a prebuilt component to the current Xano context, essentially by pushing an item from the registry to the Xano instance.',
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
      .summary('Scaffold a registry folder with a sample component')
      .description(
         'Scaffold a Xano registry folder with a sample component. A registry has three parts:\n' +
            '  • index.json — the item list (each entry follows the registry item schema)\n' +
            '  • <type>/<name>.json — item descriptors (e.g. functions/hello-world.json)\n' +
            '  • components/<type>/<name>.xs — the actual source files that items point at\n' +
            'An item\'s files[].path points into components/; an item may instead carry inline content. See the registry and registry-item schemas at https://calycode.com/schemas/registry/.',
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
