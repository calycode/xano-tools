jest.mock('@repo/utils', () => ({
   ...jest.requireActual('@repo/utils'),
   metaApiFetch: jest.fn(),
}));

import { metaApiFetch } from '@repo/utils';
import { exportBackupImplementation, restoreBackupImplementation } from '../backups';

const mockedFetch = metaApiFetch as jest.Mock;

const fullConfigs = {
   instanceConfig: { name: 'prod', url: 'https://prod.xano.io' },
   workspaceConfig: { id: 1, name: 'main' },
   branchConfig: { id: 10, label: 'master' },
} as any;

function makeCore() {
   return {
      emit: jest.fn(),
      loadToken: jest.fn(async () => 'token'),
      loadAndValidateContext: jest.fn(async () => fullConfigs),
      resolveContext: jest.fn(async () => fullConfigs),
      storage: {
         getStartDir: () => '.',
         mkdir: jest.fn(async () => undefined),
         streamToFile: jest.fn(async () => undefined),
      },
   } as any;
}

describe('backup context configs', () => {
   beforeEach(() => {
      mockedFetch.mockReset();
      mockedFetch.mockResolvedValue({
         headers: {},
         status: 200,
         body: {},
      });
   });

   it('restore resolves full configs when only instanceConfig is supplied', async () => {
      const core = makeCore();
      const formData = {} as any;

      await expect(
         restoreBackupImplementation({
            instance: 'prod',
            workspace: 'main',
            formData,
            contextConfigs: { instanceConfig: fullConfigs.instanceConfig },
            core,
         })
      ).resolves.toBeDefined();

      expect(core.resolveContext).toHaveBeenCalledTimes(1);
      expect(core.loadAndValidateContext).not.toHaveBeenCalled();
      expect(mockedFetch).toHaveBeenCalledWith(
         expect.objectContaining({ path: '/workspace/1/import' })
      );
   });

   it('restore uses complete instance and workspace configs without resolving', async () => {
      const core = makeCore();

      await restoreBackupImplementation({
         instance: 'prod',
         workspace: 'main',
         formData: {} as any,
         contextConfigs: {
            instanceConfig: fullConfigs.instanceConfig,
            workspaceConfig: fullConfigs.workspaceConfig,
         },
         core,
      });

      expect(core.loadAndValidateContext).not.toHaveBeenCalled();
   });

   it('export resolves full configs when only instanceConfig is supplied', async () => {
      const core = makeCore();

      await expect(
         exportBackupImplementation({
            outputDir: '.',
            instance: 'prod',
            workspace: 'main',
            branch: 'master',
            contextConfigs: { instanceConfig: fullConfigs.instanceConfig },
            core,
         })
      ).resolves.toBeDefined();

      expect(core.loadAndValidateContext).toHaveBeenCalledTimes(1);
      expect(mockedFetch).toHaveBeenCalledWith(
         expect.objectContaining({ path: '/workspace/1/export' })
      );
   });
});
