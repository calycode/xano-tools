import { readdir, readFile, writeFile } from 'fs/promises';
import { extname, join } from 'path';

export async function minifyJsonInDir(dir: string) {
   const entries = await readdir(dir, { withFileTypes: true });
   for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
         await minifyJsonInDir(fullPath); // recurse
      } else if (extname(entry.name) === '.json') {
         const raw = await readFile(fullPath, 'utf-8');
         try {
            const minified = JSON.stringify(JSON.parse(raw));
            await writeFile(fullPath, minified, 'utf-8');
         } catch (e) {
            console.warn(`Failed to minify JSON: ${fullPath}`, e);
         }
      }
   }
}
