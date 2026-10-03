import { log } from '@clack/prompts';
import { hideFromRootHelp } from '../../utils/commands/main-program-utils';
import { distribution, validatePort } from './distribution';
import { nativeHost } from './native-host';

/**
 * Composition root for OpenCode setup: install the managed distribution, then
 * register the native host and install its templates and skills.
 */
async function setupOpencode({
   extensionIds,
   force = false,
   skipConfig = false,
   ocVersion,
}: {
   extensionIds?: string[];
   force?: boolean;
   skipConfig?: boolean;
   ocVersion?: string;
} = {}) {
   const resolvedVersion = distribution.resolveVersion(ocVersion);
   distribution.warnIfNonDefault(resolvedVersion);

   if (distribution.shouldUseManagedInstall()) {
      try {
         const managedBinPath = distribution.ensureInstalled(resolvedVersion);
         log.info(`Managed OpenCode launcher ready: ${managedBinPath}`);
      } catch (error: any) {
         log.warn(
            `Managed OpenCode install failed (${error?.message || 'unknown error'}). Falling back to global/npx launchers.`,
         );
      }
   }

   await nativeHost.register(extensionIds, resolvedVersion);
   log.info('Native host setup complete.');

   // Setup OpenCode configuration (agents, commands, instructions) and skills
   if (!skipConfig) {
      log.info('');
      await distribution.artifacts.install('templates', { force });
      log.info('');
      await distribution.artifacts.install('skills', { force });
   }

   log.info('');
   log.success('Setup complete! OpenCode is ready to use.');
}

/**
 * Serve the OpenCode server locally, in the foreground or detached.
 */
async function serveOpencode({
   port = 4096,
   detach = false,
   ocVersion,
}: {
   port?: number;
   detach?: boolean;
   ocVersion?: string;
}) {
   validatePort(port);

   const resolvedVersion = distribution.resolveVersion(ocVersion);
   distribution.warnIfNonDefault(resolvedVersion);
   const allowedOrigins = nativeHost.allowedOrigins();

   if (detach) {
      log.info(`Starting OpenCode server on port ${port} in background...`);
      const launched = distribution.launchServer({
         port,
         stdio: 'ignore',
         detach: true,
         ocVersion: resolvedVersion,
         allowedOrigins,
      });
      log.info(`OpenCode launcher: ${launched.plan.source}`);
      launched.proc.unref();
      log.success('OpenCode server started in background.');
      return;
   }

   return new Promise<void>((resolve, reject) => {
      log.info(`Starting OpenCode server on port ${port}...`);

      const launched = distribution.launchServer({
         port,
         stdio: 'inherit',
         ocVersion: resolvedVersion,
         allowedOrigins,
      });
      log.info(`OpenCode launcher: ${launched.plan.source}`);
      const proc = launched.proc;

      proc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            reject(new Error(`OpenCode server exited with code ${code}`));
         }
      });

      proc.on('error', (err) => {
         reject(new Error(`Failed to start OpenCode server: ${err.message}`));
      });
   });
}

