import os from 'node:os';
import path from 'node:path';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolveAllowedExtensionIds } from '../discovery';
import { HOST_APP_INFO } from '../../../../utils/host-constants';

const DEV_EXTENSION_ID = 'lnhipaeaeiegnlokhokfokndgadkohfe';

describe('resolveAllowedExtensionIds', () => {
   let homeDir: string;
   let platformSpy: jest.SpyInstance;
   let homedirSpy: jest.SpyInstance;

   beforeEach(async () => {
      homeDir = await mkdtemp(path.join(tmpdir(), 'caly-native-host-'));
      platformSpy = jest.spyOn(os, 'platform').mockReturnValue('win32');
      homedirSpy = jest.spyOn(os, 'homedir').mockReturnValue(homeDir);
   });

   afterEach(async () => {
      platformSpy.mockRestore();
      homedirSpy.mockRestore();
      await rm(homeDir, { recursive: true, force: true });
   });

   it('includes extension ids already written into a native host manifest', async () => {
      const manifestDir = path.join(homeDir, '.calycode');
      await mkdir(manifestDir, { recursive: true });
      await writeFile(
         path.join(manifestDir, `${HOST_APP_INFO.reverseAppId}.json`),
         JSON.stringify({
            name: HOST_APP_INFO.reverseAppId,
            allowed_origins: [`chrome-extension://${DEV_EXTENSION_ID}/`],
         }),
      );

      const resolution = resolveAllowedExtensionIds();

      expect(resolution.ids).toContain(DEV_EXTENSION_ID);
      expect(resolution.source).toContain('+registered');
   });
});
