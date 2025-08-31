import { spawn } from 'child_process';
import { resolve, join } from 'path';
import { mkdirSync, createWriteStream } from 'fs';

// [ ] CLI only feature
export function runOpenApiGenerator({
   input,
   output,
   generator,
   additionalArgs = [],
   logger = false, // If true, log to file, else discard logs
}) {
   return new Promise((resolvePromise, reject) => {
      // Always use npx and the official package
      const cliBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const inputPath = resolve(input).replace(/\\/g, '/');
      const outputPath = resolve(output);

      const cliArgs = [
         '@openapitools/openapi-generator-cli',
         'generate',
         '-i',
         inputPath,
         '-g',
         generator,
         '-o',
         outputPath,
         ...additionalArgs,
      ].filter(Boolean);

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
