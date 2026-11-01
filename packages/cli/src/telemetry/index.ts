import { isTelemetryEnabled } from './config';
import { createDetachedDispatcher } from './detached-dispatcher';
import type { TelemetryDispatcher, TelemetryEvent } from './types';

export interface TelemetryOptions {
   env?: NodeJS.ProcessEnv;
   dispatch?: TelemetryDispatcher;
}

export interface Telemetry {
   /**
    * Queues an event. Never performs I/O and never throws, so callers are not
    * coupled to the analytics transport.
    */
   recordEvent(event: string, properties?: Record<string, unknown>): void;
   /**
    * Hands queued events to the dispatcher. Resolves even when the dispatcher
    * rejects; callers may safely fire and forget.
    */
   shutdown(): Promise<void>;
}

export function createTelemetry(options: TelemetryOptions = {}): Telemetry {
   const env = options.env ?? process.env;
   const dispatch = options.dispatch ?? createDetachedDispatcher({ env });
   const events: TelemetryEvent[] = [];
   let isShutdown = false;

   return {
      recordEvent(event, properties) {
         if (isShutdown || !isTelemetryEnabled(env)) return;
         events.push({ event, properties });
      },

      async shutdown() {
         if (isShutdown) return;
         isShutdown = true;

         const pending = events.splice(0, events.length);
         if (pending.length === 0) return;

         try {
            await dispatch(pending);
         } catch {
            // Analytics failures must never surface to the user.
         }
      },
   };
}

/** Process-wide telemetry instance used by the CLI hooks. */
export const telemetry = createTelemetry();

export { maybeRunTelemetrySink } from './sink';
export { isTelemetryEnabled } from './config';
export type { TelemetryDispatcher, TelemetryEvent } from './types';
