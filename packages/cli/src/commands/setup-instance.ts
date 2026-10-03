import { intro, text, password, confirm, log, isCancel, cancel } from '@clack/prompts';
import { sanitizeInstanceName } from '@repo/utils';
import { ensureGitignore, withErrorHandler } from '../utils/index';

/**
 * Unwrap a clack prompt answer, exiting cleanly if the user cancelled (Ctrl-C /
 * Esc). Without this, a cancelled prompt yields a symbol and callers crash on
 * string operations.
 */
function requireAnswer<T>(value: T | symbol): T {
   if (isCancel(value)) {
      cancel('Setup cancelled.');
      process.exit(0);
   }
   return value as T;
}

async function setupInstanceWizard(core) {
   if (!process.stdin.isTTY) {
      throw new Error(
         'Interactive setup requires a TTY. Provide --name, --url and --token for non-interactive setup.',
      );
   }

   intro('✨ Xano CLI Instance Setup ✨');

   // Gather info from user
   let nameInput = requireAnswer(
      await text({
         message:
            'Give an easy to remember name to this Xano instance (e.g. prod, staging, client-a), you will use this to identify it during command usage:',
      }),
   ).trim();
   const instanceName = sanitizeInstanceName(nameInput);
   const url = requireAnswer(
      await text({
         message: `What's the base URL for "${instanceName}"? This is your instance URL.`,
      }),
   ).trim();
   const apiKey = requireAnswer(
      await password({ message: `Enter the Metadata API key for "${instanceName}":` }),
   );
   const defaultPath = `xano/${instanceName}`;
   let userDirectory = requireAnswer(
      await text({
         message:
            'Where do you want the repo to be initialized at? (What is the local folder where we will set up your project)',
         placeholder: defaultPath,
      }),
   ).trim();
   if (userDirectory) {
      if (userDirectory === '.') {
         userDirectory = process.cwd();
      }
   } else {
      userDirectory = defaultPath;
   }

   // Check if we should set it as the current context
   const global = await core.loadGlobalConfig();
   const { currentContext } = global;
   let setAsCurrent = true;
   if (currentContext?.instance && currentContext.instance !== instanceName) {
      setAsCurrent = requireAnswer(
         await confirm({
            message: `Set "${instanceName}" as your current context?`,
            initialValue: true,
         }),
      );
   }

   log.info(
      `
Thank you for using @calycode/cli! 🚀

To help us improve, we collect anonymous telemetry data via our PostHog instance.
Here’s exactly what we track:
   • Command names (e.g., generate-oas)
   • Command duration
   • Technical data:
      – IP address (IPv6)
      – Timestamp

By continuing to use @calycode/cli, you consent to this data collection.
We appreciate your support and commitment to making @calycode/cli better!
      `
   );

   // Run the core setup logic
   await core.setupInstance({
      name: instanceName,
      projectRoot: userDirectory,
      url,
      apiKey,
      setAsCurrent,
   });
}

export function registerInitCommand(program, core) {
   program
      .command('init')
      .summary('Initialize the CLI with a Xano instance')
      .description(
         'Initialize the CLI with Xano instance configurations (interactively or via flags), this enables the CLI to know about context, APIs and in general this is required for any command to succeed.'
      )
      .option('--name <name>', 'Instance name (for non-interactive setup)')
      .option('--url <url>', 'Instance base URL (for non-interactive setup)')
      .option('--token <token>', 'Metadata API token (for non-interactive setup)')
      .option(
         '--directory <directory>',
         'Directory where to init the repo (for non-interactive setup)'
      )
      .option(
         '--no-set-current',
         'Flag to not set this instance as the current context, by default it is set.'
      )
      .action(
         withErrorHandler(async (opts) => {
            ensureGitignore();
            if (opts.name && opts.url && opts.token) {
               // Non-interactive mode for CI/CD
               let userDirectory;
               if (opts.directory) {
                  opts.directory.trim();
                  if (opts.directory === '.') {
                     userDirectory = process.cwd();
                  }
               } else {
                  userDirectory = 'xano';
               }

               await core.setupInstance({
                  name: opts.name,
                  projectRoot: userDirectory,
                  url: opts.url,
                  apiKey: opts.token,
                  setAsCurrent: opts.setCurrent,
               });
            } else {
               await setupInstanceWizard(core);
            }
         })
      );
}
