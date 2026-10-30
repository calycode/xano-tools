import { normalizeApiGroupName } from '@repo/utils';
import {
   attachCliEventHandlers,
   chooseApiGroupOrAll,
   createArtifactFileSystem,
   printOutputDir,
   resolveArtifactDestination,
   resolveConfigs,
   writeArtifacts,
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

   const fileSystem = createArtifactFileSystem(core.storage);

   for (const { group, generatedItems } of allGroupResults) {
      const apiGroupNameNorm = normalizeApiGroupName(group);

      const outputPath = await resolveArtifactDestination({
         template: instanceConfig.openApiSpec.output,
         context: {
            instance: instanceConfig.name,
            workspace: workspaceConfig.name,
            branch: branchConfig.label,
            apiGroupNormalized: apiGroupNameNorm,
         },
      });

      // Existing spec output is not cleared: it can be regenerated per group
      // and stale sibling files are intentionally left in place.
      await writeArtifacts({
         fileSystem,
         destination: outputPath,
         entries: generatedItems,
         clear: false,
      });

      printOutputDir(printOutput, outputPath);
   }
}

export { updateOasWizard };
