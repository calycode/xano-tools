import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';

/**
 * Constructs CLI arguments for the generator.
 */
function buildGeneratorArgs({ generator, inputPath, outputPath, additionalArgs }) {
   const args = [
      '-y',
      ...(generator.startsWith('orval-')
         ? ['orval', '--client', generator.slice(6)]
         : ['@openapitools/openapi-generator-cli', 'generate', '-g', generator]),
      '-i',
      inputPath,
      '-o',
      outputPath,
      ...additionalArgs,
   ];
   return args;
}

/**
 * Sets up a log stream if logging is enabled.
 */
async function setupLogStream(enableLogging) {
   if (!enableLogging) return { logStream: null, logPath: null };
   const logsDir = join(process.cwd(), 'output', '_logs');
   await mkdir(logsDir, { recursive: true });
   const logPath = join(logsDir, `openapi-generator-${Date.now()}.log`);
   const logStream = createWriteStream(logPath);
   return { logStream, logPath };
}

/**
 * Runs the OpenAPI Generator or Orval CLI.
 * @param {object} params
 * @param {string} params.input - Path to the OpenAPI spec file
 * @param {string} params.output - Output directory
 * @param {string} params.generator - Generator name
 * @param {string[]} [params.additionalArgs] - Additional arguments for the generator
 * @param {boolean} [params.logger] - Enable logging
 */
async function runOpenApiGenerator({
   input,
   output,
   generator,
   additionalArgs = [],
   logger = false,
}) {
   const cliBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
   const inputPath = resolve(input).replace(/\\/g, '/');
   const outputPath = resolve(output);

   const args = buildGeneratorArgs({ generator, inputPath, outputPath, additionalArgs });
   const { logStream, logPath } = await setupLogStream(logger);

   return new Promise((resolvePromise, reject) => {
      const proc = spawn(cliBin, args, { shell: true, stdio: ['ignore', 'pipe', 'pipe'] });

      // Pipe or suppress output
      if (logStream) {
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
                  `Generator failed with exit code ${code}.` +
                     (logPath ? ` See log: ${logPath}` : '')
               )
            );
         }
      });

      proc.on('error', (err) => {
         if (logStream) logStream.end();
         reject(
            new Error(
               `Failed to start generator: ${err.message}.` +
                  (logPath ? ` See log: ${logPath}` : '')
            )
         );
      });
   });
}

export { runOpenApiGenerator };
