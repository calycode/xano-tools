import { log, outro, intro } from '@clack/prompts';
import { loadToken } from '../config/loaders';
import {
   addApiGroupOptions,
   addFullContextOptions,
   addPrintOutputFlag,
   chooseApiGroupOrAll,
   withErrorHandler,
} from '../utils/index';
import { updateSpecForGroup } from '../features/oas/generate';

// [ ] CORE
async function updateOpenapiSpec(
   instance: string,
   workspace: string,
   branch: string,
   group: string,
   isAll: boolean,
   printOutput: boolean = false,
   core
) {
   intro('🔄 Starting to generate OpenAPI specifications.');
   try {
      const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
         instance,
         workspace,
         branch,
      });

      // 2. Get API groups (prompt or all)
      const groups = await chooseApiGroupOrAll({
         baseUrl: instanceConfig.url,
         token: await loadToken(instanceConfig.name),
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
            printOutput,
         });
      }
      outro('All OpenAPI specifications generated.');
   } catch (err) {
      log.error(err.message || err);
   }
}

// [ ] CLI
function registerGenerateOasCommand(program, core) {
   const cmd = program
      .command('generate-oas')
      .description('Update and generate OpenAPI spec(s) for the current context.');

   addFullContextOptions(cmd);
   addApiGroupOptions(cmd);
   addPrintOutputFlag(cmd);

   cmd.action(
      withErrorHandler(async (opts) => {
         await updateOpenapiSpec(
            opts.instance,
            opts.workspace,
            opts.branch,
            opts.group,
            opts.all,
            opts.printOutputDir,
            core
         );
      })
   );
}

export { registerGenerateOasCommand };