async function registerOpencodeCommands(program) {
   const opencodeNamespace = program
      .command('oc')
      .alias('opencode')
      .summary('Run and configure the OpenCode AI agent')
      .description(
          'Manage OpenCode AI integration and tools.\n' +
             '  Powered by OpenCode - The open source AI coding agent.\n' +
             '  GitHub: https://github.com/anomalyco/opencode\n' +
             '  License: MIT (see LICENSES/opencode-ai.txt)',
      )
      .allowUnknownOption() // Allow passing through unknown flags to the underlying CLI
      .option('--cwd', 'Run OpenCode proxy commands from the current shell directory')
      .option('--workdir <path>', 'Run OpenCode proxy commands from a specific working directory')
      .option('--oc-version <version>', 'Override OpenCode package version for this command');

   opencodeNamespace
      .command('init')
      .description(
         'Initialize OpenCode native host integration and configuration for use with the CalyCode extension.',
      )
      .option('-f, --force', 'Force overwrite existing configuration files')
      .option('--skip-config', 'Skip installing OpenCode configuration templates')
      .action(async (options, command) => {
          await setupOpencode({
             force: options.force,
             skipConfig: options.skipConfig,
             ocVersion: command.parent?.opts()?.ocVersion,
          });
       });

   // Template management subcommands
   const templatesNamespace = opencodeNamespace
      .command('templates')
      .summary('Configure the OpenCode agent (agents, commands, instructions)')
      .description(
         'Manage the OpenCode agent configuration: opencode.json, AGENTS.md, and the agents/ + commands/ prompt files that shape how the AI behaves. Installed under ~/.calycode/opencode.',
      );

   templatesNamespace
      .command('install')
      .summary('Install OpenCode agent config (templates)')
      .description(
         'Install or reinstall the OpenCode agent configuration (opencode.json, AGENTS.md, agents/, commands/). Use --force to overwrite local edits.',
      )
      .option('-f, --force', 'Force overwrite existing configuration files')
      .action(async (options) => {
         await distribution.artifacts.install('templates', { force: options.force });
      });

   // These commands are hidden from root help but visible in `oc templates --help`
   hideFromRootHelp(
      templatesNamespace
         .command('update')
         .description('Update templates by fetching the latest versions from GitHub.')
         .action(async () => {
            await distribution.artifacts.update('templates');
         }),
   );

   hideFromRootHelp(
      templatesNamespace
         .command('status')
         .description('Show the status of installed OpenCode templates.')
         .action(async () => {
            const status = distribution.artifacts.status('templates');

            if (!status.installed) {
               log.info(
                  'No templates installed. Run "caly-xano opencode templates install" to install.',
               );
               return;
            }

            const lines = ['OpenCode Templates Status:', '  ├─ Installed: Yes'];
            if (status.dir) {
               lines.push(`  ├─ Location:  ${status.dir}`);
            }
            if (status.count !== undefined) {
               lines.push(`  ├─ Files:     ${status.count}`);
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
            await distribution.artifacts.clear('templates');
         }),
   );

   // Skills management subcommands
   const skillsNamespace = opencodeNamespace
      .command('skills')
      .summary('Install Xano skills (reusable agent capabilities)')
      .description(
         'Manage Xano skills: self-contained SKILL.md capability packs that teach the agent Xano-specific workflows (database optimization, security, best practices). Installed under ~/.calycode/opencode/skills.',
      );

   skillsNamespace
      .command('install')
      .summary('Install Xano skills')
      .description(
         'Install or reinstall the Xano skill packs. Use --force to overwrite local edits.',
      )
      .option('-f, --force', 'Force overwrite existing skills')
      .action(async (options) => {
         await distribution.artifacts.install('skills', { force: options.force });
      });

   hideFromRootHelp(
      skillsNamespace
         .command('update')
         .description('Update skills by fetching the latest versions from GitHub.')
         .action(async () => {
            await distribution.artifacts.update('skills');
         }),
   );

   hideFromRootHelp(
      skillsNamespace
         .command('status')
         .description('Show the status of installed skills.')
         .action(async () => {
            const status = distribution.artifacts.status('skills');

            if (!status.installed) {
               log.info('No skills installed. Run "caly-xano opencode skills install" to install.');
               return;
            }

            const lines = ['Xano Skills Status:', '  ├─ Installed: Yes'];
            if (status.dir) {
               lines.push(`  ├─ Location:  ${status.dir}`);
            }
            if (status.count !== undefined) {
               lines.push(`  ├─ Skills:    ${status.count}`);
            }
            if (status.files && status.files.length > 0) {
               lines.push(`  ├─ Names:     ${status.files.join(', ')}`);
            }
            if (status.lastModified) {
               lines.push(`  └─ Modified:  ${status.lastModified.toLocaleString()}`);
            }
            log.success(lines.join('\n'));
         }),
   );

   hideFromRootHelp(
      skillsNamespace
         .command('clear-cache')
         .description('Clear the skills cache (skills will be re-downloaded on next install).')
         .action(async () => {
            await distribution.artifacts.clear('skills');
         }),
   );

   opencodeNamespace
      .command('serve')
      .description('Serve the OpenCode AI server locally.')
      .option('--port <port>', 'Port to run the OpenCode server on (default: 4096)')
      .option('-d, --detach', 'Run the server in the background (detached mode)')
      .action(async (options, command) => {
          await serveOpencode({
             port: options.port ? parseInt(options.port, 10) : undefined,
             detach: options.detach,
             ocVersion: command.parent?.opts()?.ocVersion,
          });
       });

   const nativeHostCommand = opencodeNamespace
      .command('native-host')
      .description('Native host operations for browser extension integration.')
      .action(async () => {
         // Redirect all console.log to console.error (stderr)
         // so they don't break the native messaging protocol
         console.log = console.error;
         console.info = console.error;
         await nativeHost.start({ launchServer: distribution.launchServer });
      });

   nativeHostCommand
      .command('status')
      .description('Show native host manifest, wrapper, and extension allowlist status.')
      .action(() => {
         nativeHost.status();
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

         // Actually, for a pure proxy where we want "caly-xano opencode foo --bar",
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

          let forceCwd = !!command.parent?.opts()?.cwd;
          let explicitWorkdir = command.parent?.opts()?.workdir as string | undefined;
          let ocVersion = command.parent?.opts()?.ocVersion as string | undefined;
          const sanitizedPassThroughArgs: string[] = [];

         for (let i = 0; i < passThroughArgs.length; i++) {
            const arg = passThroughArgs[i];

            if (arg === '--cwd') {
               forceCwd = true;
               continue;
            }

            if (arg.startsWith('--cwd=')) {
               const value = arg.slice('--cwd='.length).toLowerCase();
               forceCwd = ['1', 'true', 'yes', 'on'].includes(value);
               continue;
            }

            if (arg === '--workdir') {
               const next = passThroughArgs[i + 1];
               if (next) {
                  explicitWorkdir = next;
                  i++;
               }
               continue;
            }

            if (arg.startsWith('--workdir=')) {
               explicitWorkdir = arg.slice('--workdir='.length);
               continue;
            }

            if (arg === '--oc-version') {
               const next = passThroughArgs[i + 1];
               if (next) {
                  ocVersion = next;
                  i++;
               }
               continue;
            }

            if (arg.startsWith('--oc-version=')) {
               ocVersion = arg.slice('--oc-version='.length);
               continue;
            }

            sanitizedPassThroughArgs.push(arg);
         }

         // Filter out our own known subcommands if they were accidentally matched?
         // No, if we are here, it's because it wasn't init/serve/native-host (mostly).
          // BUT 'run' is default, so 'caly-xano opencode' (no args) also lands here.

          await distribution.proxy(sanitizedPassThroughArgs, {
             forceCwd,
             explicitWorkdir,
          }, ocVersion);
       });
}

export { registerOpencodeCommands, setupOpencode };
