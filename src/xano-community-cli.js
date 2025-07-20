#!/usr/bin/env node
import { Command } from 'commander';
import { copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { processWorkspace } from './process-xano/index.js';
import { runLintXano } from './lint-xano/index.js';
import { prettyLog } from './process-xano/utils/console/prettify.js';

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
      const targetPath = join(process.cwd(), 'xcc.config.js');
      if (existsSync(targetPath)) {
         prettyLog(`Config already exists at -> ${targetPath}`, "info");
         return;
      }
      const templatePath = join(__dirname, 'config', 'xcc.config.js');
      copyFileSync(templatePath, targetPath);
      prettyLog(`Created config at -> ${targetPath}`, "success");
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
   .description('Run API tests')
   .option('--oas <file>', 'OpenAPI spec file')
   .option('--setup <file>', 'test setup file')
   .option('--assertions <file>', 'custom assertions config')
   .option('--secrets <file>', 'secrets/config file for secure values')
   .option('-o, --output <file>', 'test results output')
   .action((opts) => {
      console.log('Test command called with:');
      console.log('  OAS:', opts.oas);
      console.log('  Setup:', opts.setup);
      console.log('  Assertions:', opts.assertions);
      console.log('  Secrets:', opts.secrets);
      console.log('  Output:', opts.output);
   });

program.parse();
