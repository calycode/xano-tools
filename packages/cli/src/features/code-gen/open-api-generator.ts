import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

export async function runOpenApiGenerator({
   input,
   output,
   generator,
   additionalArgs = [],
   logger = false,
}) {
   // [ ] Add list of orval supported generators
   // [ ] Add orval process runner on the analogy of the openapitools/openapi-generator-cli

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

   if (logger) {
      const logsDir = join(process.cwd(), 'output', '_logs');
      await mkdir(logsDir, { recursive: true });
      logPath = join(logsDir, `openapi-generator-${Date.now()}.log`);
      logStream = createWriteStream(logPath);
   }

   return new Promise((resolvePromise, reject) => {
      const proc = spawn(cliBin, cliArgs, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });

      // Always suppress console output!
      if (logger && logStream) {
         proc.stdout.pipe(logStream);
         proc.stderr.pipe(logStream);
      } else {
         proc.stdout.resume();
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
