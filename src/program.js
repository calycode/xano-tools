import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import pkg from '../package.json' with {type: "json"};

// Import commands:
import { registerCurrentContextCommand, registerSwitchContextCommand } from './commands/context.js';
import { registerExportBackupCommand, registerRestoreBackupCommand } from './commands/backups.js';
import { registerFetchFunctionsInXanoScript } from './commands/analyze.js';
import { registerGenerateCodeCommand } from './commands/generate-code.js';
import { registerGenerateOasCommand } from './commands/generate-oas.js';
import { registerGenerateRepoCommand } from './commands/generate-repo.js';
import { registerLintCommand } from './commands/run-lint.js';
import { registerSetupCommand } from './commands/setup-instance.js';
import { registerTestViaOasCommand } from './commands/run-tests.js';

const { version } = pkg;
const program = new Command();

program
  .name('xcc')
  .version(version, '-v, --version', 'output the version number')
  .usage('<command> [options]')
  .description(
    chalk.cyan(figlet.textSync('Xano CLI', { horizontalLayout: 'full' })) +
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
registerSetupCommand(program);
registerSwitchContextCommand(program);
registerGenerateOasCommand(program);
registerGenerateCodeCommand(program);
registerGenerateRepoCommand(program);
registerFetchFunctionsInXanoScript(program);
registerExportBackupCommand(program);
registerRestoreBackupCommand(program);
registerLintCommand(program);
registerTestViaOasCommand(program);
registerCurrentContextCommand(program);

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
        commands: ['generate-oas', 'generate-code', 'generate-repo', 'generate-functions'],
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

/**
 * Future goals are:
 *
 * [ ] create xano workspaces from openapi specs or via ai
 */