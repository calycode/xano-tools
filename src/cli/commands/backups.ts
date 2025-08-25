import path, { join } from 'path';
import { readdirSync } from 'fs';
import { openAsBlob } from 'node:fs';
import { spinner, select, confirm, outro, log } from '@clack/prompts';
import {
   addFullContextOptions,
   addPartialContextOptions,
   addPrintOutputFlag,
   printOutputDir,
   replacePlaceholders,
   withErrorHandler,
} from '../utils/index';
const { FormData } = globalThis;

async function restorationWizard({ instance, workspace, sourceBackup, forceConfirm, core }) {
   const { instanceConfig, workspaceConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
   });

   const s = spinner();

   try {
      let backupFilePath = sourceBackup;
      if (!sourceBackup) {
         // Select the branch to restore from
         const branchConfigSelection = await select({
            message: `Select which branch to use a backup from:`,
            options: workspaceConfig.branches.map((branch) => ({
               value: branch.label,
               label: branch.label,
            })),
         });

         const branchConfig = workspaceConfig.branches.find(
            (b) => b.label === branchConfigSelection
         );

         // Find available backups for the selected branch
         const backupsDir = replacePlaceholders(instanceConfig.backups.output, {
            branch: branchConfig.label,
            instance: instanceConfig.name,
            workspace: workspaceConfig.name,
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
         `Uploading and importing backup to --> ${instanceConfig.name} > ${workspaceConfig.name}`
      );

      const startTime = Date.now();

      const formData = new FormData();
      formData.append('file', await openAsBlob(backupFilePath), path.basename(backupFilePath));
      formData.append('password', '');

      // Pass on the formdata to the core implementation
      const response = await core.restoreBackup({
         formData,
         instance,
         workspace,
      });

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

function registerExportBackupCommand(program, core) {
   const cmd = program
      .command('export-backup')
      .description('Backup Xano Workspace via Metadata API');

   addFullContextOptions(cmd);
   addPrintOutputFlag(cmd);

   cmd.action(
      withErrorHandler(async (options) => {
         const outputObject = await core.exportBackup({
            branch: options.branch,
            instance: options.instance,
            workspace: options.workspace,
         });
         printOutputDir(options.printOutput, outputObject.outputDir);
      })
   );
}

// CLI
function registerRestoreBackupCommand(program, core) {
   const cmd = program
      .command('restore-backup')
      .description('Restore a backup to a Xano Workspace via Metadata API');

   addPartialContextOptions(cmd);

   cmd.option('--source-backup <file>', 'Path to the backup file to restore')
      .option('--force', 'Force restoration without confirmation')
      .action(
         withErrorHandler(async (options) => {
            await restorationWizard({
               instance: options.instance,
               workspace: options.workspace,
               sourceBackup: options.sourceBackup,
               forceConfirm: options.force,
               core: core,
            });
         })
      );
}

export { registerExportBackupCommand, registerRestoreBackupCommand };
