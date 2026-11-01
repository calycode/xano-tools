import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateInternalDocs } from '../internal-docs';
import { generateRepo } from '../repo';

jest.mock('@clack/prompts', () => ({
   intro: jest.fn(),
   outro: jest.fn(),
   log: { step: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
   spinner: jest.fn(() => ({ start: jest.fn(), stop: jest.fn() })),
   select: jest.fn(),
   text: jest.fn(),
}));

const tempDirs: string[] = [];

async function makeOutputDir(): Promise<string> {
   const directory = await mkdtemp(join(tmpdir(), 'caly-generate-'));
   tempDirs.push(directory);
   return directory;
}

function makeStorage() {
   return {
      readFile: (filePath: string, encoding: BufferEncoding) => readFile(filePath, encoding),
      mkdir: (directory: string, options?: { recursive?: boolean }) => mkdir(directory, options),
      writeFile: (filePath: string, data: string | Uint8Array) => writeFile(filePath, data),
   };
}

afterEach(async () => {
   await Promise.all(tempDirs.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe('generate commands with --input inside --output', () => {
   it('reads internal docs input before clearing its output directory', async () => {
      const outputDir = await makeOutputDir();
      const inputFile = join(outputDir, 'schema.yaml');
      await writeFile(inputFile, 'title: internal-docs\n');

      const core = {
         on: jest.fn(),
         loadToken: jest.fn(async () => 'token'),
         storage: makeStorage(),
         loadContextInputs: jest.fn(async () => ({ mergedConfig: {}, foundLevels: [] })),
         deriveContext: jest.fn(async () => ({
            context: { instance: 'prod', workspace: 'ws', branch: 'main' },
            instanceConfig: {
               name: 'prod',
               url: 'https://xano.test',
               internalDocs: { output: 'ignored' },
            },
            workspaceConfig: { name: 'ws', id: 1 },
            branchConfig: { label: 'main' },
            missing: () => [],
         })),
         generateInternalDocs: jest.fn(async () => [
            { path: 'index.md', content: 'generated docs' },
         ]),
      };

      await generateInternalDocs({
         instance: 'prod',
         workspace: 'ws',
         branch: 'main',
         input: inputFile,
         output: outputDir,
         printOutput: false,
         core,
      });

      expect(core.generateInternalDocs).toHaveBeenCalledWith(
         expect.objectContaining({ jsonData: { title: 'internal-docs' } })
      );
      expect(await readFile(join(outputDir, 'index.md'), 'utf8')).toBe('generated docs');
      // The input lived in the output directory and was cleared after being read.
      await expect(access(inputFile)).rejects.toThrow();
   });

   it('reads a repo input before clearing its output directory', async () => {
      const outputDir = await makeOutputDir();
      const inputFile = join(outputDir, 'schema.json');
      await writeFile(inputFile, JSON.stringify({ title: 'repo' }));

      const core = {
         on: jest.fn(),
         storage: makeStorage(),
         generateRepo: jest.fn(async () => [{ path: 'index.md', content: 'generated repo' }]),
      };

      await generateRepo({
         instance: 'prod',
         workspace: 'ws',
         branch: 'main',
         input: inputFile,
         output: outputDir,
         printOutput: false,
         core,
      });

      expect(core.generateRepo).toHaveBeenCalledWith(
         expect.objectContaining({ jsonData: { title: 'repo' } })
      );
      expect(await readFile(join(outputDir, 'index.md'), 'utf8')).toBe('generated repo');
      await expect(access(inputFile)).rejects.toThrow();
   });
});
