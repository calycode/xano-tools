import { setupOpencode, serveOpencode, startNativeHost, proxyOpencode } from './implementation';

async function registerOpencodeCommands(program) {
   const opencodeNamespace = program
      .command('opencode')
      .alias('oc')
      .description('Manage OpenCode AI integration and tools.')
      .allowUnknownOption(); // Allow passing through unknown flags to the underlying CLI

   opencodeNamespace
      .command('init')
      .description(
         'Initialize OpenCode native host integration for use in the @calycode | extension.',
      )
      .action(async () => {
         // Uses all extension IDs from HOST_APP_INFO.allowedExtensionIds by default
         await setupOpencode();
      });

   opencodeNamespace
      .command('serve')
      .description('Serve the OpenCode AI server locally (alias for "xano serve opencode").')
      .option('--port <port>', 'Port to run the OpenCode server on (default: 4096)')
      .option('-d, --detach', 'Run the server in the background (detached mode)')
      .action(async (options) => {
         await serveOpencode({
            port: options.port ? parseInt(options.port, 10) : undefined,
            detach: options.detach,
         });
      });

   opencodeNamespace
      .command('native-host')
      .description(
         'Internal command used by Chrome Native Messaging to communicate with the extension.',
      )
      .action(async () => {
         // Redirect all console.log to console.error (stderr)
         // so they don't break the native messaging protocol
         console.log = console.error;
         console.info = console.error;
         await startNativeHost();
      });

   // Proxy all other commands to the underlying OpenCode CLI
   opencodeNamespace
      .command('run', { isDefault: true })
      .argument('[args...]', 'Arguments to pass to OpenCode CLI')
      .allowUnknownOption()
      .description('Run any OpenCode CLI command (default)')
      .action(async (args, command) => {
         // We need to reconstruct the arguments exactly.
         // 'args' captures the positional arguments.
         // But we also need flags.
         // Commander parses flags. To pass them raw is tricky with strict parsing.
         // By using .allowUnknownOption() on the parent and this command, we hope to capture them.
         // A safer way for a "passthrough" is often to inspect process.argv directly,
         // but let's try to trust the explicit args first or just grab the raw rest.

         // Actually, for a pure proxy where we want "xano opencode foo --bar",
         // "foo" becomes an arg, "--bar" might be parsed as an option if not careful.

         // Let's filter process.argv to find everything after "opencode".
         const rawArgs = process.argv;
         const opencodeIndex = rawArgs.indexOf('opencode');
         if (opencodeIndex === -1) {
            // Should not happen if we are here
            return;
         }

         const passThroughArgs = rawArgs.slice(opencodeIndex + 1);

         // Filter out our own known subcommands if they were accidentally matched?
         // No, if we are here, it's because it wasn't init/serve/native-host (mostly).
         // BUT 'run' is default, so 'xano opencode' (no args) also lands here.

         await proxyOpencode(passThroughArgs);
      });
}

export { registerOpencodeCommands };
