import { mkdir } from 'node:fs/promises';
import { joinPath, dirname, replacePlaceholders } from '@repo/utils';
import {
   attachCliEventHandlers,
   clearDirectory,
   findProjectRoot,
   printOutputDir,
   resolveConfigs,
} from '../../../utils';

async function generateXanoscriptRepo({ instance, workspace, branch, core, printOutput = false }) {
   attachCliEventHandlers('generate-xs-repo', core, {
      instance,
      workspace,
      branch,
   });
   const { instanceConfig, workspaceConfig, branchConfig, context } = await resolveConfigs({
      requiredFields: ['instance', 'workspace', 'branch'],
      cliContext: { instance, workspace, branch },
      core,
   });

   // Resolve output dir
   const outputDir = replacePlaceholders(instanceConfig.xanoscript.output, {
      '@': await findProjectRoot(),
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });

   clearDirectory(outputDir);
   await mkdir(outputDir, { recursive: true });

   const plannedWrites: { path: string; content: string }[] = await core.buildXanoscriptRepo({
      instance: context.instance,
      workspace: context.workspace,
      branch: context.branch,
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

export { generateXanoscriptRepo };
