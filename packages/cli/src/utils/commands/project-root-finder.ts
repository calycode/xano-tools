import { join, dirname } from 'node:path';
import { access } from 'node:fs/promises';

async function findProjectRoot(startDir = process.cwd(), sentinel = 'instance.config.json') {
   let dir = startDir;
   while (dir !== dirname(dir)) {
      try {
         await access(join(dir, sentinel));
         return dir;
      } catch {
         dir = dirname(dir);
      }
   }
   throw new Error(`Project root not found (missing ${sentinel})`);
}

export { findProjectRoot };
