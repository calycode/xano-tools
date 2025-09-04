import { log } from '@clack/prompts';
import { replacePlaceholders } from '@calycode/utils';
import { addPrintOutputFlag, printOutputDir, withErrorHandler } from '../utils/index';
import { runLintXano } from '../features/lint-xano';
import { findProjectRoot } from '../utils/commands/project-root-finder';

// [ ] CORE
async function runLinter(printOutput: boolean = false, core) {
   const globalConfig = await core.loadGlobalConfig();
   const context = globalConfig.currentContext;

   const startDir = process.cwd();
   const { instanceConfig, workspaceConfig, branchConfig } = await core.getCurrentContextConfig({
      startDir,
      context,
   });

   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      log.error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
      process.exit(1);
   }

   const inputDir = replacePlaceholders(instanceConfig.process.output, {
      '@': await findProjectRoot(),
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });

   if (!inputDir) throw new Error('Input YAML file is required');

   const outputDir = replacePlaceholders(instanceConfig.lint.output, {
      '@': await findProjectRoot(),
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });
   const now = new Date();
   const ts = now.toISOString().replace(/[:.]/g, '-');
   const outputPath = `${outputDir}/report-${ts}.json`;

   const ruleConfig = instanceConfig.lint.rules;

   log.info(
      `Lint ${instanceConfig.name} > ${workspaceConfig.name} > ${branchConfig.label} in progress.`
   );

   await runLintXano({ inputDir, ruleConfig, outputFile: outputPath });
   printOutputDir(printOutput, outputDir);
}

// [ ] CLI
function registerLintCommand(program, core) {
   const cmd = program
      .command('lint')
      .description(
         'Lint backend logic, based on provided local file. Remote and dynamic sources are WIP...'
      );

   addPrintOutputFlag(cmd);
   cmd.action(
      withErrorHandler(async (opts) => {
         await runLinter(opts.printOutput, core);
      })
   );
}

export { registerLintCommand };
