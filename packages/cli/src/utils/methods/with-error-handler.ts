import { log } from '@clack/prompts';
// ---- EXIT HANDLERS START ---
function gracefulExit(code = 0, msg = '👋 Goodbye!') {
   log.message('\n' + msg);
   process.exit(code);
}
process.on('SIGINT', () => gracefulExit(0, '👋 Exiting, see you next time!'));
process.on('SIGTERM', () => gracefulExit(0));
process.on('uncaughtException', (err) => {
   log.error('\n💥 ' + (err?.message || String(err)));
   if (err?.stack) log.error(err.stack);
   gracefulExit(1, '👋 Exiting after error.');
});
process.on('unhandledRejection', (reason: any) => {
   log.error('\n💥 ' + (reason?.message || String(reason)));
   if (reason?.stack) log.error(reason.stack);
   gracefulExit(1, '👋 Exiting after promise rejection.');
});
// ---- EXIT HANDLERS END ----

/**
 * Wraps an async function with error handling and process exit.
 */
export function withErrorHandler<T extends any[], R>(
   fn: (...args: T) => Promise<R>,
   exitCode: number = 1
): (...args: T) => Promise<R | void> {
   return async (...args: T) => {
      try {
         return await fn(...args);
      } catch (err: any) {
         if (err?.message) {
            log.error(err.message);
         } else {
            log.error(String(err));
         }
         if (err?.stack) {
            log.error(err.stack);
         }
         gracefulExit(exitCode, '👋 Exiting after error.');
      }
   };
}
