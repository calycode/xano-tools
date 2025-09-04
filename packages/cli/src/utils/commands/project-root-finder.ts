import path from 'path';
import fs from 'fs';

async function findProjectRoot(startDir = process.cwd(), sentinel = 'instance.config.json') {
   let dir = startDir;
   while (dir !== path.dirname(dir)) {
      if (fs.existsSync(path.join(dir, sentinel))) return dir;
      dir = path.dirname(dir);
   }
   throw new Error(`Project root not found (missing ${sentinel})`);
}

export { findProjectRoot };
