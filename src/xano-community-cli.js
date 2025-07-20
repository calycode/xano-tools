#!/usr/bin/env node
import { Command } from 'commander';
import { copyFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { processWorkspace } from './process-xano/index.js';
import { runLintXano } from './lint-xano/index.js';
import { prettyLog } from './process-xano/utils/console/prettify.js';
import { runTestSuite } from './tests/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- UTILITIES -------------- //
async function loadConfig(configFileName = 'xcc.config.js', configSection = null) {
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

function copyConfigTemplate(templateName, targetName) {
   const targetPath = join(process.cwd(), targetName);
   if (existsSync(targetPath)) {
      prettyLog(`Config already exists at -> ${targetPath}`, 'info');
      return false;
   }
   const templatePath = join(__dirname, 'config', templateName);
   copyFileSync(templatePath, targetPath);
   prettyLog(`Created config at -> ${targetPath}`, 'success');
   return true;
}

async function handleCommand(section, opts, runner, configFile = 'xcc.config.js') {
   const defaultConfig = await loadConfig(configFile, section);
   const finalConfig = { ...defaultConfig, ...opts };
   await runner(finalConfig);
}

const program = new Command();

program
   .name('xano-community-cli')
   .description('CLI for processing, linting, and testing Xano backend logic')
   .version('0.0.1')
   .exitOverride(() => {
      process.exit(0);
   });

program
   .command('setup')
   .description('Setup Xano Community CLI configurations')
   .action(() => {
      copyConfigTemplate('xcc.config.js', 'xcc.config.js');
      copyConfigTemplate('xcc.test.setup.json', 'xcc.test.setup.json');
   });

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
   .option('--test-config <file>', 'Custom test config file')
   .option('--oas <file>', 'OpenAPI spec file')
   .option('--setup <file>', 'test setup file')
   .option('--secrets <file>', 'secrets/config file')
   .option('--output <file>', 'test results output')
   .option('--base-url <url>', 'API base URL')
   .action((opts) => handleCommand('test', opts, runTestSuite));

program.parse();

// Add this at the end:
if (!process.argv.slice(2).length) {
   program.outputHelp();
   process.exit(0); // <-- success code, not error
}