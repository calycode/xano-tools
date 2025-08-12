import { join } from 'path';
import { mkdir } from 'fs/promises';
import { writeFileSync } from 'fs';
import { spinner } from '@clack/prompts';
import { loadToken } from '../config/loaders.js';
import {
   getCurrentContextConfig,
   metaApiRequestBlob,
   replacePlaceholders,
   withErrorHandler,
} from '../utils/index.js';

async function exportBackup() {
   const { instanceConfig, workspaceConfig, branchConfig } = getCurrentContextConfig();

   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      throw new Error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
   }

   const s = spinner();

   s.start('Fetching and saving backup...');

   // Resolve output dir
   const outputDir = replacePlaceholders(instanceConfig.backups.output, {
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });

   // Ensure outputDir exists:
   await mkdir(outputDir, { recursive: true });

   const backupBuffer = await metaApiRequestBlob({
      baseUrl: instanceConfig.url,
      token: loadToken(instanceConfig.name),
      method: 'POST',
      path: `/workspace/${workspaceConfig.id}/export`,
      body: { branch: branchConfig.label },
   });

   const now = new Date();
   const ts = now.toISOString().replace(/[:.]/g, '-');
   const backupPath = join(outputDir, `backup-${ts}.tar.gz`);
   writeFileSync(backupPath, backupBuffer);

   s.stop(`Workspace backup saved -> ${backupPath}`);
}

function registerExportBackupCommand(program) {
   program
      .command('export-backup')
      .description('Backup Xano Workspace via Metadata API')
      .action(
         withErrorHandler(async () => {
            await exportBackup();
         })
      );
}

export { registerExportBackupCommand };
