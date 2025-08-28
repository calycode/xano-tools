import fs from 'fs';
import path from 'path';

// Helper to delete a file
function safeUnlink(filePath: string) {
   try {
      fs.unlinkSync(filePath);
   } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
         console.error(`Failed to delete: ${filePath}`, e);
      }
   }
}

// Recursively traverse and delete .d.ts and .d.ts.map files except keepFile in dist root
function cleanDtsFiles(dir: string, rootDist: string, keepFile: string) {
   for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
         cleanDtsFiles(fullPath, rootDist, keepFile);
      } else {
         // Only keep the bundled file in the root of dist, delete all others
         if (
            (file.endsWith('.d.ts') && !(dir === rootDist && file === keepFile)) ||
            file.endsWith('.d.ts.map')
         ) {
            safeUnlink(fullPath);
         }
      }
   }
}

// Helper to recursively delete empty directories
function deleteEmptyDirs(dir: string) {
   if (!fs.existsSync(dir)) return;
   for (const file of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, file);
      if (fs.statSync(fullPath).isDirectory()) {
         deleteEmptyDirs(fullPath);
      }
   }
   // After cleaning subdirs, check if still empty
   if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) {
      fs.rmdirSync(dir);
   }
}

// Main logic
function cleanTypes(packageDir: string, keepFile: string = 'index.bundled.d.ts') {
   const distDir = path.join(packageDir, 'dist');
   if (!fs.existsSync(distDir)) {
      console.warn(`dist folder does not exist: ${distDir}`);
      return;
   }
   // Recursively delete all .d.ts and .d.ts.map except the keepFile in dist root
   cleanDtsFiles(distDir, distDir, keepFile);
   // Recursively delete empty dirs
   deleteEmptyDirs(distDir);
}

// --- Entry Point ---
const [, , packageDirArg, keepFileArg] = process.argv;
if (!packageDirArg) {
   console.error('Usage: tsx scripts/clean-types.ts <package-folder> [keep-file]');
   process.exit(1);
}
cleanTypes(packageDirArg, keepFileArg);
