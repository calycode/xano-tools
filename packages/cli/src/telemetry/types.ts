export interface TelemetryEvent {
   event: string;
   properties?: Record<string, unknown>;
}

/**
 * Hands a batch of events to a transport. It must never decide when the
 * process exits, so implementations either return synchronously or return a
 * promise the caller may ignore.
 */
export type TelemetryDispatcher = (
   events: TelemetryEvent[]
) => void | Promise<void>;
