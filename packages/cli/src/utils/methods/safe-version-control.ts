import fs from 'fs';
import path from 'path';
import { log } from '@clack/prompts';

// [ ] CLI
const PROJECT_ROOT = process.cwd();
const GITIGNORE_PATH = path.join(PROJECT_ROOT, '.gitignore');
const EXAMPLE_GITIGNORE_PATH = path.join(PROJECT_ROOT, 'gitignore.example');

const RECOMMENDED_IGNORES = [
   '.env',
   'workspace.yaml',
   'xcc.config.js',
   'xcc.test.setup.json',
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

export function ensureGitignore() {
   let gitignoreContent = '';
   let needsWrite = false;

   // If no .gitignore, use example if it exists, or just recommended ignores
   if (!fs.existsSync(GITIGNORE_PATH)) {
      if (fs.existsSync(EXAMPLE_GITIGNORE_PATH)) {
         gitignoreContent = fs.readFileSync(EXAMPLE_GITIGNORE_PATH, 'utf8').trim();
      }
      needsWrite = true;
   } else {
      gitignoreContent = fs.readFileSync(GITIGNORE_PATH, 'utf8').trim();
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
      fs.writeFileSync(GITIGNORE_PATH, gitignoreContent.trim() + '\n');
      log.success('[MAINTENANCE]: .gitignore updated with missing recommended ignores.');
   } else if (needsWrite) {
      fs.writeFileSync(GITIGNORE_PATH, gitignoreContent.trim() + '\n');
      log.success('[MAINTENANCE]: .gitignore created from example.');
   }
}
