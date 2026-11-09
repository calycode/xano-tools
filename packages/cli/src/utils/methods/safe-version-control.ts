import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { log } from '@clack/prompts';

const RECOMMENDED_IGNORES = [
   '.env',
   'workspace.yaml',
   'calyInstance.config.js',
   'calyInstance.test.setup.json',
   'output/',
   'repo/',
   'reports/',
   'src/helpers/temp.dbml',
   'node_modules/',
   'pnpm-lock.yaml',
   'yaml-files/',
   'oas.json',
   'debug_requests.json',
];

export async function ensureGitignore() {
   // Resolved per call: commands may run after a working-directory change, so
   // freezing process.cwd() at import time would target the wrong project.
   const projectRoot = process.cwd();
   const gitignorePath = join(projectRoot, '.gitignore');
   const exampleGitignorePath = join(projectRoot, 'gitignore.example');

   let gitignoreContent = '';
   let needsWrite = false;

   // If no .gitignore, use example if it exists, or just recommended ignores
   try {
      await access(gitignorePath);
      gitignoreContent = (await readFile(gitignorePath, 'utf8')).trim();
   } catch {
      try {
         await access(exampleGitignorePath);
         gitignoreContent = (await readFile(exampleGitignorePath, 'utf8')).trim();
      } catch {
         gitignoreContent = '';
      }
      needsWrite = true;
   }

   // Deduplicate: create a Set of existing lines (trimming whitespace)
   const lines = new Set(
      gitignoreContent
         .split(/\r?\n/)
         .map((line) => line.trim())
         .filter(Boolean)
   );

   // Find truly missing lines
   const missing = RECOMMENDED_IGNORES.filter((line) => !lines.has(line));

   if (missing.length > 0) {
      gitignoreContent += '\n' + missing.join('\n') + '\n';
      await writeFile(gitignorePath, gitignoreContent.trim() + '\n');
      log.success('[MAINTENANCE]: .gitignore updated with missing recommended ignores.');
   } else if (needsWrite) {
      await writeFile(gitignorePath, gitignoreContent.trim() + '\n');
      log.success('[MAINTENANCE]: .gitignore created from example.');
   }
}

