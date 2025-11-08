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
import { Caly } from '@calycode/core';
import { InitializedPostHog } from './utils/posthog/init';
import { nodeConfigStorage } from './node-config-storage';
import { registerGenerateCommands } from './commands/generate';
import { collectVisibleLeafCommands, getFullCommandPath } from './utils/commands/main-program-utils';

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

// --- Custom Help Formatter ---
program.configureHelp({
   formatHelp(cmd, helper) {
      // 1. Collect all visible leaf commands with their full paths
      const allLeafCmds = collectVisibleLeafCommands(cmd);

      // 2. For alignment: determine the longest command path string
      const allNames = allLeafCmds.map((c) => c.path.join(' '));
      const longestName = allNames.reduce((len, n) => Math.max(len, n.length), 0);
      const pad = (str, len) => str + ' '.repeat(len - str.length);

      // 3. Define your desired groups (with full string paths)
      const groups = [
         {
            title: font.combo.boldCyan('Core Commands:'),
            commands: ['init'],
         },
         {
            title: font.combo.boldCyan('Generation Commands:'),
            commands: [
               'generate spec',
               'generate codegen',
               'generate repo',
               'generate xanoscript',
               'generate docs',
            ],
         },
         {
            title: font.combo.boldCyan('Registry:'),
            commands: ['registry add', 'registry scaffold'],
         },
         {
            title: font.combo.boldCyan('Serve:'),
            commands: ['serve spec', 'serve registry'],
         },
         {
            title: font.combo.boldCyan('Backups:'),
            commands: ['backup export', 'backup restore'],
         },
         {
            title: font.combo.boldCyan('Testing & Linting:'),
            commands: ['test run'],
         },
         {
            title: font.combo.boldCyan('Other:'),
            commands: ['context show'],
         },
      ];

      // 4. Map full path strings to command objects
      const cmdMap = Object.fromEntries(allLeafCmds.map((c) => [c.path.join(' '), c]));

      // 5. Track which commands are used
      const used = new Set(groups.flatMap((g) => g.commands));
      const ungrouped = allLeafCmds.map((c) => c.path.join(' ')).filter((name) => !used.has(name));

      if (ungrouped.length) {
         groups.push({
            title: font.combo.boldCyan('Other:'),
            commands: ungrouped,
         });
      }

      // 6. Usage line
      let output = [font.weight.bold(`\nUsage: xano <command> [options]\n`)];

      // Banner and description
      if (cmd.description()) {
         output.push(cmd.description() + '\n');
      }

      // Options
      output.push(font.weight.bold('Options:'));
      output.push(
         `  -v, --version   ${font.color.gray('output the version number')}\n` +
            `  -h, --help      ${font.color.gray('display help for command')}\n`
      );

      // 7. Command Groups
      for (const group of groups) {
         output.push('\n' + group.title);
         for (const cname of group.commands) {
            const c = cmdMap[cname];
            if (c) {
               const opts = '  ' + font.color.gray('-h, --help');
               output.push(
                  `   ${font.weight.bold(font.color.yellowBright(pad(cname, longestName)))}${opts}\n      ${c.description}\n`
               );
            }
         }
      }

      // Footer/help link
      output.push(font.color.gray('Need help? Visit https://github.com/calycode/xano-tools\n'));

      return output.join('\n');
   },
});

export { program };
