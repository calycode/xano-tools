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
import { updateOpenapiSpec } from './features/oas/update/index.js';
import { generateClientSdk } from './features/oas/client-sdk/generate.js'
import { log } from '@clack/prompts';
import { getCurrentContextConfig } from './utils/context/index.js';

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

   // ---------------------------- TO REFACTOR FOR THE NEW CONFIG APPROACH ---------------------------- //

program
   .command('process')
   .description('Process Xano workspace into repo structure')
   .option('-i, --input <file>', 'workspace yaml file')
   .option('-o, --output <dir>', 'output directory')
   .action((opts) => handleCommand('process', opts, processWorkspace));

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

program
   .command('update-oas')
   .description(
      'Update the OpenAPI specification for newer version and generate Scalar API reference html'
   )
   .option('--group <name>', 'API group to update (e.g. Default)')
   .option('--input-oas <file>', 'Input OpenAPI spec file')
   .option('--output-dir <dir>', 'Output directory')
   .action(async (opts) => {
      const config = await loadConfig('xcc.config.js');
      let { openApiSpecs } = config;
      if (!Array.isArray(openApiSpecs)) openApiSpecs = Object.values(openApiSpecs);

      const groupsToRun = opts.group
         ? openApiSpecs.filter((g) => g.name === opts.group)
         : openApiSpecs;

      if (groupsToRun.length === 0) {
         console.error(`No open API spec config found with name "${opts.group}".`);
         process.exit(1);
      }

      for (const group of groupsToRun) {
         log.step(`Updating OpenAPI spec for group "${group.name}"`);
         const finalGroupConfig = { ...group, ...opts };
         await updateOpenapiSpec(finalGroupConfig.input, finalGroupConfig.output);
      }
      log.success('OpenAPI specs updated and references generated.');
   });

program
   .command('generate-client-sdk')
   .description(
      'Create a client library based on the OpenAPI specification.'
   )
   .option('--group <name>', 'API group to update (e.g. Default)')
   .option('--input-oas <file>', 'Input OpenAPI spec file')
   .option('--output-dir <dir>', 'Output directory')
   .action(async (opts) => {
      const config = await loadConfig('xcc.config.js');
      let { openApiSpecs } = config;
      if (!Array.isArray(openApiSpecs)) openApiSpecs = Object.values(openApiSpecs);

      const groupsToRun = opts.group
         ? openApiSpecs.filter((g) => g.name === opts.group)
         : openApiSpecs;

      if (groupsToRun.length === 0) {
         console.error(`No open API spec config found with name "${opts.group}".`);
         process.exit(1);
      }

      for (const group of groupsToRun) {
         log.step(`Updating OpenAPI spec for group "${group.name}"`);
         const finalGroupConfig = { ...group, ...opts };
         await generateClientSdk(finalGroupConfig.input, finalGroupConfig.output);
      }
      log.success('Client SDK generated successfully!');
   });

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
