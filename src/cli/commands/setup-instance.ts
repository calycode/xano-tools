import { intro, text, password, confirm } from '@clack/prompts';
import { sanitizeInstanceName, withErrorHandler } from '../utils/index';

// [ ] CLI
async function setupInstanceWizard(core) {
   intro('✨ Xano CLI Instance Setup ✨');

   // Gather info from user
   const name = (
      (await text({
         message: 'Name this Xano instance (e.g. prod, staging, client-a):',
      })) as string
   ).trim();
   const url = ((await text({ message: `What's the base URL for "${name}"?` })) as string).trim();
   const apiKey = await password({ message: `Enter the Metadata API key for "${name}":` });

   // Check if we should set it as the current context
   const global = await core.loadGlobalConfig();
   const { currentContext } = global;
   let setAsCurrent = true;
   if (currentContext?.instance && currentContext.instance !== sanitizeInstanceName(name)) {
      setAsCurrent = (await confirm({
         message: `Set "${name}" as your current context?`,
         initialValue: true,
      })) as boolean;
   }

   // Run the core setup logic
   await core.setupInstance({ name, url, apiKey, setAsCurrent });
}

// [ ] CLI
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
            if (opts.name && opts.url && opts.token) {
               // Non-interactive mode for CI/CD
               await core.setupInstance({
                  name: opts.name,
                  url: opts.url,
                  apiKey: opts.token,
                  setAsCurrent: opts.setCurrent, // commander turns --no-set-current to setCurrent: false
               });
            } else {
               // Interactive wizard for local development
               await setupInstanceWizard(core);
            }
         })
      );
}
