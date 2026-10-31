jest.mock('../../features/oas/generate/methods/update-spec-for-group', () => ({
   updateSpecForGroup: jest.fn(async () => ({ oas: {}, generatedItems: [] })),
}));

import { updateSpecForGroup } from '../../features/oas/generate/methods/update-spec-for-group';
import { updateOpenapiSpecImplementation } from '../generate-oas';

const fullConfigs = {
   instanceConfig: { name: 'prod', url: 'https://prod.xano.io' },
   workspaceConfig: { id: 1, name: 'main' },
   branchConfig: { id: 10, label: 'master' },
} as any;

function makeCore() {
   return {
      emit: jest.fn(),
      loadAndValidateContext: jest.fn(async () => fullConfigs),
   } as any;
}

const storage = {} as any;
const groups = [{ id: 100, name: 'public', canonical: 'public' }] as any;

describe('updateOpenapiSpecImplementation', () => {
   beforeEach(() => {
      (updateSpecForGroup as jest.Mock).mockClear();
   });

   it('resolves full configs when only instanceConfig is supplied', async () => {
      const core = makeCore();

      await expect(
         updateOpenapiSpecImplementation(
            storage,
            core,
            {
               instance: 'prod',
               workspace: 'main',
               branch: 'master',
               groups,
               contextConfigs: { instanceConfig: fullConfigs.instanceConfig },
            },
            '.'
         )
      ).resolves.toEqual([{ group: 'public', oas: {}, generatedItems: [] }]);

      expect(core.loadAndValidateContext).toHaveBeenCalledTimes(1);
      expect(updateSpecForGroup).toHaveBeenCalledWith(
         expect.objectContaining({
            workspaceConfig: fullConfigs.workspaceConfig,
            branchConfig: fullConfigs.branchConfig,
         })
      );
   });

   it('uses complete configs without resolving again', async () => {
      const core = makeCore();

      await updateOpenapiSpecImplementation(
         storage,
         core,
         {
            instance: 'prod',
            workspace: 'main',
            branch: 'master',
            groups,
            contextConfigs: fullConfigs,
         },
         '.'
      );

      expect(core.loadAndValidateContext).not.toHaveBeenCalled();
   });
});
