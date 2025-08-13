import { join } from 'path';
import { mkdir } from 'fs/promises';
import { writeFileSync, readdirSync, createReadStream } from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import { spinner, select, confirm, outro, log } from '@clack/prompts';
import { loadToken } from '../config/loaders.js';
import {
   getCurrentContextConfig,
   loadAndValidateContext,
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

async function restoreBackup() {
   const { instanceConfig, workspaceConfig } = loadAndValidateContext();

   const s = spinner();

   try {
      // Select the branch to restore from
      const branchConfigSelection = await select({
         message: `Select which branch to use a backup from:`,
         options: workspaceConfig.branches.map((branch) => ({
            value: branch.label,
            label: branch.label,
         })),
      });

      const branchConfig = workspaceConfig.branches.find((b) => b.label === branchConfigSelection);

      // Find available backups for the selected branch
      const backupsDir = replacePlaceholders(instanceConfig.backups.output, {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
      });

      let availableBackups;
      try {
         availableBackups = readdirSync(backupsDir);
      } catch {
         outro(`No backups directory found for branch "${branchConfig.label}".`);
         process.exit(1);
      }

      if (!availableBackups || availableBackups.length === 0) {
         outro('No backups available for the selected branch.');
         process.exit(0);
      }

      const sourceBackupPath = await select({
         message: `Select which backup do you wish to restore?`,
         options: availableBackups.map((backup) => ({
            value: backup,
            label: backup,
         })),
      });

      const restorationConfirmation = await confirm({
         message: `You are about to restore "${instanceConfig.name} > ${workspaceConfig.name}" from backup "${sourceBackupPath}". Continue?`,
      });

      if (!restorationConfirmation) {
         outro('You have cancelled the restoration process, exiting.');
         process.exit(0);
      }

      const backupFilePath = join(backupsDir, sourceBackupPath);

      s.start(
         `Uploading and importing backup to --> ${instanceConfig.name} > ${workspaceConfig.name} > ${branchConfig.label}`
      );

      const startTime = Date.now();

      const formData = new FormData();
      formData.append('password', '');
      formData.append('file', createReadStream(backupFilePath), {
         filename: sourceBackupPath
      });

      const headers = {
         Authorization: `Bearer ${loadToken(instanceConfig.name)}`,
         ...formData.getHeaders(),
      };

      log.info(`Starting upload of backup: ${backupFilePath}`);
      const response = await axios.post(
         `${instanceConfig.url}/api:meta/workspace/${workspaceConfig.id}/import`,
         formData,
         { headers }
      );

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      if (response.status === 200) {
         s.stop(`Backup restoration completed in ${durationSec} seconds!`);
         log.info(`Xano response: ${JSON.stringify(response.data)}`);
      } else {
         s.stop(`Backup restoration failed after ${durationSec} seconds.`);
         log.error(`HTTP ${response.status} - ${JSON.stringify(response.data)}`);
         process.exit(1);
      }
   } catch (err) {
      s.stop('Backup restoration failed!');
      log.error(err?.message || err);
      process.exit(1);
   }
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

function registerRestoreBackupCommand(program) {
   program
      .command('restore-backup')
      .description('Restore a backup to a Xano Workspace via Metadata API')
      .action(
         withErrorHandler(async () => {
            await restoreBackup();
         })
      );
}

export { registerExportBackupCommand, registerRestoreBackupCommand };
