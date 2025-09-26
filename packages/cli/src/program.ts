import { Command } from 'commander';
import { font } from './utils';
import pkg from '../../../package.json' with {type: "json"};

// Import commands:
import { registerCurrentContextCommand } from './commands/context';
import { registerExportBackupCommand, registerRestoreBackupCommand } from './commands/backups';
import { registerGenerateCodeCommand } from './commands/generate-code';
import { registerGenerateOasCommand } from './commands/generate-oas';
import { registerGenerateRepoCommand } from './commands/generate-repo';
import { registerSetupCommand } from './commands/setup-instance';
import { registerRunTestCommand } from './commands/run-tests';
import { registerRegistryAddCommand, registerRegistryScaffoldCommand } from './commands/registry';
import { registerOasServeCommand, registerRegistryServeCommand } from './commands/serve';
import { registerBuildXanoscriptRepoCommand } from './commands/generate-xanoscript-repo';
import { Caly } from '@calycode/core';
import { nodeConfigStorage } from './node-config-storage';

const commandStartTimes = new WeakMap<Command, number>();

const { version } = pkg;
const program = new Command();
const core = new Caly(nodeConfigStorage);

// Store start time on the command object
program.hook('preAction', (thisCommand) => {
  commandStartTimes.set(thisCommand, Date.now());
});

program.hook('postAction', (thisCommand, actionCommand) => {
  const start = commandStartTimes.get(thisCommand);
  if (!start) {
    // Could happen if preAction failed, or if there's a bug
    console.warn('⏱️  Command timer missing start time.');
    return;
  }
  const duration = ((Date.now() - start) / 1000).toFixed(2);

  // Show the full command path for clarity
  const commandPath = actionCommand.parent
    ? `${actionCommand.parent.name()} ${actionCommand.name()}`
    : actionCommand.name();

  console.log(`\n⏱️  Command "${commandPath}" completed in ${duration}s`);
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
    font.color.white('automate ') + font.combo.boldCyan('backups') + font.color.white(', ') +
    font.combo.boldCyan('docs') + font.color.white(', ') +
    font.combo.boldCyan('testing') + font.color.white(', and ') +
    font.combo.boldCyan('version control') + font.color.white(' — no AI guesswork, just reliable, transparent dev tools.') +
    '\n\n' +
    `Current version: ${version}`
  );

// --- Register your commands here ---
registerSetupCommand(program, core);
registerGenerateOasCommand(program, core);
registerOasServeCommand(program, core);
registerGenerateCodeCommand(program, core);
registerGenerateRepoCommand(program, core);
registerBuildXanoscriptRepoCommand(program, core);
registerRegistryAddCommand(program, core);
registerRegistryScaffoldCommand(program, core);
registerRegistryServeCommand(program);
registerExportBackupCommand(program, core);
registerRestoreBackupCommand(program, core);
registerRunTestCommand(program, core);
registerCurrentContextCommand(program, core);

// --- Custom Help Formatter ---
program.configureHelp({
  formatHelp(cmd, helper) {
    const allCmds = helper.visibleCommands(cmd);

    // For alignment: determine the longest command name
    const longestName = allCmds.reduce(
      (len, c) => Math.max(len, c.name().length),
      0
    );

    const pad = (str, len) => str + ' '.repeat(len - str.length);

    const groups = [
      {
        title: font.combo.boldCyan('Core Commands:'),
        commands: ['setup'],
      },
      {
        title: font.combo.boldCyan('Code Generation:'),
        commands: ['generate-oas', 'oas-serve', 'generate-code', 'generate-repo', 'generate-xs-repo', 'generate-functions'],
      },
      {
        title: font.combo.boldCyan('Registry:'),
        commands: ['registry-add', 'registry-scaffold', 'registry-serve'],
      },
      {
        title: font.combo.boldCyan('Backup & Restore:'),
        commands: ['export-backup', 'restore-backup'],
      },
      {
        title: font.combo.boldCyan('Testing & Linting:'),
        commands: ['run-test'],
      },
      {
        title: font.combo.boldCyan('Other:'),
        commands: ['current-context'],
      },
    ];

    // Map command names to command objects for lookup
    const cmdMap = Object.fromEntries(allCmds.map(cmd => [cmd.name(), cmd]));

    // Usage line
    let output = [
      font.weight.bold(`\nUsage: xano <command> [options]\n`)
    ];

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

    // Command Groups
    for (const group of groups) {
      output.push('\n' + group.title);
      for (const cname of group.commands) {
        const c = cmdMap[cname];
        if (c) {
          // Only show -h, --help in main help for brevity
          const opts = '  ' + font.color.gray('-h, --help');
          // Align command names
          output.push(
            `  ${font.weight.bold(pad(c.name(), longestName))}${opts}\n    ${c.description()}\n`
          );
        }
      }
    }

    // Footer/help link
    output.push(
      font.color.gray('Need help? Visit https://github.com/calycode/xano-tools\n')
    );

    return output.join('\n');
  }
});

export { program };
