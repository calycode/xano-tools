import { log, outro, intro } from '@clack/prompts';
import { loadToken } from '../config/loaders';
import {
   addApiGroupOptions,
   addFullContextOptions,
   chooseApiGroupOrAll,
   loadAndValidateContext,
   withErrorHandler,
} from '../utils/index';
import { updateSpecForGroup } from '../features/oas/generate/index';

async function updateOpenapiSpec(instance, workspace, branch, group, isAll) {
   intro('🔄 Starting to generate OpenAPI specifications.');
   try {
      const { instanceConfig, workspaceConfig, branchConfig } = loadAndValidateContext({
         instance,
         workspace,
         branch,
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
   const cmd = program
      .command('generate-oas')
      .description('Update and generate OpenAPI spec(s) for the current context.');

   addFullContextOptions(cmd);
   addApiGroupOptions(cmd);

   cmd.action(
      withErrorHandler(async (opts) => {
         await updateOpenapiSpec(opts.instance, opts.workspace, opts.branch, opts.group, opts.all);
      })
   );
}

export { registerGenerateOasCommand };
