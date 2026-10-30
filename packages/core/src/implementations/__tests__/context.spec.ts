import {
   assertContext,
   deriveContext,
   loadContextInputs,
   resolveContext,
} from '../context';

function makeInstance(name: string, workspaceName: string, branchLabel = 'master') {
   return {
      name,
      url: `https://${name}.xano.io`,
      workspaces: [
         {
            id: name === 'prod' ? 1 : 2,
            name: workspaceName,
            branches:
               name === 'prod'
                  ? [
                       { id: 10, label: 'master' },
                       { id: 11, label: 'dev' },
                    ]
                  : [{ id: 20, label: branchLabel }],
            apigroups: [{ id: name === 'prod' ? 100 : 200, name: 'public' }],
         },
      ],
   } as any;
}

const prod = makeInstance('prod', 'main', 'master');
const staging = makeInstance('staging', 'stage-main', 'live');

function makeStorage({
   instanceConfig = null,
   workspaceConfig = null,
   branchConfig = null,
   foundLevels = {},
   globalContext = {},
   instances = {},
}: any = {}) {
   const calls = { loadMergedConfig: 0, loadGlobalConfig: 0, loadInstanceConfig: 0 };
   const storage: any = {
      loadMergedConfig: () => {
         calls.loadMergedConfig += 1;
         return { mergedConfig: {}, instanceConfig, workspaceConfig, branchConfig, foundLevels };
      },
      loadGlobalConfig: async () => {
         calls.loadGlobalConfig += 1;
         return { currentContext: globalContext, instances: [] };
      },
      loadInstanceConfig: async (name: string) => {
         calls.loadInstanceConfig += 1;
         if (!instances[name]) throw new Error(`Instance config not found: ${name}`);
         return instances[name];
      },
      getStartDir: () => '.',
   };
   return { storage, calls };
}

