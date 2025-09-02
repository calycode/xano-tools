import { mkdir } from 'fs/promises';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { log, outro, intro, spinner } from '@clack/prompts';
import { metaApiGet, replacePlaceholders, sanitizeFileName } from '@calycode/utils';
import {
   withErrorHandler,
   addFullContextOptions,
   addPrintOutputFlag,
   printOutputDir,
} from '../utils/index';
import { resolveEffectiveContext } from '../utils/commands/context-resolution';

// [ ] CORE, but needs fs access.
async function fetchFunctionsInXanoScript(instance, workspace, branch, printOutput = false, core) {
   intro('Starting to analyze functions.');
   let branchFunctions = {};
   const resolvedContext = await resolveEffectiveContext({ instance, workspace, branch }, core);
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext(
      resolvedContext
   );

   // Resolve output dir
   const outputDir = replacePlaceholders(instanceConfig['xano-script'].output, {
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });

   // Make sure the dir exists.
   await mkdir(outputDir, { recursive: true });

   // Setup up spinner reference:
   const s = spinner();

   try {
      // 1. Fetch all functions for this workspace. Core data and ids (to allow for individual fetching.)
      const branchFunctionsResponse = await metaApiGet({
         baseUrl: instanceConfig.url,
         token: await core.loadToken(instanceConfig.name),
         path: `/workspace/${workspaceConfig.id}/function`,
         query: {
            page: 1,
            per_page: 500,
            branch: branchConfig.label,
            sort: 'updated_at',
            order: 'desc',
         },
      });

      (branchFunctionsResponse.items ?? []).map((func) => {
         const { id, name } = func;
         branchFunctions[`${id}`] = { name };
      });

      log.step(`Fetched all functions.`);

      s.start(`Generating .xs files for fetched functions...`);
      // 2. Loop through each of these functions and try to fetch their Xano Script representation.
      for (const item of Object.keys(branchFunctions)) {
         const itemDefinition = await metaApiGet({
            baseUrl: instanceConfig.url,
            token: await core.loadToken(instanceConfig.name),
            path: `/beta/workspace/${workspaceConfig.id}/function/${item}`,
            query: {
               include_draft: false,
               type: 'xs',
            },
            allowError: true,
         });

         branchFunctions[item].script =
            itemDefinition?.script ??
            `function ${branchFunctions[item].name} {\n  description = "function id: ${item} Xano Script fetching failed"\n}`;
         // Build the full file path
         const fileName = sanitizeFileName(branchFunctions[item].name) + '.xs';
         const filePath = join(outputDir, fileName);

         // Ensure the parent directory exists
         const parentDir = dirname(filePath);
         if (!existsSync(parentDir)) {
            mkdirSync(parentDir, { recursive: true });
         }

         // Write the file
         writeFileSync(filePath, branchFunctions[item].script);
      }
      s.stop(`Xano Script files are ready -> ${outputDir}`);
   } catch (err) {
      s.stop(`Xano Script file generation failed: ${err.message || JSON.stringify(err)}`);
   }

   outro('Analysis completed.');
   printOutputDir(printOutput, outputDir);
}

// [ ] CLI
function registerFetchFunctionsInXanoScript(program, core) {
   const cmd = program
      .command('generate-functions')
      .description('Analyze the functions available in the current (or provided) context.');

   addFullContextOptions(cmd);
   addPrintOutputFlag(cmd);
   cmd.action(
      withErrorHandler(async (opts) => {
         await fetchFunctionsInXanoScript(
            opts.instance,
            opts.workspace,
            opts.branch,
            opts.printOutputDir,
            core
         );
      })
   );
}

export { registerFetchFunctionsInXanoScript };
