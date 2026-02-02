import { log } from '@clack/prompts';
import { hideFromRootHelp } from '../utils/commands/main-program-utils';

function registerContextCommands(program, core) {
   // Hidden from root help, but visible when drilling down
   const contextNamespace = hideFromRootHelp(
      program.command('context').description('Context related operations.'),
   );

   contextNamespace
      .command('show')
      .description('Show the current known context.')
      .action(async () => {
         const startDir = process.cwd();
         const currentContext = await core.getCurrentContextConfig({ startDir, context: {} });
         log.info(`Current context: ${JSON.stringify(currentContext, null, 2)}`);
      });

   program
      .command('current-context')
      .description('[DEPRECATED] Use the `context show` command instead.')
      .action(async () => {
         const startDir = process.cwd();
         const currentContext = await core.getCurrentContextConfig({ startDir, context: {} });
         log.info(`Current context: ${JSON.stringify(currentContext, null, 2)}`);
      });
}

export { registerContextCommands };
