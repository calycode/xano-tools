import { log, outro, intro, spinner } from '@clack/prompts';
import { metaApiGet, normalizeApiGroupName, replacePlaceholders } from '@repo/utils';
import {
   chooseApiGroupOrAll,
   findProjectRoot,
   printOutputDir,
   resolveConfigs,
} from '../../../utils/index';
import { runOpenApiGenerator } from '../../../features/code-gen/open-api-generator';

async function generateCodeFromOas({
   instance,
   workspace,
   branch,
   group,
   isAll = false,
   stack = {
      generator: 'typescript-fetch',
      args: ['--additional-properties=supportsES6=true'],
   },
   logger = false,
   printOutput = false,
   core,
}: {
   instance: string;
   workspace: string;
   branch: string;
   group: string;
   isAll: boolean;
   stack: { generator: string; args: string[] };
   logger: boolean;
   printOutput: boolean;
   core;
}) {
   const startTime: Date = new Date();
   intro('🔄 Starting to generate code');

   const { instanceConfig, workspaceConfig, branchConfig } = await resolveConfigs({
      cliContext: { instance, workspace, branch },
      core,
   });

   // Determine generator and extra args
   const generator = stack.generator || 'typescript-fetch';
   const additionalArgs = stack.args || [];

   // 2. Get API groups (prompt or all)
   const groups = await chooseApiGroupOrAll({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
      workspace_id: workspaceConfig.id,
      branchLabel: branchConfig.label,
      promptUser: !isAll && !group,
      groupName: group,
      all: !!isAll,
   });

   // 3. For each group selected, regenerate OpenAPI spec
   for (const group of groups) {
      const s = spinner();
      s.start(`Generating code for group "${group.name}" with generator "${generator}"`);

      const apiGroupNameNorm = normalizeApiGroupName(group.name);
      const outputPath = replacePlaceholders(instanceConfig.codegen.output, {
         '@': await findProjectRoot(),
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
         api_group_normalized_name: apiGroupNameNorm,
      });

      const openapiRaw = await metaApiGet({
         baseUrl: instanceConfig.url,
         token: await core.loadToken(instanceConfig.name),
         path: `/workspace/${workspaceConfig.id}/apigroup/${group.id}/openapi`,
      });

      // Prepare for better usability
      const { oas } = await core.doOasUpdate({
         inputOas: openapiRaw,
         outputDir: outputPath,
         instanceConfig,
         workspaceConfig,
         storage: core.storage,
      });

      // Create a temp file for the oas to reuse:
      await core.storage.mkdir(outputPath, { recursive: true });
      await core.storage.writeFile(`${outputPath}/spec.json`, JSON.stringify(oas, null, 2));

      try {
         await runOpenApiGenerator({
            input: `${outputPath}/spec.json`,
            output: `${outputPath}/${generator}`,
            generator,
            additionalArgs,
            logger,
         });
         s.stop(`Code generated for group "${group.name}" → ${outputPath}/${generator}`);
         printOutputDir(printOutput, outputPath);
      } catch (err) {
         s.stop();
         log.error(err.message);
      }
   }

   const endTime: Date = new Date();
   const duration: number = endTime.getTime() - startTime.getTime();
   outro(`Code successfully generated! Process took: ${duration}ms`);
}

export { generateCodeFromOas };
