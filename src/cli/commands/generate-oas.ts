import {
   addApiGroupOptions,
   addFullContextOptions,
   addPrintOutputFlag,
   chooseApiGroupOrAll,
   withErrorHandler,
} from '../utils/index';

async function updateOasWizard(
   instance: string,
   workspace: string,
   branch: string,
   group: string,
   isAll: boolean,
   printOutput: boolean = false,
   core
) {
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      branch,
   });

   // Get API groups (prompt or all)
   const groups = await chooseApiGroupOrAll({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
      workspace_id: workspaceConfig.id,
      branchLabel: branchConfig.label,
      promptUser: !isAll && !group,
      groupName: group,
      all: !!isAll,
   });

   core.updateOpenapiSpec(
      instanceConfig.name,
      workspaceConfig.name,
      branchConfig.label,
      groups,
      printOutput
   );
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
         await updateOasWizard(
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
