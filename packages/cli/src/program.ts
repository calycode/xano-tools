import { Command } from 'commander';
import chalk from 'chalk';
import pkg from '../../../package.json' with {type: "json"};

// Import commands:
import { registerCurrentContextCommand, registerSwitchContextCommand } from './commands/context';
import { registerExportBackupCommand, registerRestoreBackupCommand } from './commands/backups';
import { registerFetchFunctionsInXanoScript } from './commands/analyze';
import { registerGenerateCodeCommand } from './commands/generate-code';
import { registerGenerateOasCommand } from './commands/generate-oas';
import { registerGenerateRepoCommand } from './commands/generate-repo';
import { registerLintCommand } from './commands/run-lint';
import { registerSetupCommand } from './commands/setup-instance';
import { registerTestViaOasCommand } from './commands/run-tests';
import { registerRegistryAddCommand, registerRegistryScaffoldCommand } from './commands/registry';
import { registerOasServeCommand, registerRegistryServeCommand } from './commands/serve';
import { XCC } from '@mihalytoth20/xcc-core';
import { nodeConfigStorage } from './node-config-storage';

const commandStartTimes = new WeakMap<Command, number>();

const { version } = pkg;
const program = new Command();
const core = new XCC(nodeConfigStorage);

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
  .name('xcc')
  .version(version, '-v, --version', 'output the version number')
  .usage('<command> [options]')
  .description(
    chalk.cyan(`
+----------------------------------------------------------------+
|                                                                |
|   ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗      ██████╗██╗     ██╗   |
|   ╚██╗██╔╝██╔══██╗████╗  ██║██╔═══██╗    ██╔════╝██║     ██║   |
|    ╚███╔╝ ███████║██╔██╗ ██║██║   ██║    ██║     ██║     ██║   |
|    ██╔██╗ ██╔══██║██║╚██╗██║██║   ██║    ██║     ██║     ██║   |
|   ██╔╝ ██╗██║  ██║██║ ╚████║╚██████╔╝    ╚██████╗███████╗██║   |
|   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝      ╚═════╝╚══════╝╚═╝   |
|                                                                |
+----------------------------------------------------------------+
`) +
    '\n\n' +
    chalk.yellowBright('Supercharge your Xano workflow: ') +
    chalk.white('automate ') + chalk.bold.cyan('backups') + chalk.white(', ') +
    chalk.bold.cyan('docs') + chalk.white(', ') +
    chalk.bold.cyan('testing') + chalk.white(', and ') +
    chalk.bold.cyan('version control') + chalk.white(' — no AI guesswork, just reliable, transparent dev tools.') +
    '\n\n' +
    `Current version: ${version}`
  );

// --- Register your commands here ---
registerSetupCommand(program, core);
registerSwitchContextCommand(program, core);
registerGenerateOasCommand(program, core);
registerOasServeCommand(program, core);
registerGenerateCodeCommand(program, core);
registerGenerateRepoCommand(program, core);
registerFetchFunctionsInXanoScript(program, core);
registerRegistryAddCommand(program, core);
registerRegistryScaffoldCommand(program, core);
registerRegistryServeCommand(program);
registerExportBackupCommand(program, core);
registerRestoreBackupCommand(program, core);
registerLintCommand(program, core);
registerTestViaOasCommand(program, core);
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
        title: chalk.bold.cyan('Core Commands:'),
        commands: ['setup', 'switch-context'],
      },
      {
        title: chalk.bold.cyan('Code Generation:'),
        commands: ['generate-oas', 'oas-serve', 'generate-code', 'generate-repo', 'generate-functions'],
      },
      {
        title: chalk.bold.cyan('Registry:'),
        commands: ['registry-add', 'registry-scaffold', 'registry-serve'],
      },
      {
        title: chalk.bold.cyan('Backup & Restore:'),
        commands: ['export-backup', 'restore-backup'],
      },
      {
        title: chalk.bold.cyan('Testing & Linting:'),
        commands: ['lint', 'test-via-oas'],
      },
      {
        title: chalk.bold.cyan('Other:'),
        commands: ['current-context'],
      },
    ];

    // Map command names to command objects for lookup
    const cmdMap = Object.fromEntries(allCmds.map(cmd => [cmd.name(), cmd]));

    // Usage line
    let output = [
      chalk.bold(`\nUsage: xcc <command> [options]\n`)
    ];

    // Banner and description
    if (cmd.description()) {
      output.push(cmd.description() + '\n');
    }

    // Options
    output.push(chalk.bold('Options:'));
    output.push(
      `  -v, --version   ${chalk.gray('output the version number')}\n` +
      `  -h, --help      ${chalk.gray('display help for command')}\n`
    );

    // Command Groups
    for (const group of groups) {
      output.push('\n' + group.title);
      for (const cname of group.commands) {
        const c = cmdMap[cname];
        if (c) {
          // Only show -h, --help in main help for brevity
          const opts = '  ' + chalk.gray('-h, --help');
          // Align command names
          output.push(
            `  ${chalk.bold(pad(c.name(), longestName))}${opts}\n    ${c.description()}\n`
          );
        }
      }
    }

    // Footer/help link
    output.push(
      chalk.gray('Need help? Visit https://github.com/MihalyToth20/xano-community-cli\n')
    );

    return output.join('\n');
  }
});

export { program };
