#!/usr/bin/env node
import { Command } from 'commander';
import { log } from '@clack/prompts';
import { getCurrentContextConfig } from './utils/context/index.js';

// Import the commands:
import { switchContextPrompt } from './commands/context.js';
import { setupInstanceWizard } from './commands/setup-instance.js';
import { updateOpenapiSpec } from './commands/generate-openapispec.js';
import { generateClientSdk } from './commands/generate-client-sdk.js';
import { generateRepo } from './commands/generate-repo.js';
import { testRunner } from './commands/run-tests.js';
import { runLinter } from './commands/run-lint.js';

const program = new Command();

program
   .name('xano-community-cli (alias: xcc)')
   .description('CLI for processing, linting, and testing Xano backend logic')
   .version('0.0.1')
   .exitOverride(() => {
      process.exit(0);
   });

program
   .command('setup')
   .description('Setup Xano Community CLI configurations')
   .action(async () => {
      await setupInstanceWizard();
   });

program
   .command('switch-context')
   .description('Switch instance/workspace context')
   .option('--instance <instance>', 'The name of your instance')
   .option('--workspace <workspace>', 'The name of your workspace')
   .action(async (opts) => {
      await switchContextPrompt(opts);
   });

program
   .command('regenerate-openapispec')
   .description('Update and generate OpenAPI spec(s) for the current context.')
   .option('--instance <instance>')
   .option('--workspace <workspace>')
   .option('--branch <branch>')
   .option('--group <name>', 'API group to update')
   .option('--all', 'Regenerate for all API groups in workspace/branch')
   .action(async (opts) => {
      await updateOpenapiSpec(opts.instance, opts.workspace, opts.branch, opts.group, opts.all);
   });

program
   .command('generate-client-sdk')
   .description(
      'Create a client library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step.'
   )
   .option('--instance <instance>')
   .option('--workspace <workspace>')
   .option('--branch <branch>')
   .option('--group <name>', 'API group to update')
   .option('--all', 'Regenerate for all API groups in workspace/branch')
   .option(
      '--generator <generator>',
      'SDK generator to use, see all options at: https://openapi-generator.tech/docs/generators'
   )
   .option(
      '--args <args>',
      'Additional arguments to pass to the generator. See https://openapi-generator.tech/docs/usage#generate'
   )
   .option(
      '--debug',
      'Specify this flag in order to allow logging. Logs will appear in output/_logs. Default: false'
   )
   .action(async (opts) => {
      const stack = {};
      if (opts.generator) {
         stack.generator = opts.generator;
      }
      if (opts.args) {
         stack.args = opts.args.split(',');
      }
      await generateClientSdk(
         opts.instance,
         opts.workspace,
         opts.branch,
         opts.group,
         opts.all,
         stack,
         opts.debug
      );
   });

program
   .command('process')
   .description('Process Xano workspace into repo structure')
   .option('-i, --input <file>', 'workspace yaml file')
   .option('-o, --output <dir>', 'output directory (overrides config)')
   .option('--instance <instance>')
   .option('--workspace <workspace>')
   .option('--branch <branch>')
   .option('--fetch', 'Specify this if you want to fetch the workspace schema from Xano')
   .action(async (opts) => {
      await generateRepo(
         opts.instance,
         opts.workspace,
         opts.branch,
         opts.input,
         opts.output,
         opts.fetch
      );
   });

program
   .command('test-through-oas')
   .description('Run an API test suite through the OpenAPI spec. WIP...')
   .action(async () => {
      await testRunner();
   });

program
   .command('lint')
   .description('Lint backend logic, based on provided local file. Remote and dynamic sources are WIP...')
   .action(async () => {
      await runLinter()
   });

program.command('current-context').action(() => {
   const currentContext = getCurrentContextConfig();
   log.info(`Current context: ${JSON.stringify(currentContext)}`);
});

// ----------------- [ ] TODO: to implement these commands or discard them -------------------- //
program
   .command('generate-schemas-from-examples')
   .description('Generate json-schema compliant schemas from OAS examples')
   .action(() => {
      log.warn('Not implemented yet');
   });

program
   .command('export-backup')
   .description('Backup Xano Workspace via Metadata API')
   .action(() => {
      log.warn('Not implemented yet');
   });

program
   .command('import-backup')
   .description('Backup Xano Workspace via Metadata API')
   .action(() => {
      log.warn('Not implemented yet');
   });

program
   .command('create-xano-workspace')
   .description('Create a XANO workspace. Optionally provide an OpenAPI spec to generate paths, models, auth etc according to specs.')
   .option('--openapispec <file>', 'The origin openapi spec that we need to recreate in Xano')
   .action(() => {
      log.warn('Not implemented yet');
   });

program.parse();
