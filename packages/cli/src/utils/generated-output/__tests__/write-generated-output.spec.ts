import type { OutputFileSystem } from '../file-system';
import { prepareOutputDirectory, writeGeneratedOutput } from '../write-output';

const destination = 'output/repo';

/** In-memory filesystem that records every call in order. */
class FakeOutputFileSystem implements OutputFileSystem {
   events: string[] = [];
   files = new Map<string, string>();
   directories = new Set<string>();
   failOn?: string;
   failMkdirOn?: string;

   async clearDirectory(directory: string): Promise<void> {
      this.events.push(`clear:${directory}`);
      this.files.clear();
   }

   async mkdir(directory: string): Promise<void> {
      this.events.push(`mkdir:${directory}`);
      if (this.failMkdirOn === directory) {
         throw new Error(`cannot create ${directory}`);
      }
      this.directories.add(directory);
   }

   async writeFile(filePath: string, data: string | Uint8Array): Promise<void> {
      this.events.push(`write:${filePath}`);
      if (this.failOn === filePath) {
         throw new Error(`cannot write ${filePath}`);
      }
      this.files.set(filePath, String(data));
   }
}

describe('writeGeneratedOutput', () => {
   it('clears, creates directories and writes strictly in that order', async () => {
      const fileSystem = new FakeOutputFileSystem();

      const result = await writeGeneratedOutput({
         fileSystem,
         destination,
         entries: [
            { path: 'a.txt', content: 'a' },
            { path: 'nested/b.txt', content: 'b' },
         ],
      });

      expect(fileSystem.events).toEqual([
         'clear:output/repo',
         'mkdir:output/repo',
         'mkdir:output/repo',
         'write:output/repo/a.txt',
         'mkdir:output/repo/nested',
         'write:output/repo/nested/b.txt',
      ]);
      expect(result.written).toEqual(['output/repo/a.txt', 'output/repo/nested/b.txt']);
      expect(result.failures).toEqual([]);
      expect(fileSystem.files.get('output/repo/a.txt')).toBe('a');
      expect(fileSystem.files.get('output/repo/nested/b.txt')).toBe('b');
   });

   it('does not start writing before the clear promise resolves', async () => {
      const fileSystem = new FakeOutputFileSystem();
      let releaseClear: () => void = () => {};
      const clearGate = new Promise<void>((resolve) => {
         releaseClear = resolve;
      });

      fileSystem.clearDirectory = async (directory) => {
         fileSystem.events.push(`clear-start:${directory}`);
         await clearGate;
         fileSystem.events.push(`clear-end:${directory}`);
      };

      const write = writeGeneratedOutput({
         fileSystem,
         destination,
         entries: [{ path: 'a.txt', content: 'a' }],
      });

      await Promise.resolve();
      expect(fileSystem.events).toEqual(['clear-start:output/repo']);
      expect(fileSystem.files.size).toBe(0);

      releaseClear();
      await write;

      expect(fileSystem.events).toEqual([
         'clear-start:output/repo',
         'clear-end:output/repo',
         'mkdir:output/repo',
         'mkdir:output/repo',
         'write:output/repo/a.txt',
      ]);
   });

   it('skips clearing when clear is false but still creates and writes', async () => {
      const fileSystem = new FakeOutputFileSystem();
      fileSystem.files.set('output/repo/existing.txt', 'keep');

      await writeGeneratedOutput({
         fileSystem,
         destination,
         entries: [{ path: 'a.txt', content: 'a' }],
         clear: false,
      });

      expect(fileSystem.events.some((event) => event.startsWith('clear'))).toBe(false);
      expect(fileSystem.files.get('output/repo/existing.txt')).toBe('keep');
      expect(fileSystem.files.get('output/repo/a.txt')).toBe('a');
   });

   it('propagates write failures to the caller', async () => {
      const fileSystem = new FakeOutputFileSystem();
      fileSystem.failOn = 'output/repo/a.txt';

      await expect(
         writeGeneratedOutput({
            fileSystem,
            destination,
            entries: [{ path: 'a.txt', content: 'a' }],
         })
      ).rejects.toThrow('cannot write output/repo/a.txt');
   });

   it('collects failures instead of rejecting when collectErrors is set', async () => {
      const fileSystem = new FakeOutputFileSystem();
      fileSystem.failOn = 'output/repo/a.txt';

      const result = await writeGeneratedOutput({
         fileSystem,
         destination,
         entries: [
            { path: 'a.txt', content: 'a' },
            { path: 'b.txt', content: 'b' },
         ],
         collectErrors: true,
      });

      expect(result.written).toEqual(['output/repo/b.txt']);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].path).toBe('output/repo/a.txt');
      expect(fileSystem.files.get('output/repo/b.txt')).toBe('b');
   });

   it('collects a per-entry mkdir failure instead of rejecting', async () => {
      const fileSystem = new FakeOutputFileSystem();
      fileSystem.failMkdirOn = 'output/repo/nested';

      const result = await writeGeneratedOutput({
         fileSystem,
         destination,
         entries: [
            { path: 'a.txt', content: 'a' },
            { path: 'nested/b.txt', content: 'b' },
         ],
         collectErrors: true,
      });

      expect(result.written).toEqual(['output/repo/a.txt']);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].path).toBe('output/repo/nested/b.txt');
      expect(fileSystem.files.get('output/repo/a.txt')).toBe('a');
      expect(fileSystem.files.has('output/repo/nested/b.txt')).toBe(false);
   });

   it('emits progress events around each stage', async () => {
      const fileSystem = new FakeOutputFileSystem();
      const events: string[] = [];

      await writeGeneratedOutput({
         fileSystem,
         destination,
         entries: [{ path: 'a.txt', content: 'a' }],
         onProgress: (event) => events.push(`${event.stage}:${event.path}`),
      });

      expect(events).toEqual([
         'clear:output/repo',
         'mkdir:output/repo',
         'mkdir:output/repo',
         'write:output/repo/a.txt',
      ]);
   });

   it('rejects an empty destination before touching the filesystem', async () => {
      const fileSystem = new FakeOutputFileSystem();

      await expect(
         prepareOutputDirectory({ fileSystem, destination: '' })
      ).rejects.toThrow('Output directory is required');
      expect(fileSystem.events).toEqual([]);
   });
});
