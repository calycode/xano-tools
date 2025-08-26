import { intro, log, outro } from '@clack/prompts';
import {
   addApiGroupOptions,
   addFullContextOptions,
   addPrintOutputFlag,
   chooseApiGroupOrAll,
   printOutputDir,
   withErrorHandler,
} from '../utils/index';
import type { XCC } from '../../core';
import { attachCliEventHandlers } from '../utils/event-listener';

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
   core: XCC;
}) {
   attachCliEventHandlers('generate-oas', core, {
      instance,
      workspace,
      branch,
      group,
      isAll,
      printOutput,
   });

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
      all: isAll,
   });

   await core.updateOpenapiSpec(
      instanceConfig.name,
      workspaceConfig.name,
      branchConfig.label,
      groups
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
