import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureGitignore } from '../safe-version-control';

describe('ensureGitignore', () => {
   const originalCwd = process.cwd();
   let tempDir: string;

   beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'caly-gitignore-'));
   });

   afterEach(async () => {
      process.chdir(originalCwd);
      await rm(tempDir, { recursive: true, force: true });
   });

   it('writes .gitignore into the current working directory at call time', async () => {
      // The module is already imported above; this only resolves correctly if
      // the working directory is read when the function runs, not at import.
      process.chdir(tempDir);

      await ensureGitignore();

      const content = await readFile(join(tempDir, '.gitignore'), 'utf8');
      expect(content).toContain('.env');
      expect(content).toContain('node_modules/');
   });

   it('appends missing entries to an existing .gitignore', async () => {
      process.chdir(tempDir);
      await writeFile(join(tempDir, '.gitignore'), 'dist/\n');

      await ensureGitignore();

      const content = await readFile(join(tempDir, '.gitignore'), 'utf8');
      expect(content).toContain('dist/');
      expect(content).toContain('.env');
   });

   it('follows a working directory change between calls', async () => {
      const secondDir = await mkdtemp(join(tmpdir(), 'caly-gitignore-'));
      try {
         process.chdir(tempDir);
         await ensureGitignore();
         expect(await readFile(join(tempDir, '.gitignore'), 'utf8')).toContain('.env');

         process.chdir(secondDir);
         await ensureGitignore();
         expect(await readFile(join(secondDir, '.gitignore'), 'utf8')).toContain('.env');
      } finally {
         process.chdir(originalCwd);
         await rm(secondDir, { recursive: true, force: true });
      }
   });
});
