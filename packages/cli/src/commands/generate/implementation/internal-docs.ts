import { mkdir, access, readdir, lstat, rm, unlink } from 'node:fs/promises';
import { log, intro, outro } from '@clack/prompts';
import { load } from 'js-yaml';
import { joinPath, dirname, replacePlaceholders, fetchAndExtractYaml } from '@repo/utils';
import {
   attachCliEventHandlers,
   findProjectRoot,
   printOutputDir,
   resolveConfigs,
} from '../../../utils/index';

/**
 * Recursively removes all files and subdirectories in a directory.
 * @param {string} directory - The directory to clear.
 */
async function clearDirectory(directory: string): Promise<void> {
   try {
      await access(directory);
   } catch {
      // Directory does not exist; nothing to clear
      return;
   }

   const files = await readdir(directory);
   await Promise.all(
      files.map(async (file) => {
         const curPath = joinPath(directory, file);
         const stat = await lstat(curPath);
         if (stat.isDirectory()) {
            await clearDirectory(curPath);
            await rm(curPath, { recursive: true, force: true }); // removes the (now-empty) dir
         } else {
            await unlink(curPath);
         }
      })
   );
}

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

   let jsonData: any;
   try {
      if (inputFile.endsWith('.json')) {
         jsonData = JSON.parse(fileContents);
      } else if (inputFile.endsWith('.yaml') || inputFile.endsWith('.yml')) {
         jsonData = load(fileContents);
      } else {
         // Fallback: Try JSON, then YAML if extension is missing or weird
         try {
            jsonData = JSON.parse(fileContents);
         } catch {
            jsonData = load(fileContents);
         }
      }
   } catch (err) {
      throw new Error(`Failed to parse schema file: ${err.message}`);
   }

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
