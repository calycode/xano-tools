import {
   attachCliEventHandlers,
   createOutputFileSystem,
   printOutputDir,
   resolveOutputDestination,
   resolveConfigs,
   writeGeneratedOutput,
} from '../../../utils';

async function generateXanoscriptRepo({ instance, workspace, branch, core, printOutput = false }) {
   attachCliEventHandlers('generate-xs-repo', core, {
      instance,
      workspace,
      branch,
   });
   const { instanceConfig, workspaceConfig, branchConfig, context } = await resolveConfigs({
      requiredFields: ['instance', 'workspace', 'branch'],
      cliContext: { instance, workspace, branch },
      core,
   });

   // Resolve output dir
   const outputDir = await resolveOutputDestination({
      template: instanceConfig.xanoscript.output,
      context: {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
      },
   });

   const plannedWrites: { path: string; content: string }[] = await core.buildXanoscriptRepo({
      instance: context.instance,
      workspace: context.workspace,
      branch: context.branch,
   });

   await writeGeneratedOutput({
      fileSystem: createOutputFileSystem(core.storage),
      destination: outputDir,
      entries: plannedWrites,
   });

   printOutputDir(printOutput, outputDir);
}

export { generateXanoscriptRepo };
