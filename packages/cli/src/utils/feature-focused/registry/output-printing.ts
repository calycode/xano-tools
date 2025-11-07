import { InstallResults } from '@repo/types';

function printInstallSummary(results: InstallResults, log: typeof import('@clack/prompts').log) {
   if (results.installed.length) {
      log.success('Installed components:');
      results.installed.forEach(({ component, file }) => {
         log.info(`${component}\nFile: ${file}\n---`);
      });
   }
   if (results.failed.length) {
      log.error('Failed components:');
      results.failed.forEach(({ component, file, error }) => {
         log.warn(`${component}\nFile: ${file}\nError: ${error}\n---`);
      });
   }
   if (results.skipped.length) {
      log.warn('Skipped components (already exist in your Xano instance):');
      results.skipped.forEach(({ component, file, error }) => {
         log.warn(`${component}\nFile: ${file}\nReason: ${error}\n---`);
      });
      log.info(
         'Hint: These components were not reinstalled because they already exist. ' +
            'If you expect a different version, consider removing them from Xano first. ' +
            'Existing components may be stale or have been changed since their original installation.'
      );
   }
   if (!results.installed.length && !results.failed.length && !results.skipped.length) {
      log.info('\nNo components were installed.');
   }
}

export { printInstallSummary };
