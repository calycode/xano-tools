import { PostHog } from 'posthog-node';
import {
   ANONYMOUS_DISTINCT_ID,
   isTelemetryEnabled,
   POSTHOG_API_KEY,
   POSTHOG_HOST,
   TELEMETRY_PAYLOAD_ENV,
   TELEMETRY_SINK_ENV,
} from './config';
import type { TelemetryEvent } from './types';

const SINK_REQUEST_TIMEOUT_MS = 3_000;
const SINK_SHUTDOWN_TIMEOUT_MS = 4_000;
const SINK_HARD_LIMIT_MS = 10_000;

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
      // The sink is disposable and already detached, so retries only delay its
      // exit. One attempt with a hard request timeout is enough.
      fetchRetryCount: 0,
      requestTimeout: SINK_REQUEST_TIMEOUT_MS,
   });
}

/**
 * Flushes a batch through PostHog. Every failure is swallowed: losing an event
 * is acceptable, crashing the sink (or the CLI) is not.
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

function decodePayload(raw: string | undefined): TelemetryEvent[] {
   if (!raw) return [];
   try {
      const parsed = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
         (entry): entry is TelemetryEvent =>
            !!entry &&
            typeof entry === 'object' &&
            typeof (entry as TelemetryEvent).event === 'string'
      );
   } catch {
      return [];
   }
}

export function isTelemetrySinkInvocation(
   env: NodeJS.ProcessEnv = process.env
): boolean {
   return env[TELEMETRY_SINK_ENV] === '1';
}

function runTelemetrySink(env: NodeJS.ProcessEnv): void {
   const events = decodePayload(env[TELEMETRY_PAYLOAD_ENV]);
   if (!isTelemetryEnabled(env) || events.length === 0) {
      process.exit(0);
   }

   // The parent normally outlives us only briefly, but never linger forever if
   // something keeps the socket open.
   const guard = setTimeout(() => process.exit(0), SINK_HARD_LIMIT_MS);
   guard.unref();

   void sendTelemetryEvents(events)
      .catch(() => {})
      .finally(() => process.exit(0));
}

/**
 * Called at the top of the CLI entry point. Returns true when this process is
 * the detached telemetry sink; it then owns its own exit.
 */
export function maybeRunTelemetrySink(
   env: NodeJS.ProcessEnv = process.env
): boolean {
   if (!isTelemetrySinkInvocation(env)) return false;
   try {
      runTelemetrySink(env);
   } catch {
      process.exit(0);
   }
   return true;
}
