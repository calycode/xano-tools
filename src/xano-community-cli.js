#!/usr/bin/env node
import { Command } from 'commander';
import { copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { processWorkspace } from './process-xano/index.js';
import { runLintXano } from './lint-xano/index.js';
import { prettyLog } from './process-xano/utils/console/prettify.js';
import { runTestSuite } from './tests/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const program = new Command();

async function useConfig() {
   try {
      // Try user config in current working directory
      const userConfigPath = join(process.cwd(), 'xcc.config.js');
      return (await import(pathToFileURL(userConfigPath))).default;
   } catch (e1) {
      try {
         // Try internal default config in src/config/xcc.config.js
         const internalConfigPath = join(__dirname, 'config', 'xcc.config.js');
         return (await import(pathToFileURL(internalConfigPath))).default;
      } catch (e2) {
         prettyLog('No config file found and no internal default config present!', 'error');
         process.exit(1);
      }
   }
}

program
   .name('xano-community-cli')
   .description('CLI for processing, linting, and testing Xano backend logic')
   .version('0.0.1');

program
   .command('setup')
   .description('Setup Xano Community CLI configurations')
   .action(() => {
      // Create the configuration:
      const configTargetPath = join(process.cwd(), 'xcc.config.js');
      if (existsSync(configTargetPath)) {
         prettyLog(`Config already exists at -> ${configTargetPath}`, "info");
         return;
      }
      const configTemplatePath = join(__dirname, 'config', 'xcc.config.js');
      copyFileSync(configTemplatePath, configTargetPath);
      prettyLog(`Created config at -> ${configTargetPath}`, "success");

      // Create the test setup:
      const testSetupTargetPath = join(process.cwd(), 'xcc.test.setup.json');
      if (existsSync(testSetupTargetPath)) {
         prettyLog(`Config already exists at -> ${testSetupTargetPath}`, 'info');
         return;
      }
      const testSetupTemplatePath = join(__dirname, 'config', 'xcc.test.setup.json');
      copyFileSync(testSetupTemplatePath, testSetupTargetPath);
      prettyLog(`Created test setup at -> ${testSetupTargetPath}`, 'success');
   });

program
   .command('process')
   .description('Process Xano workspace into repo structure')
   .option('-i, --input <file>', 'workspace yaml file')
   .option('-o, --output <dir>', 'output directory')
   .action(async (opts) => {
      const defaultConfig = await useConfig();
      const finalConfig = { ...defaultConfig.process, ...opts };
      await processWorkspace({
         inputFile: finalConfig.input,
         outputDir: finalConfig.output,
      });
   });

program
   .command('lint')
   .description('Lint backend logic')
   .option('-i, --input <file>', 'workspace yaml file')
   .option('-c, --config <file>', 'lint rules config')
   .option('-o, --output <file>', 'lint output file')
   .action(async (opts) => {
      const defaultConfig = await useConfig();
      const finalConfig = { ...defaultConfig.lint, ...opts };
      await runLintXano({
         inputDir: finalConfig.input,
         outputFile: finalConfig.output,
         ruleConfig: finalConfig.rules,
      });
   });

program
   .command('test')
   .option('--test-config <file>', 'Custom test config file')
   .option('--oas <file>', 'OpenAPI spec file')
   .option('--setup <file>', 'test setup file')
   .option('--secrets <file>', 'secrets/config file')
   .option('--output <file>', 'test results output')
   .option('--base-url <url>', 'API base URL')
   .action(async (opts) => {
      // 1. Load config
      let testConfig = {};
      if (opts.testConfig) {
         testConfig = (await import(pathToFileURL(opts.testConfig))).default?.test || {};
      } else {
         try {
            testConfig = (
               await import(pathToFileURL(path.join(process.cwd(), 'xcc.config.js')))
            ).default?.test || {};
         } catch {
            testConfig = (
               await import(pathToFileURL(path.join(__dirname, 'config', 'xcc.config.js')))
            ).default?.test || {};
         }
      }
      // 2. Merge CLI flags (override config)
      const finalConfig = { ...testConfig, ...opts };
      // 3. Run your test runner with the merged config
      await runTestSuite(finalConfig);
   });

program.parse();
