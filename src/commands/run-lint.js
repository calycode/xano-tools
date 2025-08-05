import { loadGlobalConfig } from '../config/loaders.js';
import { getCurrentContextConfig } from '../utils/context/index.js';
import { log } from '@clack/prompts';
import { replacePlaceholders } from '../features/tests/utils/replacePlaceholders.js';
import { runLintXano } from '../features/lint-xano/index.js';

export async function runLinter() {
   const globalConfig = loadGlobalConfig();
   const context = globalConfig.currentContext;

   const { instanceConfig, workspaceConfig, branchConfig } = getCurrentContextConfig(
      globalConfig,
      context
   );

   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      log.error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
      process.exit(1);
   }

   const inputDir = replacePlaceholders(instanceConfig.process.output, {
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });

   if (!inputDir) throw new Error('Input YAML file is required');

   const outputDir = replacePlaceholders(instanceConfig.lint.output, {
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });
   const now = new Date();
   const ts = now.toISOString().replace(/[:.]/g, '-');
   const outputPath = `${outputDir}/report-${ts}.json`;

   const ruleConfig = instanceConfig.lint.rules;

   log.info(`Lint ${instanceConfig.name} > ${workspaceConfig.name} > ${branchConfig.label} in progress.`)

   await runLintXano({inputDir, ruleConfig, outputFile: outputPath});
}
