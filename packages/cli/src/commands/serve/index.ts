import { addApiGroupOptions, addFullContextOptions } from '../../utils';
import { serveOas, serveRegistry } from './implementation/serve';
import { serveOpencode } from './implementation/opencode';

function registerServeCommands(program, core) {
   const serveNamespace = program
      .command('serve')
      .description('Serve locally available assets for quick preview or local reuse.');

   // Add the registry.
   serveNamespace
      .command('registry')
      .description(
         'Serve the registry locally. This allows you to actually use your registry without deploying it to any remote host.'
      )
      .option(
         '--root <path>',
         'Where did you put your registry? (Local path to the registry directory)'
      )
      .option(
         '--listen <port>',
         'The port where you want your registry to be served locally. By default it is 5000.'
      )
      .option('--cors', 'Do you want to enable CORS? By default false.')
      .action((options) => {
         serveRegistry({
            root: options.root,
            listen: options.listen,
            cors: options.cors,
         });
      });

   // Add the specification serving
   const specCommand = serveNamespace
      .command('spec')
      .description(
         'Serve the Open API specification locally for quick visual check, or to test your APIs via the Scalar API reference.'
      );
   addFullContextOptions(specCommand);
   addApiGroupOptions(specCommand);
   specCommand
      .option(
         '--listen <port>',
         'The port where you want your registry to be served locally. By default it is 5000.'
      )
      .option('--cors', 'Do you want to enable CORS? By default false.')
      .action((options) => {
         serveOas({
            instance: options.instance,
            workspace: options.workspace,
            branch: options.branch,
            group: options.group,
            listen: options.listen,
            cors: options.cors,
            core,
         });
      });

    // Add OpenCode serving
    serveNamespace
        .command('opencode')
        .description('Serve the OpenCode AI server locally.')
        .option('--port <port>', 'Port to run the OpenCode server on (default: 4096)')
        .action((options) => {
            serveOpencode({
                port: options.port ? parseInt(options.port, 10) : undefined,
            });
        });
}

export { registerServeCommands };

