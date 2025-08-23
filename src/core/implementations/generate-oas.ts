import { intro, outro, log } from '@clack/prompts';
import { updateSpecForGroup } from '../features/oas/generate';

async function updateOpenapiSpecImplementation(
   storage,
   core,
   options: {
      instance: string;
      workspace: string;
      branch: string;
      groups: string;
      printOutput: boolean;
   }
) {
   const { instance, workspace, branch } = options;
   intro('🔄 Starting to generate OpenAPI specifications.');
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      branch,
   });

   try {
      // 3. For each group, update the spec
      for (const grp of options.groups) {
         await updateSpecForGroup({
            group: grp,
            instanceConfig,
            workspaceConfig,
            branchConfig,
            printOutput: options.printOutput,
            storage,
            core,
         });
      }
      outro('All OpenAPI specifications generated.');
   } catch (err) {
      log.error(err.message || err);
   }
}

export { updateOpenapiSpecImplementation };
