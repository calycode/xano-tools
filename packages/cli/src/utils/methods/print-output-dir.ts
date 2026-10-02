import path from 'node:path';

function printOutputDir(doLog: boolean = false, dir: string = ''): void {
   if (doLog) {
      // Normalize separators so the emitted path is consistent on Windows.
      console.log(`OUTPUT_DIR=${dir ? path.normalize(dir) : dir}`);
   }
}

export { printOutputDir };