describe('context resolution', () => {
   it('flag beats the nearest file level and the global context', async () => {
      const { storage } = makeStorage({
         instanceConfig: prod,
         foundLevels: { instance: 'prod', workspace: 'main', branch: 'master' },
         globalContext: { instance: 'prod', workspace: 'global-ws', branch: 'global-branch' },
      });

      const result = await resolveContext({
         storage,
         context: { branch: 'dev' },
         startDir: '.',
      });

      expect(result.workspaceConfig).toMatchObject({ name: 'main' });
      expect(result.branchConfig).toMatchObject({ label: 'dev' });
      expect(result.context.branch).toBe('dev');
   });

   it('nearest file level beats the global context', async () => {
      const { storage } = makeStorage({
         instanceConfig: prod,
         foundLevels: { instance: 'prod', workspace: 'main', branch: 'master' },
         globalContext: { instance: 'staging', workspace: 'stage-main', branch: 'live' },
      });

      const result = await resolveContext({ storage, context: {}, startDir: '.' });

      expect(result.instanceConfig).toMatchObject({ name: 'prod' });
      expect(result.workspaceConfig).toMatchObject({ name: 'main' });
      expect(result.branchConfig).toMatchObject({ label: 'master' });
   });

   it('falls back to the global context when the tree has nothing', async () => {
      const { storage } = makeStorage({
         instances: { staging },
         globalContext: { instance: 'staging', workspace: 'stage-main', branch: 'live' },
      });

      const result = await resolveContext({ storage, context: {}, startDir: '.' });

      expect(result.instanceConfig).toMatchObject({ name: 'staging' });
      expect(result.workspaceConfig).toMatchObject({ name: 'stage-main' });
      expect(result.branchConfig).toMatchObject({ label: 'live' });
      expect(result.context).toMatchObject({
         instance: 'staging',
         workspace: 'stage-main',
         branch: 'live',
      });
   });

   it('throws for missing required fields when not interactive', async () => {
      const { storage } = makeStorage();
      const result = await resolveContext({ storage, context: {}, startDir: '.' });

      expect(result.missing()).toEqual(['instance', 'workspace', 'branch']);
      expect(() => assertContext(result)).toThrow(
         'Missing context: instance, workspace, branch'
      );
   });

   it('--instance selects the requested instance config', async () => {
      const { storage, calls } = makeStorage({
         instanceConfig: prod,
         foundLevels: { instance: 'prod', workspace: 'main', branch: 'master' },
         instances: { staging },
      });

      const result = await resolveContext({
         storage,
         context: { instance: 'staging', workspace: 'stage-main', branch: 'live' },
         startDir: '.',
      });

      expect(result.instanceConfig).toMatchObject({ name: 'staging' });
      expect(result.workspaceConfig).toMatchObject({ id: 2, name: 'stage-main' });
      expect(result.branchConfig).toMatchObject({ id: 20, label: 'live' });
      expect(calls.loadInstanceConfig).toBe(1);
   });

   it('--instance does not leak the previous instance tree context', async () => {
      const { storage } = makeStorage({
         instanceConfig: prod,
         foundLevels: { instance: 'prod', workspace: 'main', branch: 'master' },
         globalContext: { instance: 'prod', workspace: 'main', branch: 'master' },
         instances: { staging },
      });

      const result = await resolveContext({
         storage,
         context: { instance: 'staging' },
         startDir: '.',
      });

      expect(result.instanceConfig).toMatchObject({ name: 'staging' });
      expect(result.workspaceConfig).toBeNull();
      expect(result.branchConfig).toBeNull();
      expect(result.missing()).toEqual(['workspace', 'branch']);
   });

   it('throws for an explicit instance that has no config', async () => {
      const { storage } = makeStorage({ instanceConfig: prod });

      await expect(
         resolveContext({ storage, context: { instance: 'missing' }, startDir: '.' })
      ).rejects.toThrow('Instance config not found for "missing"');
   });

   it('reads the config tree exactly once per resolution, including after a prompt-style re-derive', async () => {
      const { storage, calls } = makeStorage({
         instanceConfig: prod,
         foundLevels: { instance: 'prod' },
      });

      const inputs = await loadContextInputs({ storage, startDir: '.' });
      const first = await deriveContext({
         storage,
         inputs,
         context: { workspace: 'main' },
      });
      expect(first.missing(['apigroup'])).toEqual(['apigroup']);
      // Prompting for the apigroup must not trigger another directory walk.
      const second = await deriveContext({
         storage,
         inputs,
         context: { ...first.context, apigroup: 'public' },
      });

      expect(second.missing(['apigroup'])).toEqual([]);
      expect(calls.loadMergedConfig).toBe(1);
      expect(calls.loadGlobalConfig).toBe(1);

      await resolveContext({ storage, context: {}, startDir: '.' });
      expect(calls.loadMergedConfig).toBe(2);
   });

   it('defaults to the first branch when only a workspace is resolved', async () => {
      const { storage } = makeStorage({ instanceConfig: prod });

      const result = await resolveContext({
         storage,
         context: { workspace: 'main' },
         startDir: '.',
      });

      expect(result.branchConfig).toMatchObject({ label: 'master' });
   });

   it('returns null for an explicit branch that is not found', async () => {
      const { storage } = makeStorage({ instanceConfig: prod });

      const result = await resolveContext({
         storage,
         context: { workspace: 'main', branch: 'does-not-exist' },
         startDir: '.',
      });

      expect(result.workspaceConfig).toMatchObject({ id: 1 });
      expect(result.branchConfig).toBeNull();
   });

   it('resolves an apigroup by name or id', async () => {
      const { storage } = makeStorage({ instanceConfig: prod });

      const result = await resolveContext({
         storage,
         context: { workspace: 'main', branch: 'master', apigroup: 'public' },
         startDir: '.',
      });

      expect(result.apigroupConfig).toMatchObject({ id: 100 });
   });

   it('treats a storage without a directory tree as an empty tree', async () => {
      const { storage } = makeStorage();
      storage.loadMergedConfig = () => {
         throw new Error('Instance config not found');
      };

      const result = await resolveContext({ storage, context: {}, startDir: '' });
      expect(result.instanceConfig).toBeNull();
   });
});
