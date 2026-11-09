import { Command } from 'commander';
import pkg from '../package.json' with { type: "json" };

// Node emits DEP0190 whenever a `.cmd`/`.bat` (npx, opencode shims) is spawned
// with shell:true on Windows. That is required here, so silence deprecation
// warnings unless explicitly debugging.
if (!process.env.CALY_DEBUG) {
   (process as NodeJS.Process & { noDeprecation?: boolean }).noDeprecation = true;
}

// Import commands:
import { registerContextCommands } from './commands/context';
import { registerBackupCommands } from './commands/backup';
import { registerInitCommand } from './commands/setup-instance';
import { registerTestCommands } from './commands/test';
import { registerRegistryCommands } from './commands/registry';
import { registerServeCommands } from './commands/serve';
import { registerOpencodeCommands } from './commands/opencode/index';
import { Caly } from '@calycode/core';
import { telemetry } from './telemetry';
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
   telemetry.recordEvent('command_started', {
      $process_person_profile: false,
      command: actionCommand.name(),
   });
});

program.hook('postAction', (thisCommand, actionCommand) => {
   const start = commandStartTimes.get(thisCommand);
   if (start && actionCommand.name() !== 'native-host') {
      const duration = ((Date.now() - start) / 1000).toFixed(2);

      const commandPath = getFullCommandPath(actionCommand);

      console.log(`\n⏱️  Command "${commandPath}" completed in ${duration}s`);
      telemetry.recordEvent('command_finished', {
         $process_person_profile: false,
         command: commandPath,
         duration: duration,
      });
   }

   // Fire and forget: the dispatcher hands events to a detached process, so
   // analytics can never keep this process alive.
   void telemetry.shutdown();
});

program
   .name('caly-xano')
   .version(version, '-v, --version', 'output the version number')
   .usage('<command> [options]')
   .description('Automate backups, docs, testing & version control for Xano');

registerInitCommand(program, core);
registerGenerateCommands(program, core);
registerServeCommands(program, core);
registerRegistryCommands(program, core);
registerBackupCommands(program, core);
registerTestCommands(program, core);
registerContextCommands(program, core);
registerOpencodeCommands(program);

// --- Custom Help Formatter ---
applyCustomHelpToAllCommands(program);

export { program, core };

