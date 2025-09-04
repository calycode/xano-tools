import { normalizeApiGroupName, replacePlaceholders, joinPath, dirname } from '@calycode/utils';
import {
   addApiGroupOptions,
   addFullContextOptions,
   addPrintOutputFlag,
   chooseApiGroupOrAll,
   printOutputDir,
   withErrorHandler,
} from '../utils/index';
import { attachCliEventHandlers } from '../utils/event-listener';
import { resolveConfigs } from '../utils/commands/context-resolution';
import { findProjectRoot } from '../utils/commands/project-root-finder';

async function updateOasWizard({
   instance,
   workspace,
   branch,
   group,
   isAll = false,
   printOutput = false,
   core,
}: {
   instance: string;
   workspace: string;
   branch: string;
   group: string;
   isAll: boolean;
   printOutput: boolean;
   core;
}) {
   attachCliEventHandlers('generate-oas', core, {
      instance,
      workspace,
      branch,
      group,
      isAll,
      printOutput,
   });

   const startDir = process.cwd();

   const { instanceConfig, workspaceConfig, branchConfig } = await resolveConfigs({
      cliContext: { instance, workspace, branch },
      core,
   });

   // Get API groups (prompt or all)
   const groups = await chooseApiGroupOrAll({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
      workspace_id: workspaceConfig.id,
      branchLabel: branchConfig.label,
      promptUser: !isAll && !group,
      groupName: group,
      all: isAll,
   });

   const allGroupResults: {
      group: string;
      oas: any;
      generatedItems: { path: string; content: string }[];
   }[] = await core.updateOpenapiSpec(
      instanceConfig.name,
      workspaceConfig.name,
      branchConfig.label,
      groups,
      startDir
   );
   for (const { group, generatedItems } of allGroupResults) {
      const apiGroupNameNorm = normalizeApiGroupName(group);

      // [x] This is going to be relative to the working dir, but we have to force the structure...
      const outputPath = replacePlaceholders(instanceConfig.openApiSpec.output, {
         '@': await findProjectRoot(),
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
         api_group_normalized_name: apiGroupNameNorm,
      });

      await Promise.all(
         generatedItems.map(async ({ path, content }) => {
            const finalPath = joinPath(outputPath, path);
            const writeDir = dirname(finalPath);
            if (!(await core.storage.exists(writeDir))) {
               await core.storage.mkdir(writeDir, { recursive: true });
            }
            await core.storage.writeFile(finalPath, content);
         })
      );

      printOutputDir(printOutput, outputPath);
   }
}

function registerGenerateOasCommand(program, core) {
   const cmd = program
      .command('generate-oas')
      .description('Update and generate OpenAPI spec(s) for the current context.');

   addFullContextOptions(cmd);
   addApiGroupOptions(cmd);
   addPrintOutputFlag(cmd);

   cmd.action(
      withErrorHandler(async (opts) => {
         await updateOasWizard({
            instance: opts.instance,
            workspace: opts.workspace,
            branch: opts.branch,
            group: opts.group,
            isAll: opts.all,
            printOutput: opts.printOutputDir,
            core: core,
         });
      })
   );
}

export { registerGenerateOasCommand };
