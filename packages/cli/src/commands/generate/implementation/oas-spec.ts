import { normalizeApiGroupName, replacePlaceholders, joinPath, dirname } from '@repo/utils';
import {
   attachCliEventHandlers,
   chooseApiGroupOrAll,
   findProjectRoot,
   printOutputDir,
   resolveConfigs,
} from '../../../utils/index';

async function updateOasWizard({
   instance,
   workspace,
   branch,
   group,
   isAll = false,
   printOutput = false,
   core,
   includeTables = false,
}: {
   instance: string;
   workspace: string;
   branch: string;
   group: string;
   isAll: boolean;
   printOutput: boolean;
   core;
   includeTables?: boolean;
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
      startDir,
      includeTables
   );
   for (const { group, generatedItems } of allGroupResults) {
      const apiGroupNameNorm = normalizeApiGroupName(group);

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

export { updateOasWizard };
