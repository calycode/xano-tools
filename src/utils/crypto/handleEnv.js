import fs from 'fs';
import dotenv from 'dotenv';

function readEnvFile(envPath = '.env') {
   if (!fs.existsSync(envPath)) return {};
   const envContents = fs.readFileSync(envPath, 'utf8');
   return dotenv.parse(envContents);
}

function writeEnvFile(updates, envPath = '.env') {
   let env = '';
   if (fs.existsSync(envPath)) {
      env = fs.readFileSync(envPath, 'utf8');
   }
   const lines = env.split(/\r?\n/);

   // For each update, either update existing or append
   for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=`);
      let found = false;
      for (let i = 0; i < lines.length; i++) {
         if (regex.test(lines[i])) {
            lines[i] = `${key}=${value}`;
            found = true;
            break;
         }
      }
      if (!found) {
         lines.push(`${key}=${value}`);
      }
   }

   // Remove empty lines at end, add one newline
   const newEnv = lines.filter(Boolean).join('\n') + '\n';
   fs.writeFileSync(envPath, newEnv);
}

function loadEnvToProcess(envPath = '.env') {
   dotenv.config({ path: envPath, quiet: true });
}

export { readEnvFile, writeEnvFile, loadEnvToProcess }
