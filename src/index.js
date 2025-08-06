#!/usr/bin/env node
import { Command } from 'commander';

// Import commands:
import { registerSetupCommand } from './commands/setup-instance.js';
import { registerCurrentContextCommand, registerSwitchContextCommand } from './commands/context.js';
import { registerGenerateOasCommand } from './commands/generate-oas.js';
import { registerGenerateCodeCommand } from './commands/generate-client-sdk.js';
import { registerGenerateRepoCommand } from './commands/generate-repo.js';
import { registerTestViaOasCommand } from './commands/run-tests.js';
import { registerExportBackupCommand } from './commands/backups.js';
import { registerLintCommand } from './commands/run-lint.js';

const program = new Command();

program
   .name('xano-community-cli (alias: xcc)')
   .description(
      'CLI for processing, openapispec generating, testing, backups, linting, and much more for Xano instances'
   )
   .version('0.0.1')
   .exitOverride(() => {
      process.exit(0);
   });

// Register each available command:
registerSetupCommand(program);
registerSwitchContextCommand(program);
registerGenerateOasCommand(program);
registerGenerateCodeCommand(program);
registerGenerateRepoCommand(program);
registerTestViaOasCommand(program);
registerExportBackupCommand(program);
registerLintCommand(program);
registerCurrentContextCommand(program);

program.parse();

/**
 * Future goals are:
 *
 * [ ] generate schemas / models from openapi spec examples
 * [ ] import backup via metadata api
 * [ ] create xano workspaces from openapi specs or via ai
 */