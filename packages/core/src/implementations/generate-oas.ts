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
   const startDir = process.cwd();
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      branch,
      startDir,
   });

   try {
      // PARALLELIZE: process all groups concurrently
      const results = await Promise.all(
         options.groups.map(async (grp, i) => {
            core.emit('progress', {
               name: 'progress-updateoas',
               payload: grp,
               message: `Processing group: ${grp.name}`,
               step: i + 1,
               totalSteps: options.groups.length,
               percent: Math.round(((i + 1) / options.groups.length) * 100),
            });

            const { oas, generatedItems } = await updateSpecForGroup({
               group: grp,
               instanceConfig,
               workspaceConfig,
               branchConfig,
               storage,
               core,
            });

            return { group: grp.name, oas, generatedItems };
         })
      );

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
