import { existsSync, readdirSync, lstatSync, rmdirSync, unlinkSync } from 'fs';
import { log, intro, outro } from '@clack/prompts';
import { load } from 'js-yaml';
import { mkdir } from 'fs/promises';
import { joinPath, dirname } from '../../core/utils';
import {
   addFullContextOptions,
   addPrintOutputFlag,
   fetchAndExtractYaml,
   printOutputDir,
   replacePlaceholders,
   withErrorHandler,
} from '../utils/index';

/**
 * Clears the contents of a directory.
 * @param {string} directory - The directory to clear.
 */
function clearDirectory(directory) {
   if (existsSync(directory)) {
      readdirSync(directory).forEach((file) => {
         const curPath = joinPath(directory, file);
         if (lstatSync(curPath).isDirectory()) {
            clearDirectory(curPath);
            rmdirSync(curPath);
         } else {
            unlinkSync(curPath);
         }
      });
   }
}

async function generateRepo(
   instance,
   workspace,
   branch,
   input,
   output,
   fetch = false,
   printOutput = false,
   core
) {
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
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

   clearDirectory(outputDir);
   await mkdir(outputDir, { recursive: true });

   // Ensure we have the input file, default to local, but override if --fetch
   let inputFile = input;
   if (fetch) {
      inputFile = await fetchAndExtractYaml({
         baseUrl: instanceConfig.url,
         token: await core.loadToken(instanceConfig.name),
         workspaceId: workspaceConfig.id,
         branchLabel: branchConfig.label,
         outDir: outputDir,
         core,
      });
   }

   intro('Building directory structure...');

   if (!inputFile) throw new Error('Input YAML file is required');
   if (!outputDir) throw new Error('Output directory is required');

   log.step(`Reading and parsing YAML file -> ${inputFile}`);
   const fileContents = await core.storage.readFile(inputFile, 'utf8');
   const jsonData = load(fileContents);

   const plannedWrites: { path: string; content: string }[] = core.generateRepo(jsonData);
   await Promise.all(
      plannedWrites.map(async ({ path, content }) => {
         const outputPath = joinPath(outputDir, path);
         const writeDir = dirname(outputPath);
         if (!(await core.storage.exists(writeDir))) {
            await core.storage.mkdir(writeDir, { recursive: true });
         }
         await core.storage.writeFile(outputPath, content);
      })
   );
   outro('Directory structure rebuilt successfully!');

   printOutputDir(printOutput, outputDir);
}

// [ ] CLI
function registerGenerateRepoCommand(program, core) {
   const cmd = program
      .command('generate-repo')
      .description('Process Xano workspace into repo structure')
      .option('--input <file>', 'workspace yaml file')
      .option('--output <dir>', 'output directory (overrides config)');

   addFullContextOptions(cmd);
   addPrintOutputFlag(cmd);

   cmd.option('--fetch', 'Specify this if you want to fetch the workspace schema from Xano').action(
      withErrorHandler(async (opts) => {
         await generateRepo(
            opts.instance,
            opts.workspace,
            opts.branch,
            opts.input,
            opts.output,
            opts.fetch,
            opts.printOutput,
            core
         );
      })
   );
}

export { registerGenerateRepoCommand };
