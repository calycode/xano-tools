import { log } from '@clack/prompts';

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
         process.exit(exitCode);
      }
   };
}
