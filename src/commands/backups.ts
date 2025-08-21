import path, { join } from 'path';
import { mkdir } from 'fs/promises';
import { writeFileSync, readdirSync, createReadStream } from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import { spinner, select, confirm, outro, log } from '@clack/prompts';
import { loadToken } from '../config/loaders';
import {
   addPartialContextOptions,
   addFullContextOptions,
   loadAndValidateContext,
   metaApiRequestBlob,
   replacePlaceholders,
   withErrorHandler,
   printOutputDir,
   addPrintOutputFlag,
} from '../utils/index';

async function exportBackup(instance, workspace, branch, printOutput = false) {
   const { instanceConfig, workspaceConfig, branchConfig } = loadAndValidateContext({
      instance,
      workspace,
      branch,
   });

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
   printOutputDir(printOutput, outputDir);
}

async function restoreBackup(instance, workspace, sourceBackup = null, forceConfirm = false) {
   const { instanceConfig, workspaceConfig } = loadAndValidateContext({
      instance,
      workspace,
   });

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

      let backupFilePath;
      if (sourceBackup) {
         backupFilePath = sourceBackup;
      } else {
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

         const sourceBackupPath: string = (await select({
            message: `Select which backup do you wish to restore?`,
            options: availableBackups.map((backup) => ({
               value: backup,
               label: backup,
            })),
         })) as string;

         backupFilePath = join(backupsDir, sourceBackupPath);
      }

      // Only ask for confirmation if forced confirmation was false
      if (!forceConfirm) {
         const restorationConfirmation = await confirm({
            message: `You are about to restore "${instanceConfig.name} > ${workspaceConfig.name}" from backup "${backupFilePath}". Continue?`,
         });

         if (!restorationConfirmation) {
            outro('You have cancelled the restoration process, exiting.');
            process.exit(0);
         }
      }

      s.start(
         `Uploading and importing backup to --> ${instanceConfig.name} > ${workspaceConfig.name} > ${branchConfig.label}`
      );

      const startTime = Date.now();

      const formData = new FormData();
      formData.append('password', '');
      formData.append('file', createReadStream(backupFilePath), {
         filename: path.basename(backupFilePath),
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
   const cmd = program
      .command('export-backup')
      .description('Backup Xano Workspace via Metadata API');

   addFullContextOptions(cmd);
   addPrintOutputFlag(cmd);

   cmd.action(
      withErrorHandler(async (options) => {
         await exportBackup(options.instance, options.workspace, options.branch);
      })
   );
}

function registerRestoreBackupCommand(program) {
   const cmd = program
      .command('restore-backup')
      .description('Restore a backup to a Xano Workspace via Metadata API');

   addPartialContextOptions(cmd);

   cmd.option('--source-backup <file>', 'Path to the backup file to restore')
      .option('--force', 'Force restoration without confirmation')
      .action(
         withErrorHandler(async (options) => {
            await restoreBackup(
               options.instance,
               options.workspace,
               options.sourceBackup,
               options.force
            );
         })
      );
}

export { registerExportBackupCommand, registerRestoreBackupCommand };
