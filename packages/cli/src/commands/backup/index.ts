import {
   addFullContextOptions,
   addPartialContextOptions,
   addPrintOutputFlag,
   withErrorHandler,
} from '../../utils';
import { restorationWizard, exportWizard } from './implementation/backup';

// Group the commands under the backup namespace

function registerBackupCommands(program, core) {
   const backupNamespace = program
      .command('backup')
      .description('Backup and restoration operations.');

   const backupExportCommand = backupNamespace
      .command('export')
      .description('Backup Xano Workspace via Metadata API');
   addFullContextOptions(backupExportCommand);
   addPrintOutputFlag(backupExportCommand);
   backupExportCommand.action(
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

   const backupRestoreCommand = backupNamespace
      .command('restore')
      .description(
         'Restore a backup to a Xano Workspace via Metadata API. DANGER! This action will override all business logic and restore the original v1 branch. Data will be also restored from the backup file.'
      );
   addPartialContextOptions(backupRestoreCommand);
   backupRestoreCommand
      .option('-S, --source-backup <file>', 'Local path to the backup file to restore.')
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

export { registerBackupCommands };
