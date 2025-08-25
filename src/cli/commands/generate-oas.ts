import { intro, log, outro } from '@clack/prompts';
import {
   addApiGroupOptions,
   addFullContextOptions,
   addPrintOutputFlag,
   chooseApiGroupOrAll,
   printOutputDir,
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
   // Handle incoming events
   core.on('info', (data) => {
      if (data.name === 'output-dir') {
         printOutputDir(printOutput, data.message);
      }
   });

   core.on('start', () => {
      intro('Generating OpenAPI specifications...');
   });

   core.on('end', () => {
      outro('OpenAPI specs generated successfully!');
   });

   core.on('progress', (data) => {
      log.step(`${data.step} / ${data.totalSteps} (${data.percent}%) - ${data.message}`);
   });

   core.on('error', (data) => {
      log.error(`Error: ${data.message} \n Payload: ${JSON.stringify(data.payload, null, 2)}}`);
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
      all: !!isAll,
   });

   await core.updateOpenapiSpec(
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
