import { mkdir } from 'fs/promises';
import { loadGlobalConfig, loadToken } from '../config/loaders.js';
import { getCurrentContextConfig , fetchAndExtractYaml , withErrorHandler } from '../utils/index.js';
import { replacePlaceholders } from '../features/tests/utils/replacePlaceholders.js';
import { processWorkspace } from '../features/process-xano/index.js';



async function generateRepo(instance, workspace, branch, input, output, fetch = false) {
   const globalConfig = loadGlobalConfig();
   // Merge CLI context with config
   const context = {
      instance: instance || globalConfig.currentContext.instance,
      workspace: workspace || globalConfig.currentContext.workspace,
      branch: branch || globalConfig.currentContext.branch,
   };
   const { instanceConfig, workspaceConfig, branchConfig } = getCurrentContextConfig(
      globalConfig,
      context
   );

   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      throw new Error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
   }

   // Resolve output dir
   const outputDir = output
      ? output
      : replacePlaceholders(instanceConfig.process.output, {
           instance: instanceConfig.name,
           workspace: workspaceConfig.name,
           branch: branchConfig.label,
        });

   // Make sure the dir exists.
   await mkdir(outputDir, { recursive: true });

   // Ensure we have the input file, default to local, but override if --fetch
   let inputFile = input;
   if (fetch) {
      inputFile = await fetchAndExtractYaml({
         baseUrl: instanceConfig.url,
         token: loadToken(instanceConfig.name),
         workspaceId: workspaceConfig.id,
         branchLabel: branchConfig.label,
         outDir: outputDir,
      });
   }

   if (!inputFile) throw new Error('Input YAML file is required');

   await processWorkspace({
      inputFile,
      outputDir,
   });
}

function registerGenerateRepoCommand(program) {
   program
      .command('generate-repo')
      .description('Process Xano workspace into repo structure')
      .option('-i, --input <file>', 'workspace yaml file')
      .option('-o, --output <dir>', 'output directory (overrides config)')
      .option('--instance <instance>')
      .option('--workspace <workspace>')
      .option('--branch <branch>')
      .option('--fetch', 'Specify this if you want to fetch the workspace schema from Xano')
      .action(
         withErrorHandler(async (opts) => {
            await generateRepo(
               opts.instance,
               opts.workspace,
               opts.branch,
               opts.input,
               opts.output,
               opts.fetch
            );
         })
      );
}

export { registerGenerateRepoCommand };
