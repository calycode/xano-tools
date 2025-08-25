import { updateSpecForGroup } from '../features/oas/generate';
import type { XCC } from '..';
import { ApiGroup } from '../../types';

async function updateOpenapiSpecImplementation(
   storage,
   core: XCC,
   options: {
      instance: string;
      workspace: string;
      branch: string;
      groups: ApiGroup[];
   }
) {
   const { instance, workspace, branch } = options;

   core.emit('start', { name: 'start-updateoas', payload: options });

   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      branch,
   });

   try {
      // 3. For each group, update the spec
      for (const grp of options.groups) {
         core.emit('progress', {
            name: 'progress-updateoas',
            payload: grp,
            message: `Processing group: ${grp.name}`,
            step: options.groups.indexOf(grp) + 1,
            totalSteps: options.groups.length,
            percent: Math.round(((options.groups.indexOf(grp) + 1) / options.groups.length) * 100),
         });
         await updateSpecForGroup({
            group: grp,
            instanceConfig,
            workspaceConfig,
            branchConfig,
            storage,
            core,
         });
      }
      core.emit('end', { name: 'end-updateoas', payload: options });
   } catch (err) {
      core.emit('error', {
         error: err,
         message: 'error-updateoas',
      });
   }
}

export { updateOpenapiSpecImplementation };
