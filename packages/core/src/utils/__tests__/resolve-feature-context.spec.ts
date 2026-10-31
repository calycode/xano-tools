import { resolveFeatureContext } from '../methods/resolve-feature-context';

function fullConfigs() {
   return {
      instanceConfig: { name: 'prod', url: 'https://prod.xano.io' },
      workspaceConfig: { id: 1, name: 'main' },
      branchConfig: { id: 10, label: 'master' },
   } as any;
}

function makeCore(resolved: any = fullConfigs()) {
   return {
      loadAndValidateContext: jest.fn(async () => resolved),
   } as any;
}

const context = { instance: 'prod', workspace: 'main', branch: 'master' };

describe('resolveFeatureContext', () => {
   it('passes complete configs straight through without resolving', async () => {
      const core = makeCore();
      const provided = fullConfigs();

      const result = await resolveFeatureContext({
         core,
         context,
         startDir: '.',
         contextConfigs: provided,
      });

      expect(result).toBe(provided);
      expect(core.loadAndValidateContext).not.toHaveBeenCalled();
   });

   it('resolves when only a partial object is supplied', async () => {
      const core = makeCore();

      const result = await resolveFeatureContext({
         core,
         context,
         startDir: '.',
         contextConfigs: { instanceConfig: fullConfigs().instanceConfig },
      });

      expect(core.loadAndValidateContext).toHaveBeenCalledTimes(1);
      expect(core.loadAndValidateContext).toHaveBeenCalledWith({
         ...context,
         startDir: '.',
      });
      expect(result).toEqual(fullConfigs());
   });

   it('resolves when no configs are supplied', async () => {
      const core = makeCore();

      const result = await resolveFeatureContext({ core, context, startDir: '.' });

      expect(core.loadAndValidateContext).toHaveBeenCalledTimes(1);
      expect(result).toEqual(fullConfigs());
   });

   it('treats an explicit null entry as missing', async () => {
      const core = makeCore();

      await resolveFeatureContext({
         core,
         context,
         startDir: '.',
         contextConfigs: { ...fullConfigs(), branchConfig: null },
      });

      expect(core.loadAndValidateContext).toHaveBeenCalledTimes(1);
   });

   it('only resolves when a requested subset is incomplete', async () => {
      const core = makeCore();
      const { instanceConfig, workspaceConfig } = fullConfigs();

      const result = await resolveFeatureContext({
         core,
         context: { instance: 'prod', workspace: 'main' },
         startDir: '.',
         contextConfigs: { instanceConfig, workspaceConfig },
         required: ['instanceConfig', 'workspaceConfig'],
      });

      expect(result).toEqual({ instanceConfig, workspaceConfig });
      expect(core.loadAndValidateContext).not.toHaveBeenCalled();
   });

   it('resolves a requested subset when one member is missing', async () => {
      const core = makeCore();

      await resolveFeatureContext({
         core,
         context: { instance: 'prod', workspace: 'main' },
         startDir: '.',
         contextConfigs: { instanceConfig: fullConfigs().instanceConfig },
         required: ['instanceConfig', 'workspaceConfig'],
      });

      expect(core.loadAndValidateContext).toHaveBeenCalledTimes(1);
   });
});
