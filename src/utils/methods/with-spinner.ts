import { spinner } from '@clack/prompts';

/**
 * Runs a function with a spinner and returns its result.
 */
export async function withSpinner<T>(message: string, fn: () => Promise<T>): Promise<T> {
   const s = spinner();
   s.start(message);
   try {
      const result = await fn();
      s.stop(`[DONE]: ${message}`);
      return result;
   } catch (err: any) {
      s.stop(`[ERROR]: ${message}`);
      throw err;
   }
}
