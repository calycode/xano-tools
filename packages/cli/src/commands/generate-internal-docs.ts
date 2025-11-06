import { mkdir, access, readdir, lstat, rm, unlink } from 'node:fs/promises';
import { log, intro, outro } from '@clack/prompts';
import { load } from 'js-yaml';
import { joinPath, dirname, replacePlaceholders, fetchAndExtractYaml } from '@repo/utils';
import {
   addFullContextOptions,
   addPrintOutputFlag,
   attachCliEventHandlers,
   findProjectRoot,
   printOutputDir,
   resolveConfigs,
   withErrorHandler,
} from '../utils/index';

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

   if (!inputFile) throw new Error('Input YAML file is required');
   if (!outputDir) throw new Error('Output directory is required');

   log.step(`Reading and parsing YAML file -> ${inputFile}`);
   const fileContents = await core.storage.readFile(inputFile, 'utf8');
   const jsonData = load(fileContents);

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

function registergenerateInternalDocsCommand(program, core) {
   const cmd = program
      .command('generate-internal-docs')
      .description(
         'Collect all descriptions, and internal documentation from a Xano instance and combine it into a nice documentation suite that can be hosted on a static hosting.'
      )
      .option('-I, --input <file>', 'Workspace yaml file from a local source, if present.')
      .option(
         '-O, --output <dir>',
         'Output directory (overrides default config), useful when ran from a CI/CD pipeline and want to ensure consistent output location.'
      );

   addFullContextOptions(cmd);
   addPrintOutputFlag(cmd);

   cmd.option(
      '-F, --fetch',
      'Forces fetching the workspace schema from the Xano instance via metadata API.'
   ).action(
      withErrorHandler(async (opts) => {
         await generateInternalDocs({
            instance: opts.instance,
            workspace: opts.workspace,
            branch: opts.branch,
            input: opts.input,
            output: opts.output,
            fetch: opts.fetch,
            printOutput: opts.printOutputDir,
            core: core,
         });
      })
   );
}

export { registergenerateInternalDocsCommand };
