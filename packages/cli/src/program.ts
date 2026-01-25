import { Command } from 'commander';
import { font } from './utils';
import pkg from '../package.json' with { type: "json" };

// Import commands:
import { registerContextCommands } from './commands/context';
import { registerBackupCommands } from './commands/backup';
import { registerInitCommand } from './commands/setup-instance';
import { registerTestCommands } from './commands/test';
import { registerRegistryCommands } from './commands/registry';
import { registerServeCommands } from './commands/serve';
import { registerOpencodeCommands } from './commands/opencode';
import { Caly } from '@calycode/core';
import { InitializedPostHog } from './utils/posthog/init';
import { nodeConfigStorage } from './node-config-storage';
import { registerGenerateCommands } from './commands/generate';
import {
   getFullCommandPath,
   applyCustomHelpToAllCommands,
} from './utils/commands/main-program-utils';

const commandStartTimes = new WeakMap<Command, number>();

const { version } = pkg;
const program = new Command();
const core = new Caly(nodeConfigStorage);

// Store start time on the command object
program.hook('preAction', (thisCommand, actionCommand) => {
   commandStartTimes.set(thisCommand, Date.now());
   InitializedPostHog.captureImmediate({
      distinctId: 'anonymous',
      event: 'command_started',
      properties: {
         $process_person_profile: false,
         command: actionCommand.name(),
      },
   });
});

program.hook('postAction', (thisCommand, actionCommand) => {
   const start = commandStartTimes.get(thisCommand);
   if (!start) return;
   const duration = ((Date.now() - start) / 1000).toFixed(2);

   const commandPath = getFullCommandPath(actionCommand);

   console.log(`\n⏱️  Command "${commandPath}" completed in ${duration}s`);
   InitializedPostHog.captureImmediate({
      distinctId: 'anonymous',
      event: 'command_finished',
      properties: {
         $process_person_profile: false,
         command: commandPath,
         duration: duration,
      },
   });
   InitializedPostHog.shutdown();
});

program
   .name('xano')
   .version(version, '-v, --version', 'output the version number')
   .usage('<command> [options]')
   .description(
      font.color.cyan(`
+==================================================================================================+
|                                                                                                  |
|    ██████╗ █████╗ ██╗  ██╗   ██╗    ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗      ██████╗██╗     ██╗   |
|   ██╔════╝██╔══██╗██║  ╚██╗ ██╔╝    ╚██╗██╔╝██╔══██╗████╗  ██║██╔═══██╗    ██╔════╝██║     ██║   |
|   ██║     ███████║██║   ╚████╔╝█████╗╚███╔╝ ███████║██╔██╗ ██║██║   ██║    ██║     ██║     ██║   |
|   ██║     ██╔══██║██║    ╚██╔╝ ╚════╝██╔██╗ ██╔══██║██║╚██╗██║██║   ██║    ██║     ██║     ██║   |
|   ╚██████╗██║  ██║███████╗██║       ██╔╝ ██╗██║  ██║██║ ╚████║╚██████╔╝    ╚██████╗███████╗██║   |
|    ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝       ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝      ╚═════╝╚══════╝╚═╝   |
|                                                                                                  |
+==================================================================================================+
`) +
         '\n\n' +
         font.color.yellowBright('Supercharge your Xano workflow: ') +
         font.color.white('automate ') +
         font.combo.boldCyan('backups') +
         font.color.white(', ') +
         font.combo.boldCyan('docs') +
         font.color.white(', ') +
         font.combo.boldCyan('testing') +
         font.color.white(', and ') +
         font.combo.boldCyan('version control') +
         font.color.white(' — no AI guesswork, just reliable, transparent dev tools.') +
         '\n\n' +
         `Current version: ${version}`
   );

registerInitCommand(program, core);
registerGenerateCommands(program, core);
registerServeCommands(program, core);
registerRegistryCommands(program, core);
registerBackupCommands(program, core);
registerTestCommands(program, core);
registerContextCommands(program, core);
// registerOpencodeCommands(program, core);
registerOpencodeCommands(program, core);

// --- Custom Help Formatter ---
applyCustomHelpToAllCommands(program);

export { program, core };

