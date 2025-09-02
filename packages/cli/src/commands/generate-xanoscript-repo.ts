import { existsSync, readdirSync, lstatSync, rmdirSync, unlinkSync, mkdirSync } from 'fs';
import { joinPath, dirname } from '@calycode/utils';
import { attachCliEventHandlers } from '../utils/event-listener';
import { replacePlaceholders } from '@calycode/utils';
import { printOutputDir } from '../utils';
import { addFullContextOptions, addPrintOutputFlag, withErrorHandler } from '../utils';
import { resolveEffectiveContext } from '../utils/commands/context-resolution';

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

async function generateXanoscriptRepo({ instance, workspace, branch, core, printOutput = false }) {
   attachCliEventHandlers('generate-xs-repo', core, {
      instance,
      workspace,
      branch,
   });

   const resolvedContext = await resolveEffectiveContext({ instance, workspace, branch }, core);
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext(
      resolvedContext
   );

   // Resolve output dir
   const outputDir = replacePlaceholders(instanceConfig.xanoscript.output, {
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });

   clearDirectory(outputDir);
   await mkdirSync(outputDir, { recursive: true });

   const plannedWrites: { path: string; content: string }[] = await core.buildXanoscriptRepo({
      instance,
      workspace,
      branch,
   });
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
}

function registerBuildXanoscriptRepoCommand(program, core) {
   const cmd = program
      .command('generate-xs-repo')
      .description('Process Xano workspace into repo structure');

   addFullContextOptions(cmd);
   addPrintOutputFlag(cmd);

   cmd.action(
      withErrorHandler(async (opts) => {
         await generateXanoscriptRepo({
            instance: opts.instance,
            workspace: opts.workspace,
            branch: opts.branch,
            core: core,
            printOutput: opts.printOutputDir,
         });
      })
   );
}

export { registerBuildXanoscriptRepoCommand };
