import { log } from '@clack/prompts';

function registerCurrentContextCommand(program, core) {
   program.command('current-context').action(async () => {
      const startDir = process.cwd();
      const currentContext = await core.getCurrentContextConfig({ startDir, context: {} });
      log.info(`Current context: ${JSON.stringify(currentContext, null, 2)}`);
   });
}

export { registerCurrentContextCommand };
