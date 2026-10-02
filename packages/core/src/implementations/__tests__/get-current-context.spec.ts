import { getCurrentContextConfigImplementation } from '../get-current-context';

function makeStorage({ instanceConfig, foundLevels = {} }: any) {
   return {
      loadMergedConfig: () => ({ mergedConfig: {}, instanceConfig, foundLevels }),
   } as any;
}

const instanceConfig = {
   name: 'prod',
   workspaces: [
      {
         id: 1,
         name: 'main',
         branches: [
            { id: 10, label: 'master' },
            { id: 11, label: 'dev' },
         ],
         apigroups: [{ id: 100, name: 'public' }],
      },
      { id: 2, name: 'staging', branches: [{ id: 20, label: 'master' }], apigroups: [] },
   ],
} as any;

describe('getCurrentContextConfigImplementation', () => {
   it('resolves configs from an explicit context', async () => {
      const result = await getCurrentContextConfigImplementation({
         storage: makeStorage({ instanceConfig }),
         context: { instance: 'prod', workspace: 'main', branch: 'dev', apigroup: 'public' },
         startDir: '.',
      });

      expect(result.workspaceConfig).toMatchObject({ id: 1 });
      expect(result.branchConfig).toMatchObject({ label: 'dev' });
      expect(result.apigroupConfig).toMatchObject({ id: 100 });
   });

   it('matches workspace by id and branch by label', async () => {
      const result = await getCurrentContextConfigImplementation({
         storage: makeStorage({ instanceConfig }),
         context: { workspace: '2', branch: 'master' },
         startDir: '.',
      });

      expect(result.workspaceConfig).toMatchObject({ id: 2 });
      expect(result.branchConfig).toMatchObject({ id: 20 });
   });

   it('falls back to levels found in the tree when no context is given', async () => {
      const result = await getCurrentContextConfigImplementation({
         storage: makeStorage({
            instanceConfig,
            foundLevels: { instance: 'prod', workspace: 'main', branch: 'master' },
         }),
         context: {},
         startDir: '.',
      });

      expect(result.workspaceConfig).toMatchObject({ id: 1 });
      expect(result.branchConfig).toMatchObject({ label: 'master' });
   });

   it('defaults to the first branch when only a workspace is resolved', async () => {
      const result = await getCurrentContextConfigImplementation({
         storage: makeStorage({ instanceConfig }),
         context: { workspace: 'main' },
         startDir: '.',
      });

      expect(result.branchConfig).toMatchObject({ label: 'master' });
   });

   it('returns null configs when the workspace cannot be found', async () => {
      const result = await getCurrentContextConfigImplementation({
         storage: makeStorage({ instanceConfig }),
         context: { workspace: 'does-not-exist' },
         startDir: '.',
      });

      expect(result.workspaceConfig).toBeNull();
      expect(result.branchConfig).toBeNull();
   });
});
