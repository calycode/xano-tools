import { intro, text, password, spinner, outro, log } from '@clack/prompts';
import { ensureSecretKeyInEnv } from '../crypto/index.js';
import { ensureGitignore } from '../version-control/safeVersionControl.js';
import { join } from 'path';
import { copyFileSync, existsSync, writeFileSync } from 'fs';
import { encryptData } from '../crypto/index.js';
import { loadEnvToProcess } from '../crypto/handleEnv.js';
import { pathToFileURL } from 'url';

const __dirname = process.cwd();

function copyConfigTemplate(templateName, targetName) {
   const targetPath = join(__dirname, targetName);
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
   intro('✨ Xano Community CLI Setup Wizard ✨');

   const xanoInstanceBaseUrl = await text({
      message: `What's your instance base URL?`,
   });

   const metadataApiKey = await password({
      message: 'Enter your Metadata API key:',
   });

   log.step('Configuring your CLI...');

   const s = spinner();
   s.start('Configuring your CLI...');

   ensureSecretKeyInEnv();
   loadEnvToProcess();
   log.step('Environment variables set!');

   ensureGitignore();
   log.step('.gitignore created!');

   copyConfigTemplate('xcc.config.js', 'xcc.config.js');

   // Load the config (as ESM)
   let configModule = await import(pathToFileURL(join(__dirname, 'xcc.config.js')));
   let config = configModule.default;

   // Encrypt the API key
   const secretKey = process.env.XCC_SECRET_KEY;
   const encryptedApiKey = encryptData(metadataApiKey, secretKey);

   // Update config with user input
   config.instance.baseUrl = xanoInstanceBaseUrl;
   config.instance.metadataKey = encryptedApiKey;

   // Write the updated config back (as JS)
   const configJs = 'export default ' + JSON.stringify(config, null, 3) + ';\n';
   writeFileSync(join(__dirname, 'xcc.config.js'), configJs);

   log.step('Config updated with your instance details!');

   copyConfigTemplate('xcc.test.setup.json', 'xcc.test.setup.json');

   s.stop('Configuration complete!');

   outro('🚀 Setup complete! You can now use the Xano Community CLI. 🚀');
}
