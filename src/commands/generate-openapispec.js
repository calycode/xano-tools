import { log, outro, intro } from '@clack/prompts';
import { loadGlobalConfig, loadToken } from '../config/loaders.js';
import { getCurrentContextConfig , metaApiGet , chooseApiGroupOrAll , withErrorHandler } from '../utils/index.js';

import { replacePlaceholders } from '../features/tests/utils/replacePlaceholders.js';
import { normalizeApiGroupName } from '../utils/methods/normalize-api-group-name.js';

import { doOasUpdate } from '../features/oas/update/index.js';


async function updateOpenapiSpec(instance, workspace, branch, group, isAll) {
   intro('🔄 Starting to update OpenAPI Spec');

   const globalConfig = loadGlobalConfig();
   const context = {
      ...globalConfig.currentContext,
      instance,
      workspace,
      branch,
      group,
   };
   const { instanceConfig, workspaceConfig, branchConfig } = getCurrentContextConfig(
      globalConfig,
      context
   );

   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      log.error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
      process.exit(1);
   }

   // 2. Get API groups (prompt or all)
   const groups = await chooseApiGroupOrAll({
      baseUrl: instanceConfig.url,
      token: loadToken(instanceConfig.name),
      workspace_id: workspaceConfig.id,
      branchLabel: branchConfig.label,
      promptUser: !isAll && !group,
      groupName: group,
      all: !!isAll,
   });

   // 3. For each group selected, regenerate OpenAPI spec
   for (const group of groups) {
      const apiGroupNameNorm = normalizeApiGroupName(group.name);
      const outputPath = replacePlaceholders(instanceConfig.openApiSpec.output, {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
         api_group_normalized_name: apiGroupNameNorm,
      });

      const openapiRaw = await metaApiGet({
         baseUrl: instanceConfig.url,
         token: loadToken(instanceConfig.name),
         path: `/workspace/${workspaceConfig.id}/apigroup/${group.id}/openapi`,
      });

      // Prepare for better usability
      await doOasUpdate(openapiRaw, outputPath);

      log.success(`OpenAPI spec updated for group "${group.name}" → ${outputPath}`);
   }
   outro('All OpenAPI specs updated!');
}

function registerGenerateOasCommand(program) {
   program
      .command('generate-oas')
      .description('Update and generate OpenAPI spec(s) for the current context.')
      .option('--instance <instance>')
      .option('--workspace <workspace>')
      .option('--branch <branch>')
      .option('--group <name>', 'API group to update')
      .option('--all', 'Regenerate for all API groups in workspace/branch')
      .action(
         withErrorHandler(async (opts) => {
            await updateOpenapiSpec(
               opts.instance,
               opts.workspace,
               opts.branch,
               opts.group,
               opts.all
            );
         })
      );
}

export { registerGenerateOasCommand };
