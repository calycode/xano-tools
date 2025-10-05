import { basename, join } from 'node:path';
import { readdir } from 'node:fs/promises';
import { openAsBlob } from 'node:fs';
import { select, confirm, outro } from '@clack/prompts';
import { replacePlaceholders } from '@repo/utils';
import {
   addFullContextOptions,
   addPartialContextOptions,
   addPrintOutputFlag,
   printOutputDir,
   withErrorHandler,
} from '../utils/index';
import { attachCliEventHandlers } from '../utils/event-listener';
import { resolveConfigs } from '../utils/commands/context-resolution';
import { findProjectRoot } from '../utils/commands/project-root-finder';
const { FormData } = globalThis;

async function restorationWizard({ instance, workspace, sourceBackup, forceConfirm, core }) {
   const { instanceConfig, workspaceConfig } = await resolveConfigs({
      cliContext: { instance, workspace },
      core,
      requiredFields: ['instance', 'workspace'],
   });

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
            '@': await findProjectRoot(),
            instance: instanceConfig.name,
            workspace: workspaceConfig.name,
            branch: branchConfig.label,
         });

         let availableBackups;
         try {
            availableBackups = await readdir(backupsDir);
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

      const formData = new FormData();
      formData.append('file', await openAsBlob(backupFilePath), basename(backupFilePath));
      formData.append('password', '');

      // Pass on the formdata to the core implementation
      await core.restoreBackup({
         formData,
         instance,
         workspace,
      });
   } catch (err) {
      process.exit(1);
   }
}

async function exportWizard({ instance, workspace, branch, core, doLog, output }) {
   attachCliEventHandlers('export-backup', core, arguments);

   const { instanceConfig, workspaceConfig, branchConfig, context } = await resolveConfigs({
      cliContext: { instance, workspace, branch },
      core,
   });

   // Resolve output dir
   const outputDir = output
      ? output
      : replacePlaceholders(instanceConfig.backups.output, {
           '@': await findProjectRoot(),
           instance: instanceConfig.name,
           workspace: workspaceConfig.name,
           branch: branchConfig.label,
        });

   const outputObject = await core.exportBackup({ ...context, outputDir });

   printOutputDir(doLog, outputObject.outputDir);
}

// [ ] Add potentially context awareness like in the other commands
function registerExportBackupCommand(program, core) {
   const cmd = program
      .command('export-backup')
      .description('Backup Xano Workspace via Metadata API');

   addFullContextOptions(cmd);
   addPrintOutputFlag(cmd);

   cmd.action(
      withErrorHandler(async (options) => {
         await exportWizard({
            instance: options.instance,
            workspace: options.workspace,
            branch: options.branch,
            core: core,
            doLog: options.printOutputDir,
            output: options.output,
         });
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
