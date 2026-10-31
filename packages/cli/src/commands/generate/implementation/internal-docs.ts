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
   const outputDir = await resolveOutputDestination({
      template: instanceConfig.internalDocs.output,
      override: output,
      context: {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
      },
   });

   const fileSystem = createOutputFileSystem(core.storage);

   // Read a local schema before preparing the output: `--input` may live inside
   // `--output`, and preparation clears that directory.
   let inputFile = input;
   let jsonData;
   let parsedLocalSchema = false;
   if (!fetch && inputFile) {
      log.step(`Reading and parsing schema file -> ${path.normalize(inputFile)}`);
      const fileContents = await core.storage.readFile(inputFile, 'utf8');
      jsonData = parseSchemaContents(fileContents, inputFile);
      parsedLocalSchema = true;
   }

   // Prepare up front: the fetched schema is extracted into this directory and
   // must survive until the generated entries are written.
   await prepareOutputDirectory({ fileSystem, destination: outputDir });

   // Ensure we have the input file, default to local, but override if --fetch
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

   if (!parsedLocalSchema) {
      log.step(`Reading and parsing schema file -> ${path.normalize(inputFile)}`);
      const fileContents = await core.storage.readFile(inputFile, 'utf8');
      jsonData = parseSchemaContents(fileContents, inputFile);
   }

   const plannedWrites: { path: string; content: string }[] = await core.generateInternalDocs({
      jsonData,
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });
   log.step(`Writing Documentation to the output directory -> ${outputDir}`);
   await writeGeneratedOutput({
      fileSystem,
      destination: outputDir,
      entries: plannedWrites,
      clear: false,
   });

   printOutputDir(printOutput, outputDir);
   outro('Documentation built successfully!');
}

export { generateInternalDocs };
