import { resolveConfigs } from '../context-resolution';

function makeCore(resolution: any) {
   const calls = { loadContextInputs: 0, deriveContext: 0 };
   return {
      calls,
      core: {
         loadContextInputs: async () => {
            calls.loadContextInputs += 1;
            return { mergedConfig: {}, foundLevels: {} };
         },
         deriveContext: async () => {
            calls.deriveContext += 1;
            return resolution;
         },
      },
   };
}

describe('resolveConfigs', () => {
   it('throws for missing required context when non-interactive', async () => {
      const { core } = makeCore({
         context: {},
         instanceConfig: null,
         workspaceConfig: null,
         branchConfig: null,
         apigroupConfig: null,
         missing: () => ['instance', 'workspace', 'branch'],
      });

      await expect(
         resolveConfigs({ core, interactive: false })
      ).rejects.toThrow('Missing context: instance, workspace, branch');
   });

   it('returns the derived context and reads the tree once', async () => {
      const instanceConfig = { name: 'prod' };
      const { core, calls } = makeCore({
         context: { instance: 'prod', workspace: 'main', branch: 'master' },
         instanceConfig,
         workspaceConfig: { id: 1, name: 'main' },
         branchConfig: { id: 2, label: 'master' },
         apigroupConfig: null,
         missing: () => [],
      });

      const result = await resolveConfigs({ core, interactive: false });

      expect(result.context).toEqual({
         instance: 'prod',
         workspace: 'main',
         branch: 'master',
      });
      expect(result.instanceConfig).toBe(instanceConfig);
      expect(calls.loadContextInputs).toBe(1);
      expect(calls.deriveContext).toBe(1);
   });
});
