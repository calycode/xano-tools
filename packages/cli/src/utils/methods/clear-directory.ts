import { access, readdir, lstat, rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Recursively removes all files and subdirectories in a directory.
 * Does nothing if the directory does not exist.
 * @param directory - The directory to clear.
 */
export async function clearDirectory(directory: string): Promise<void> {
   try {
      await access(directory);
   } catch {
      // Directory does not exist; nothing to clear
      return;
   }

   const files = await readdir(directory);
   await Promise.all(
      files.map(async (file) => {
         const curPath = join(directory, file);
         const stat = await lstat(curPath);
         if (stat.isDirectory()) {
            await clearDirectory(curPath);
            await rm(curPath, { recursive: true, force: true }); // removes the (now-empty) dir
         } else {
            await unlink(curPath);
         }
      }),
   );
}
