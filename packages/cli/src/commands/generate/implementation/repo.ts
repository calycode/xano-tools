import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { log, intro, outro } from '@clack/prompts';
import { joinPath, dirname, replacePlaceholders, fetchAndExtractYaml } from '@repo/utils';
import {
   attachCliEventHandlers,
   clearDirectory,
   findProjectRoot,
   parseSchemaContents,
   printOutputDir,
   resolveConfigs,
} from '../../../utils/index';

async function generateRepo({
   instance,
   workspace,
   branch,
   input,
   output,
   fetch = false,
   printOutput = false,
   core,
}) {
   attachCliEventHandlers('generate-repo', core, {
      instance,
      workspace,
      branch,
      input,
      output,
      fetch,
      printOutput,
   });

   intro('Building directory structure...');

   let instanceConfig, workspaceConfig, branchConfig;
   if (input && !fetch) {
      // Skip context validation, provide dummy configs or minimal required fields
      instanceConfig = {
         name: instance || 'defaultInstance',
         process: { output: output || './output' },
      };
      workspaceConfig = { name: workspace || 'defaultWorkspace', id: 'dummyId' };
      branchConfig = { label: branch || 'main' };
   } else {
      // Perform normal context resolution and validation
      ({ instanceConfig, workspaceConfig, branchConfig } = await resolveConfigs({
         cliContext: { instance, workspace, branch },
         core,
      }));
   }

   // Resolve output dir
   const outputDir = output
      ? output
      : replacePlaceholders(instanceConfig.process.output, {
           '@': await findProjectRoot(),
           instance: instanceConfig.name,
           workspace: workspaceConfig.name,
           branch: branchConfig.label,
        });

   clearDirectory(outputDir);
   await mkdir(outputDir, { recursive: true });

   // Default to fetching the schema from the instance when no local input was
   // provided, so `generate repo` works with no arguments.
   let inputFile = input;
   const shouldFetch = fetch || !input;
   if (shouldFetch) {
      inputFile = await fetchAndExtractYaml({
         baseUrl: instanceConfig.url,
         token: await core.loadToken(instanceConfig.name),
         workspaceId: workspaceConfig.id,
         branchLabel: branchConfig.label,
         outDir: outputDir,
         core,
      });
   }

   if (!inputFile) throw new Error('Input schema file (.json or .yaml) is required');
   if (!outputDir) throw new Error('Output directory is required');

   log.step(`Reading and parsing schema file -> ${path.normalize(inputFile)}`);
   const fileContents = await core.storage.readFile(inputFile, 'utf8');

   const jsonData = parseSchemaContents(fileContents, inputFile);

   // 3. Proceed with generation
   const plannedWrites: { path: string; content: string }[] = await core.generateRepo({
      jsonData,
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });

   log.step(`Writing Repository to the output directory -> ${path.normalize(outputDir)}`);

   // Track results for logging
   const writeResults = await Promise.all(
      plannedWrites.map(async ({ path, content }) => {
         const outputPath = joinPath(outputDir, path);
         const writeDir = dirname(outputPath);

         try {
            if (!(await core.storage.exists(writeDir))) {
               await core.storage.mkdir(writeDir, { recursive: true });
            }
            await core.storage.writeFile(outputPath, content);
            return { path: outputPath, success: true };
         } catch (err) {
            return { path: outputPath, success: false, error: err };
         }
      })
   );

   // Summary log
   const failedWrites = writeResults.filter((r) => !r.success);
   if (failedWrites.length) {
      log.warn(`Some files failed to write (${failedWrites.length}):`);
      failedWrites.forEach((r) => log.warn(` - ${r.path}: ${r.error}`));
   } else {
      log.info('All files written successfully.');
   }

   printOutputDir(printOutput, outputDir);
   outro('Directory structure rebuilt successfully!');
}

export { generateRepo };
