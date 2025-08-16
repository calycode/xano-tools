import { spawn } from 'child_process';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync, createWriteStream } from 'fs';

export function runOpenApiGenerator({
   input,
   output,
   generator,
   additionalArgs = [],
   logger = false, // If true, log to file, else discard logs
}) {
   return new Promise((resolvePromise, reject) => {
      const myDirname =
         typeof __dirname !== 'undefined' ? __dirname : dirname(fileURLToPath(import.meta.url));
      const cliBase = join(myDirname, '../../../../node_modules/.bin/openapi-generator-cli');
      const winBin = `${cliBase}.cmd`;
      const localBin = process.platform === 'win32' ? winBin : cliBase;
      const useLocalBin = existsSync(localBin);

      const inputPath = resolve(input).replace(/\\/g, '/');
      const outputPath = resolve(output);

      const baseArgs = [
         'generate',
         '-i',
         inputPath,
         '-g',
         generator,
         '-o',
         outputPath,
         ...additionalArgs,
      ].filter(Boolean);

      let cliBin;
      let cliArgs;

      if (useLocalBin) {
         cliBin = localBin;
         cliArgs = baseArgs;
      } else {
         // Fallback to npx if local bin doesn't exist
         cliBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
         cliArgs = ['openapi-generator-cli', ...baseArgs];
      }

      let logStream = null;
      let logPath = null;

      // If logger is true, prepare log file and stream
      if (logger) {
         const logsDir = join(process.cwd(), 'output', '_logs');
         mkdirSync(logsDir, { recursive: true });
         logPath = join(logsDir, `openapi-generator-${Date.now()}.log`);
         logStream = createWriteStream(logPath);
      }

      // Start the process
      const proc = spawn(cliBin, cliArgs, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });

      // Always suppress console output!
      if (logger && logStream) {
         proc.stdout.pipe(logStream);
         proc.stderr.pipe(logStream);
      } else {
         // Discard output by piping to /dev/null (or just do nothing)
         proc.stdout.resume(); // prevent backpressure
         proc.stderr.resume();
      }

      proc.on('close', (code) => {
         if (logStream) logStream.end();
         if (code === 0) {
            resolvePromise({ logPath });
         } else {
            reject(
               new Error(
                  `openapi-generator-cli failed with exit code ${code}.` +
                     (logPath ? ` See log: ${logPath}` : '')
               )
            );
         }
      });
      proc.on('error', (err) => {
         if (logStream) logStream.end();
         reject(
            new Error(
               `Failed to start openapi-generator-cli: ${err.message}.` +
                  (logPath ? ` See log: ${logPath}` : '')
            )
         );
      });
   });
}
