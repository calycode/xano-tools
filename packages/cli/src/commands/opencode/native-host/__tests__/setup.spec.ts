import path from 'node:path';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { createNativeHostWrapper } from '../setup';

jest.mock('@clack/prompts', () => ({
   log: {
      info: jest.fn(),
      warn: jest.fn(),
      success: jest.fn(),
   },
}));

describe('createNativeHostWrapper', () => {
   let homeDir: string;

   beforeEach(async () => {
      homeDir = await mkdtemp(path.join(tmpdir(), 'caly-host-wrapper-'));
   });

   afterEach(async () => {
      await rm(homeDir, { recursive: true, force: true });
   });

   async function readWrapper(ocVersion?: string): Promise<string> {
      const wrapperPath = createNativeHostWrapper('win32', homeDir, ocVersion);
      return readFile(wrapperPath, 'utf8');
   }

   it('omits the flag for the default and latest channels', async () => {
      expect(await readWrapper('2.2.6')).not.toContain('--oc-version');
      expect(await readWrapper('latest')).not.toContain('--oc-version');
      expect(await readWrapper(undefined)).not.toContain('--oc-version');
   });

   it('keeps an explicit non-default version', async () => {
      expect(await readWrapper('1.19.5')).toContain('--oc-version 1.19.5');
   });
});
