import type { ConfigStorage } from '@repo/types';
import { clearDirectory } from '../methods/clear-directory';

/**
 * Minimal filesystem contract required by the generated-output pipeline.
 *
 * Deliberately narrower than `ConfigStorage` so tests (and other hosts) can
 * provide an in-memory implementation without touching disk.
 */
export interface OutputFileSystem {
   /** Removes everything inside `directory`. No-op when the directory is missing. */
   clearDirectory(directory: string): Promise<void>;
   /** Creates `directory` (and parents when `recursive` is set). */
   mkdir(directory: string, options?: { recursive?: boolean }): Promise<void>;
   /** Writes a single generated file. */
   writeFile(filePath: string, data: string | Uint8Array): Promise<void>;
}

/**
 * Production adapter: directory clearing stays on node:fs, file writes go
 * through the caller's `ConfigStorage` (normally `nodeConfigStorage`).
 */
export function createOutputFileSystem(
   storage: Pick<ConfigStorage, 'mkdir' | 'writeFile'>
): OutputFileSystem {
   return {
      clearDirectory: (directory) => clearDirectory(directory),
      mkdir: (directory, options) => storage.mkdir(directory, options),
      writeFile: (filePath, data) => storage.writeFile(filePath, data),
   };
}
