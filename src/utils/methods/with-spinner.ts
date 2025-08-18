import { spinner } from '@clack/prompts';

async function withSpinner(message, fn) {
   const s = spinner();
   s.start(message);
   try {
      return await fn();
   } finally {
      s.stop(`[DONE]: ${message}`);
   }
}

export { withSpinner };
