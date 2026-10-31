import path from 'node:path';
import { log, intro, outro } from '@clack/prompts';
import { fetchAndExtractYaml } from '@repo/utils';
import {
   attachCliEventHandlers,
   createOutputFileSystem,
   parseSchemaContents,
   prepareOutputDirectory,
   printOutputDir,
   resolveOutputDestination,
   resolveConfigs,
   writeGeneratedOutput,
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
      // Local-input mode skips context validation by fabricating a dummy
      // context. Core still needs real config beyond the parsed schema (the
      // output template resolves against the project root, and any config or
      // network lookup Core performs sees the dummy ids), so pass `--output`
      // to avoid requiring instance.config.json.
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
   const outputDir = await resolveOutputDestination({
      template: instanceConfig.process.output,
      override: output,
      context: {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
      },
   });

   const fileSystem = createOutputFileSystem(core.storage);

   // Default to fetching the schema from the instance when no local input was
   // provided, so `generate repo` works with no arguments.
   let inputFile = input;
   const shouldFetch = fetch || !input;

   // Read a local schema before preparing the output: `--input` may live inside
   // `--output`, and preparation clears that directory.
   let jsonData;
   let parsedLocalSchema = false;
   if (!shouldFetch) {
      log.step(`Reading and parsing schema file -> ${path.normalize(inputFile)}`);
      const fileContents = await core.storage.readFile(inputFile, 'utf8');
      jsonData = parseSchemaContents(fileContents, inputFile);
      parsedLocalSchema = true;
   }

   // Prepare up front: the schema fetched below is extracted into this same
   // directory and must survive until the generated entries are written.
   await prepareOutputDirectory({ fileSystem, destination: outputDir });

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

   if (!parsedLocalSchema) {
      log.step(`Reading and parsing schema file -> ${path.normalize(inputFile)}`);
      const fileContents = await core.storage.readFile(inputFile, 'utf8');
      jsonData = parseSchemaContents(fileContents, inputFile);
   }

   // 3. Proceed with generation
   const plannedWrites: { path: string; content: string }[] = await core.generateRepo({
      jsonData,
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });

   log.step(`Writing Repository to the output directory -> ${path.normalize(outputDir)}`);

   const { failures } = await writeGeneratedOutput({
      fileSystem,
      destination: outputDir,
      entries: plannedWrites,
      clear: false,
      collectErrors: true,
   });

   // Summary log
   if (failures.length) {
      log.warn(`Some files failed to write (${failures.length}):`);
      failures.forEach((r) => log.warn(` - ${r.path}: ${r.error}`));
   } else {
      log.info('All files written successfully.');
   }

   printOutputDir(printOutput, outputDir);
   outro('Directory structure rebuilt successfully!');
}

export { generateRepo };
