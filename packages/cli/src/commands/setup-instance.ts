import { intro, text, password, confirm } from '@clack/prompts';
import { sanitizeInstanceName } from '@repo/utils';
import { ensureGitignore, withErrorHandler } from '../utils/index';

async function setupInstanceWizard(core) {
   intro('✨ Xano CLI Instance Setup ✨');

   // Gather info from user
   let nameInput = (
      (await text({
         message: 'Name this Xano instance (e.g. prod, staging, client-a):',
      })) as string
   ).trim();
   const instanceName = sanitizeInstanceName(nameInput);
   const url = (
      (await text({ message: `What's the base URL for "${instanceName}"?` })) as string
   ).trim();
   const apiKey = await password({ message: `Enter the Metadata API key for "${instanceName}":` });
   const defaultPath = `xano/${instanceName}`;
   let userDirectory = (await text({
      message: 'Where do you want the repo to be initialized at?',
      placeholder: defaultPath,
   })) as string;
   if (userDirectory) {
      userDirectory.trim();
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
      setAsCurrent = (await confirm({
         message: `Set "${instanceName}" as your current context?`,
         initialValue: true,
      })) as boolean;
   }

   // Run the core setup logic
   await core.setupInstance({
      name: instanceName,
      projectRoot: userDirectory,
      url,
      apiKey,
      setAsCurrent,
   });
}

export function registerSetupCommand(program, core) {
   program
      .command('setup')
      .description('Setup Xano instance configurations (interactively or via flags)')
      .option('--name <name>', 'Instance name (for non-interactive setup)')
      .option('--url <url>', 'Instance base URL (for non-interactive setup)')
      .option('--token <token>', 'Metadata API token (for non-interactive setup)')
      .option('--no-set-current', 'Do not set this instance as the current context')
      .action(
         withErrorHandler(async (opts) => {
            ensureGitignore();
            if (opts.name && opts.url && opts.token) {
               // Non-interactive mode for CI/CD
               await core.setupInstance({
                  name: opts.name,
                  url: opts.url,
                  apiKey: opts.token,
                  setAsCurrent: opts.setCurrent,
               });
            } else {
               // Interactive wizard for local development
               await setupInstanceWizard(core);
            }
         })
      );
}
