import { mkdir } from 'fs/promises';
import { loadToken } from '../config/loaders.js';
import {
   addFullContextOptions,
   fetchAndExtractYaml,
   loadAndValidateContext,
   replacePlaceholders,
   withErrorHandler,
} from '../utils/index.js';
import { processWorkspace } from '../features/process-xano/index.js';

async function generateRepo(instance, workspace, branch, input, output, fetch = false) {
   const { instanceConfig, workspaceConfig, branchConfig } = loadAndValidateContext({
      instance,
      workspace,
      branch,
   });

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

   processWorkspace({
      inputFile,
      outputDir,
   });
}

function registerGenerateRepoCommand(program) {
   const cmd = program
      .command('generate-repo')
      .description('Process Xano workspace into repo structure')
      .option('--input <file>', 'workspace yaml file')
      .option('--output <dir>', 'output directory (overrides config)');

   addFullContextOptions(cmd);

   cmd.option('--fetch', 'Specify this if you want to fetch the workspace schema from Xano').action(
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
