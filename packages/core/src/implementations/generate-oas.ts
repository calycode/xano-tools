import { updateSpecForGroup } from '../features/oas/generate/methods/update-spec-for-group';
import type { Caly } from '..';
import { ApiGroup } from '@calycode/types';

async function updateOpenapiSpecImplementation(
   storage: Caly['storage'],
   core: Caly,
   options: {
      instance: string;
      workspace: string;
      branch: string;
      groups: ApiGroup[];
   }
): Promise<{ group: string; oas: any; generatedItems: { path: string; content: string }[] }[]> {
   const { instance, workspace, branch } = options;

   core.emit('start', { name: 'start-updateoas', payload: options });

   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      branch,
   });

   try {
      let completed = 0;
      const total = options.groups.length;

      const groupPromises = options.groups.map((grp, i) =>
         updateSpecForGroup({
            group: grp,
            instanceConfig,
            workspaceConfig,
            branchConfig,
            storage,
            core,
         }).then(({ oas, generatedItems }) => {
            completed += 1;
            core.emit('progress', {
               name: 'progress-updateoas',
               payload: grp,
               message: `Finished group: ${grp.name}`,
               step: completed,
               totalSteps: total,
               percent: Math.round((completed / total) * 100),
            });
            return { group: grp.name, oas, generatedItems };
         })
      );

      const results = await Promise.all(groupPromises);
      core.emit('end', { name: 'end-updateoas', payload: results });
      return results;
   } catch (err) {
      core.emit('error', {
         error: err,
         message: 'error-updateoas',
      });
      throw err;
   }
}

export { updateOpenapiSpecImplementation };
