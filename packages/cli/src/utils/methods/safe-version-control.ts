import { access, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { log } from '@clack/prompts';

const PROJECT_ROOT = process.cwd();
const GITIGNORE_PATH = join(PROJECT_ROOT, '.gitignore');
const EXAMPLE_GITIGNORE_PATH = join(PROJECT_ROOT, 'gitignore.example');

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
   let gitignoreContent = '';
   let needsWrite = false;

   // If no .gitignore, use example if it exists, or just recommended ignores
   try {
      await access(GITIGNORE_PATH);
      gitignoreContent = (await readFile(GITIGNORE_PATH, 'utf8')).trim();
   } catch {
      try {
         await access(EXAMPLE_GITIGNORE_PATH);
         gitignoreContent = (await readFile(EXAMPLE_GITIGNORE_PATH, 'utf8')).trim();
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
      await writeFile(GITIGNORE_PATH, gitignoreContent.trim() + '\n');
      log.success('[MAINTENANCE]: .gitignore updated with missing recommended ignores.');
   } else if (needsWrite) {
      await writeFile(GITIGNORE_PATH, gitignoreContent.trim() + '\n');
      log.success('[MAINTENANCE]: .gitignore created from example.');
   }
}

