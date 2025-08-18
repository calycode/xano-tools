import { spawn } from 'child_process';

function serveRegistry({ root = 'registry', listen = 5000, cors = false }) {
   return new Promise<void>((resolve, reject) => {
      const serveArgs = [String(root), '-l', String(listen)];
      if (cors) serveArgs.push('-C');

      const cliArgs = ['serve', ...serveArgs];

      const proc = spawn('npx', cliArgs, { stdio: 'inherit', shell: true });

      proc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            reject(new Error(`serve exited with code ${code}`));
         }
      });
      proc.on('error', (err) => {
         reject(new Error(`Failed to start serve: ${err.message}`));
      });
   });
}

function registerRegistryServeCommand(program) {
   program
      .command('registry-serve')
      .description(
         'Serve the registry locally. This allows you to actually use your registry without deploying it.'
      )
      .option('--root <path>', 'Where did you put your registry?')
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
}

export { registerRegistryServeCommand };
