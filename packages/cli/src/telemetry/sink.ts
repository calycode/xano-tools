import { PostHog } from 'posthog-node';
import {
   ANONYMOUS_DISTINCT_ID,
   isTelemetryEnabled,
   POSTHOG_API_KEY,
   POSTHOG_HOST,
   TELEMETRY_SINK_ENV,
} from './config';
import {
   createEventSpool,
   createSinkLock,
   defaultSinkLockPath,
   defaultSpoolPath,
   type EventSpool,
   type SinkLock,
} from './spool';
import type { TelemetryEvent } from './types';

/**
 * The flusher is disposable. These bounds guarantee it cannot linger: no retry,
 * a short request timeout, a short shutdown timeout, and a hard process deadline
 * that is always armed even if a socket is left open.
 */
const SINK_REQUEST_TIMEOUT_MS = 2_000;
const SINK_SHUTDOWN_TIMEOUT_MS = 2_000;
const SINK_HARD_LIMIT_MS = 5_000;
/** Do not start another send when the hard deadline is this close. */
const SINK_DRAIN_MARGIN_MS = 500;

export interface TelemetryClient {
   capture(props: {
      distinctId: string;
      event: string;
      properties?: Record<string, unknown>;
   }): void;
   shutdown(timeoutMs?: number): Promise<void>;
}

export interface SendTelemetryDeps {
   createClient?: () => TelemetryClient;
}

function createPostHogClient(): TelemetryClient {
   return new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      // The flusher is disposable, so retries only delay its exit. One attempt
      // with a hard request timeout is enough.
      fetchRetryCount: 0,
      requestTimeout: SINK_REQUEST_TIMEOUT_MS,
   });
}

/**
 * Flushes a batch through PostHog. Every failure is swallowed: losing an event
 * is acceptable, crashing the flusher (or the CLI) is not.
 */
export async function sendTelemetryEvents(
   events: TelemetryEvent[],
   deps: SendTelemetryDeps = {}
): Promise<void> {
   if (events.length === 0) return;

   try {
      const client = (deps.createClient ?? createPostHogClient)();
      for (const event of events) {
         client.capture({
            distinctId: ANONYMOUS_DISTINCT_ID,
            event: event.event,
            properties: {
               ...event.properties,
               // Keep events out of person profiles; the CLI has no identity.
               $process_person_profile: false,
            },
         });
      }
      await client.shutdown(SINK_SHUTDOWN_TIMEOUT_MS);
   } catch {
      // Deliberately ignored (see above).
   }
}

export function isTelemetrySinkInvocation(
   env: NodeJS.ProcessEnv = process.env
): boolean {
   return env[TELEMETRY_SINK_ENV] === '1';
}

export interface RunTelemetrySinkDeps {
   spool?: EventSpool;
   lock?: SinkLock;
   send?: (events: TelemetryEvent[]) => Promise<void>;
   exit?: (code: number) => never;
}

function runTelemetrySink(
   env: NodeJS.ProcessEnv,
   deps: RunTelemetrySinkDeps = {}
): void {
   const spool = deps.spool ?? createEventSpool(defaultSpoolPath(env));
   const lock = deps.lock ?? createSinkLock(defaultSinkLockPath(env, spool.path));
   const send = deps.send ?? ((events) => sendTelemetryEvents(events));

   // Identify this flusher in the lock file so it can be found and killed while
   // it is draining (it removes the lock itself on exit).
   lock.own();
   const exit = deps.exit ?? ((code: number) => process.exit(code));

   const deadline = Date.now() + SINK_HARD_LIMIT_MS;

   let finished = false;
   const finish = (): void => {
      if (finished) return;
      finished = true;
      clearTimeout(guard);
      lock.release();
      exit(0);
   };

   // Ref'd on purpose: this is the last line of defence, so it must be able to
   // end the process even if a client handle keeps the loop alive.
   const guard = setTimeout(finish, SINK_HARD_LIMIT_MS);

   const first = spool.drain();
   if (!isTelemetryEnabled(env) || first.length === 0) {
      finish();
      return;
   }

   // Commands that append while this flusher is sending cannot take the lock,
   // so their events would otherwise sit on disk until the next command. Drain
   // again after every send and keep going while there is data and the hard
   // deadline leaves room for another request.
   const flush = async (events: TelemetryEvent[]): Promise<void> => {
      let batch = events;
      while (!finished) {
         await send(batch).catch(() => {});
         if (finished) return;
         if (deadline - Date.now() < SINK_DRAIN_MARGIN_MS) return;

         batch = spool.drain();
         if (batch.length === 0) return;
      }
   };

   void flush(first)
      .catch(() => {})
      .finally(finish);
}

/**
 * Called at the top of the CLI entry point. Returns true when this process is
 * the detached telemetry flusher; it then owns its own exit.
 */
export function maybeRunTelemetrySink(
   env: NodeJS.ProcessEnv = process.env,
   deps: RunTelemetrySinkDeps = {}
): boolean {
   if (!isTelemetrySinkInvocation(env)) return false;
   try {
      runTelemetrySink(env, deps);
   } catch {
      deps.exit ? deps.exit(0) : process.exit(0);
   }
   return true;
}

export { SINK_HARD_LIMIT_MS, SINK_REQUEST_TIMEOUT_MS, SINK_SHUTDOWN_TIMEOUT_MS };
