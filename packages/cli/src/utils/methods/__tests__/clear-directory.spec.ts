import { mkdtemp, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { clearDirectory } from '../clear-directory';

describe('clearDirectory', () => {
   let directory: string;

   beforeEach(async () => {
      directory = await mkdtemp(join(tmpdir(), 'caly-clear-dir-'));
   });

   afterEach(async () => {
      await rm(directory, { recursive: true, force: true });
   });

   it('does nothing when the directory does not exist', async () => {
      await expect(clearDirectory(join(directory, 'missing'))).resolves.toBeUndefined();
   });

   it('removes files and nested directories, keeping the root directory', async () => {
      await writeFile(join(directory, 'a.txt'), 'a');
      const nested = join(directory, 'nested');
      await mkdir(nested);
      await writeFile(join(nested, 'b.txt'), 'b');

      await clearDirectory(directory);

      expect(await readdir(directory)).toEqual([]);
   });
});
