import { updateSpecForGroup } from '../features/oas/generate/methods/update-spec-for-group';
import type { Caly } from '..';
import { ApiGroup } from '@repo/types';
import { resolveFeatureContext } from '../utils/methods/resolve-feature-context';
import type { FeatureContextConfigs } from '../utils/methods/resolve-feature-context';

async function updateOpenapiSpecImplementation(
   storage: Caly['storage'],
   core: Caly,
   options: {
      instance: string;
      workspace: string;
      branch: string;
      groups: ApiGroup[];
      includeTables?: boolean;
      contextConfigs?: FeatureContextConfigs;
   },
   startDir: string
): Promise<{ group: string; oas: any; generatedItems: { path: string; content: string }[] }[]> {
   const { instance, workspace, branch } = options;
   core.emit('start', { name: 'start-updateoas', payload: options });
   const { instanceConfig, workspaceConfig, branchConfig } = await resolveFeatureContext({
      core,
      context: { instance, workspace, branch },
      startDir,
      contextConfigs: options.contextConfigs,
   });

   try {
      // Each group is independent: it fetches and transforms its own OAS document.
      // Promise.all preserves input order, so results stay aligned with options.groups.
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
               includeTables: options.includeTables ?? false,
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
