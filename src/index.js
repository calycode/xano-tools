#!/usr/bin/env node
import { Command } from 'commander';

// Import commands:
import { registerFetchFunctionsInXanoScript } from './commands/analyze.js';
import { registerCurrentContextCommand, registerSwitchContextCommand } from './commands/context.js';
import { registerExportBackupCommand } from './commands/backups.js';
import { registerGenerateCodeCommand } from './commands/generate-code.js';
import { registerGenerateOasCommand } from './commands/generate-oas.js';
import { registerGenerateRepoCommand } from './commands/generate-repo.js';
import { registerLintCommand } from './commands/run-lint.js';
import { registerSetupCommand } from './commands/setup-instance.js';
import { registerTestViaOasCommand } from './commands/run-tests.js';

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
registerFetchFunctionsInXanoScript(program);
registerExportBackupCommand(program);
registerLintCommand(program);
registerTestViaOasCommand(program);
registerCurrentContextCommand(program);

program.parse();

/**
 * Future goals are:
 *
 * [ ] import backup via metadata api
 * [ ] create xano workspaces from openapi specs or via ai
 */