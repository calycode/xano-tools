import { testRunner } from '../index';

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

const storage = { getStartDir: () => '.' } as any;

describe('testRunner context configs', () => {
   it('resolves full configs when only instanceConfig is supplied', async () => {
      const core = makeCore();

      await expect(
         testRunner({
            context: { instance: 'prod', workspace: 'main', branch: 'master' },
            groups: [],
            testConfig: [],
            core,
            storage,
            contextConfigs: { instanceConfig: fullConfigs.instanceConfig },
         })
      ).resolves.toEqual([]);

      expect(core.loadAndValidateContext).toHaveBeenCalledTimes(1);
   });

   it('uses complete configs without resolving again', async () => {
      const core = makeCore();

      await testRunner({
         context: { instance: 'prod', workspace: 'main', branch: 'master' },
         groups: [],
         testConfig: [],
         core,
         storage,
         contextConfigs: fullConfigs,
      });

      expect(core.loadAndValidateContext).not.toHaveBeenCalled();
   });
});
