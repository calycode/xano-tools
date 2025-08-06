import { log, outro, intro } from '@clack/prompts';
import { loadToken } from '../config/loaders.js';
import {
   chooseApiGroupOrAll,
   loadAndValidateContext,
   withErrorHandler,
} from '../utils/index.js';
import { updateSpecForGroup } from '../features/oas/generate/index.js';

async function updateOpenapiSpec(instance, workspace, branch, group, isAll) {
   intro('🔄 Starting to generate OpenAPI specifications.');
   try {
      const { instanceConfig, workspaceConfig, branchConfig } = loadAndValidateContext({
         instance,
         workspace,
         branch,
         group,
      });

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

      // 3. For each group, update the spec
      for (const grp of groups) {
         await updateSpecForGroup({
            group: grp,
            instanceConfig,
            workspaceConfig,
            branchConfig,
         });
      }
      outro('All OpenAPI specifications generated.');
   } catch (err) {
      log.error(err.message || err);
   }
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
