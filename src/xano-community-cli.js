#!/usr/bin/env node
import { Command } from 'commander';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { prettyLog } from './features/process-xano/utils/console/prettify.js';
import { ensureSecretKeyInEnv } from './utils/crypto/index.js';
import { processWorkspace } from './features/process-xano/index.js';
import { runLintXano } from './features/lint-xano/index.js';
import { runTestSuite } from './features/tests/index.js';
import { loadEnvToProcess } from './utils/crypto/handleEnv.js';
import { generateClientSdk } from './commands/generate-client-sdk.js';
import { log } from '@clack/prompts';
import { getCurrentContextConfig } from './utils/context/index.js';
import { updateOpenapiSpec } from './commands/generate-openapispec.js';
import { generateRepo } from './commands/generate-repo.js';

// Import the commands:
import { switchContextPrompt } from './commands/context.js';
import { setupInstanceWizard } from './commands/setup-instance.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- UTILITIES -------------- //
async function loadConfig(configFileName = 'xcc.config.js', configSection = null) {
   ensureSecretKeyInEnv();
   loadEnvToProcess();
   try {
      const userConfigPath = join(process.cwd(), configFileName);
      const config = (await import(pathToFileURL(userConfigPath))).default;
      return configSection ? config[configSection] || {} : config;
   } catch {
      try {
         const internalConfigPath = join(__dirname, 'config', configFileName);
         const config = (await import(pathToFileURL(internalConfigPath))).default;
         return configSection ? config[configSection] || {} : config;
      } catch {
         prettyLog(
            `No config file (${configFileName}) found and no internal default config present!`,
            'error'
         );
         process.exit(1);
      }
   }
}

async function handleCommand(section, opts, runner, configFile = 'xcc.config.js') {
   const defaultConfig = await loadConfig(configFile, section);
   const finalConfig = { ...defaultConfig, ...opts };
   await runner(finalConfig);
}

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
   .description('Create a client library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step.')
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
   .option('--debug', 'Specify this flag in order to allow logging. Logs will appear in output/_logs. Default: false')
   .action(async (opts) => {
      const stack = {};
      if (opts.generator) {
         stack.generator = opts.generator;
      }
      if (opts.args) {
         stack.args = opts.args.split(',');
      }
      await generateClientSdk(opts.instance, opts.workspace, opts.branch, opts.group, opts.all, stack, opts.debug);
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
      await generateRepo(opts.instance, opts.workspace, opts.branch, opts.input, opts.output, opts.fetch);
   });

program.command('current-context').action(() => {
   const currentContext = getCurrentContextConfig();
   log.info(`Current context: ${JSON.stringify(currentContext)}`);
});

// ---------------------------- TO REFACTOR FOR THE NEW CONFIG APPROACH ---------------------------- //


program
   .command('lint')
   .description('Lint backend logic')
   .option('-i, --input <file>', 'workspace yaml file')
   .option('-c, --config <file>', 'lint rules config')
   .option('-o, --output <file>', 'lint output file')
   .action((opts) => handleCommand('lint', opts, runLintXano));

program
   .command('test')
   .description('Run an API test suite')
   .option('--group <name>', 'Test group to run (e.g. Default, public, admin)')
   .option('--test-config <file>', 'Custom test config file')
   .option('--oas <file>', 'OpenAPI spec file')
   .option('--setup <file>', 'test setup file')
   .option('--secrets <file>', 'secrets/config file')
   .option('--output <file>', 'test results output')
   .option('--base-url <url>', 'API base URL')
   .action(async (opts) => {
      // Load config (custom file, or default)
      const config = await loadConfig(opts.testConfig || 'xcc.config.js');
      let testGroups = config.test;
      if (!Array.isArray(testGroups)) testGroups = Object.values(testGroups);

      // If a group is specified, filter; else run all
      const groupsToRun = opts.group ? testGroups.filter((g) => g.name === opts.group) : testGroups;

      if (groupsToRun.length === 0) {
         console.error(`No test group found with name "${opts.group}".`);
         process.exit(1);
      }

      for (const group of groupsToRun) {
         log.step(`Running tests for group "${group.name}"`);
         // Merge CLI overrides into group config (if provided)
         const finalGroupConfig = { ...group, ...opts };
         await runTestSuite(finalGroupConfig);
      }
      log.success('All tests completed');
   });

// ----------------- [ ] TODO: to implement these commands or discard them -------------------- //
program
   .command('generate-schemas-from-examples')
   .description('Generate json-schema compliant schemas from OAS examples')
   .action(() => {
      prettyLog('Not implemented yet', 'error');
   });

program
   .command('export-backup')
   .description('Backup Xano Workspace via Metadata API')
   .action(() => {
      prettyLog('Not implemented yet', 'error');
   });

program
   .command('import-backup')
   .description('Backup Xano Workspace via Metadata API')
   .action(() => {
      prettyLog('Not implemented yet', 'error');
   });

program
   .command('create-xano-workspace')
   .description('Create a XANO instance from a template.')
   .action(() => {
      prettyLog('Not implemented yet', 'error');
   });

program.parse();
