import { dirname, joinPath } from '@repo/utils';
import type { OutputFileSystem } from './file-system';

/** A single generated file, relative to the destination directory. */
export interface OutputEntry {
   path: string;
   content: string | Uint8Array;
}

export type OutputStage = 'clear' | 'mkdir' | 'write';

export interface OutputProgressEvent {
   stage: OutputStage;
   /** Directory for `clear`/`mkdir`, file path for `write`. */
   path: string;
   /** Entry index, set for entry-level `mkdir`/`write` events. */
   index?: number;
   /** Number of entries in the batch, set for entry-level events. */
   total?: number;
}

export interface PrepareOutputDirectoryOptions {
   fileSystem: OutputFileSystem;
   destination: string;
   /** Clear the destination first. Defaults to true. */
   clear?: boolean;
   onProgress?: (event: OutputProgressEvent) => void;
}

export interface WriteGeneratedOutputOptions extends PrepareOutputDirectoryOptions {
   entries: OutputEntry[];
   /**
    * Keep writing after a failed write and report the failures instead of
    * rejecting. Defaults to false (`writeGeneratedOutput` rejects on the first error).
    */
   collectErrors?: boolean;
}

export interface OutputWriteFailure {
   path: string;
   error: unknown;
}

export interface OutputWriteResult {
   destination: string;
   written: string[];
   failures: OutputWriteFailure[];
}

/**
 * Clears (optionally) and creates the destination directory.
 *
 * Exposed separately for pipelines that must prepare the directory before an
 * intermediate step runs (e.g. fetching a schema file into the same directory)
 * and only write the generated entries afterwards.
 */
export async function prepareOutputDirectory({
   fileSystem,
   destination,
   clear = true,
   onProgress = () => {},
}: PrepareOutputDirectoryOptions): Promise<void> {
   if (!destination) {
      throw new Error('Output directory is required');
   }

   if (clear) {
      onProgress({ stage: 'clear', path: destination });
      await fileSystem.clearDirectory(destination);
   }

   onProgress({ stage: 'mkdir', path: destination });
   await fileSystem.mkdir(destination, { recursive: true });
}

/**
 * Publishes generated entries to a resolved destination directory.
 *
 * Stages run strictly in order: clear, mkdir, then each entry's mkdir and
 * write. Every filesystem call is awaited, so a write can never race the
 * clear that precedes it.
 */
export async function writeGeneratedOutput({
   fileSystem,
   destination,
   entries,
   clear = true,
   collectErrors = false,
   onProgress = () => {},
}: WriteGeneratedOutputOptions): Promise<OutputWriteResult> {
   await prepareOutputDirectory({ fileSystem, destination, clear, onProgress });

   const written: string[] = [];
   const failures: OutputWriteFailure[] = [];

   for (let index = 0; index < entries.length; index++) {
      const entry = entries[index];
      const outputPath = joinPath(destination, entry.path);
      const writeDir = dirname(outputPath);

      onProgress({ stage: 'mkdir', path: writeDir, index, total: entries.length });
      await fileSystem.mkdir(writeDir, { recursive: true });

      onProgress({ stage: 'write', path: outputPath, index, total: entries.length });
      try {
         await fileSystem.writeFile(outputPath, entry.content);
         written.push(outputPath);
      } catch (error) {
         if (!collectErrors) {
            throw error;
         }
         failures.push({ path: outputPath, error });
      }
   }

   return { destination, written, failures };
}
