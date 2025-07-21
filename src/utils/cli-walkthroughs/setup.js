import { intro, text, password, spinner, outro, log } from '@clack/prompts';
import { ensureSecretKeyInEnv } from '../crypto/index.js';
import { ensureGitignore } from '../version-control/safeVersionControl.js';
import { join } from 'path';
import { copyFileSync, existsSync } from 'fs';

const __dirname = process.cwd();

function copyConfigTemplate(templateName, targetName) {
   const targetPath = join(process.cwd(), targetName);
   if (existsSync(targetPath)) {
        log.step(`Configuration already exists at -> ${targetPath}`);
      return false;
   }
   const templatePath = join(__dirname, 'src', 'config', templateName);
   copyFileSync(templatePath, targetPath);
      log.step(`Configuration created at -> ${targetPath}`);
   return true;
}

export async function setupWizard() {
   intro('✨ Xano Community CLI Setup');

   const xanoInstanceBaseUrl = await text({
      message: `What's your instance base URL?`,
   });

   const metadataApiKey = await password({
      message: 'Enter your API key:',
   });

   log.step('Configuring your CLI...')

   const s = spinner();
   s.start('Configuring your project...');

   ensureSecretKeyInEnv();
   log.step('Environment variables set!');

   ensureGitignore();
   log.step('.gitignore created!');

   copyConfigTemplate('xcc.config.js', 'xcc.config.js');

   copyConfigTemplate('xcc.test.setup.json', 'xcc.test.setup.json');

   s.stop('Configuration complete!');

   outro('🚀 Setup complete! You can now use the Xano Community CLI.');
}
