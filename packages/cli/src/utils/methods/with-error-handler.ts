import { log } from '@clack/prompts';

const DEBUG = ['1', 'true', 'yes', 'on'].includes(
   (process.env.CALY_DEBUG || '').toLowerCase(),
);

/**
 * Report an error to the user. The stack trace is only shown when CALY_DEBUG is
 * set; by default users see a single inline line with the message.
 */
function reportError(err: any): void {
   const message = err?.message ? err.message : String(err);
   log.error(`\n💥  ${message}`);
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
   reportError(err);
   gracefulExit(1, '👋 Exiting after error.');
});
process.on('unhandledRejection', (reason: any) => {
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
