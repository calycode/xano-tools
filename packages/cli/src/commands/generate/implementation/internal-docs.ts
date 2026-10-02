import { mkdir } from 'node:fs/promises';
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

async function generateInternalDocs({
   instance,
   workspace,
   branch,
   input,
   output,
   fetch = false,
   printOutput = false,
   core,
}) {
   attachCliEventHandlers('generate-internal-docs', core, {
      instance,
      workspace,
      branch,
      input,
      output,
      fetch,
      printOutput,
   });

   //const resolvedContext = await resolveEffectiveContext({ instance, workspace, branch }, core);
   const { instanceConfig, workspaceConfig, branchConfig } = await resolveConfigs({
      cliContext: { instance, workspace, branch },
      core,
   });

   // Resolve output dir
   const outputDir = output
      ? output
      : replacePlaceholders(instanceConfig.internalDocs.output, {
           '@': await findProjectRoot(),
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

   if (!inputFile) throw new Error('Input schema file (.json or .yaml) is required');
   if (!outputDir) throw new Error('Output directory is required');

   log.step(`Reading and parsing schema file -> ${inputFile}`);
   const fileContents = await core.storage.readFile(inputFile, 'utf8');

   const jsonData = parseSchemaContents(fileContents, inputFile);

   const plannedWrites: { path: string; content: string }[] = await core.generateInternalDocs({
      jsonData,
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });
   log.step(`Writing Documentation to the output directory -> ${outputDir}`);
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

   printOutputDir(printOutput, outputDir);
   outro('Documentation built successfully!');
}

export { generateInternalDocs };
