import { log } from '@clack/prompts';

const DEBUG = ['1', 'true', 'yes', 'on'].includes(
   (process.env.CALY_DEBUG || '').toLowerCase(),
);

/**
 * Report an error to the user. The stack trace is only shown when CALY_DEBUG is
 * set; by default users see the message alone.
 */
function reportError(err: any): void {
   if (err?.message) {
      log.error(err.message);
   } else {
      log.error(String(err));
   }
   if (DEBUG && err?.stack) {
      log.error(err.stack);
   }
}

// ---- EXIT HANDLERS START ---
function gracefulExit(code = 0, msg = '👋 Goodbye!') {
   log.message('\n' + msg);
   process.exit(code);
}
process.on('SIGINT', () => gracefulExit(0, '👋 Exiting, see you next time!'));
process.on('SIGTERM', () => gracefulExit(0));
process.on('uncaughtException', (err) => {
   log.error('\n💥 ');
   reportError(err);
   gracefulExit(1, '👋 Exiting after error.');
});
process.on('unhandledRejection', (reason: any) => {
   log.error('\n💥 ');
   reportError(reason);
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
         reportError(err);
         gracefulExit(exitCode, '👋 Exiting after error.');
      }
   };
}
