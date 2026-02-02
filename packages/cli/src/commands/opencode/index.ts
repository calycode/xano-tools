import {
   setupOpencode,
   serveOpencode,
   startNativeHost,
   proxyOpencode,
   setupOpencodeConfig,
   updateOpencodeTemplates,
   getTemplateInstallStatus,
   clearTemplateCache,
} from './implementation';
import { log } from '@clack/prompts';
import { hideFromRootHelp } from '../../utils/commands/main-program-utils';

async function registerOpencodeCommands(program) {
   const opencodeNamespace = program
      .command('oc')
      .alias('opencode')
      .description('Manage OpenCode AI integration and tools.')
      .allowUnknownOption(); // Allow passing through unknown flags to the underlying CLI

   opencodeNamespace
      .command('init')
      .description(
         'Initialize OpenCode native host integration and configuration for use with the CalyCode extension.',
      )
      .option('-f, --force', 'Force overwrite existing configuration files')
      .option('--skip-config', 'Skip installing OpenCode configuration templates')
      .action(async (options) => {
         await setupOpencode({
            force: options.force,
            skipConfig: options.skipConfig,
         });
      });

   // Template management subcommands
   const templatesNamespace = opencodeNamespace
      .command('templates')
      .description('Manage OpenCode configuration templates (agents, commands, instructions).');

   templatesNamespace
      .command('install')
      .description('Install or reinstall OpenCode configuration templates.')
      .option('-f, --force', 'Force overwrite existing configuration files')
      .action(async (options) => {
         await setupOpencodeConfig({ force: options.force });
      });

   // These commands are hidden from root help but visible in `oc templates --help`
   hideFromRootHelp(
      templatesNamespace
         .command('update')
         .description('Update templates by fetching the latest versions from GitHub.')
         .action(async () => {
            await updateOpencodeTemplates();
         }),
   );

   hideFromRootHelp(
      templatesNamespace
         .command('status')
         .description('Show the status of installed OpenCode templates.')
         .action(async () => {
            const status = getTemplateInstallStatus();

            if (!status.installed) {
               log.info(
                  'No templates installed. Run "xano opencode templates install" to install.',
               );
               return;
            }

            const lines = ['OpenCode Templates Status:', '  ├─ Installed: Yes'];
            if (status.configDir) {
               lines.push(`  ├─ Location:  ${status.configDir}`);
            }
            if (status.fileCount !== undefined) {
               lines.push(`  ├─ Files:     ${status.fileCount}`);
            }
            if (status.lastModified) {
               lines.push(`  └─ Modified:  ${status.lastModified.toLocaleString()}`);
            }
            log.success(lines.join('\n'));
         }),
   );

   hideFromRootHelp(
      templatesNamespace
         .command('clear-cache')
         .description('Clear the template cache (templates will be re-downloaded on next install).')
         .action(async () => {
            await clearTemplateCache();
         }),
   );

   opencodeNamespace
      .command('serve')
      .description('Serve the OpenCode AI server locally.')
      .option('--port <port>', 'Port to run the OpenCode server on (default: 4096)')
      .option('-d, --detach', 'Run the server in the background (detached mode)')
      .action(async (options) => {
         await serveOpencode({
            port: options.port ? parseInt(options.port, 10) : undefined,
            detach: options.detach,
         });
      });

   opencodeNamespace
      .command('native-host', { hidden: true })
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
      .command('run', { isDefault: true, hidden: true })
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

         // Let's filter process.argv to find everything after "opencode" or "oc".
         const rawArgs = process.argv;
         let opencodeIndex = rawArgs.indexOf('oc');
         if (opencodeIndex === -1) {
            opencodeIndex = rawArgs.indexOf('opencode');
         }
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
