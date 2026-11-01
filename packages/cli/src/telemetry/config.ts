/** Environment variable that lets users opt out of telemetry. */
export const TELEMETRY_ENV = 'CALY_TELEMETRY';

/** Standard do-not-track signal, also honoured as an opt-out. */
export const DO_NOT_TRACK_ENV = 'DO_NOT_TRACK';

/** Set on the detached sink process that actually performs the HTTP request. */
export const TELEMETRY_SINK_ENV = 'CALY_TELEMETRY_SINK';

/** Overrides the on-disk spool path (used by tests and isolated wrappers). */
export const TELEMETRY_SPOOL_ENV = 'CALY_TELEMETRY_SPOOL';

/** Overrides the sink lock path (used by tests and isolated wrappers). */
export const TELEMETRY_LOCK_ENV = 'CALY_TELEMETRY_LOCK';

/** The CLI does not identify users, so every event uses this id. */
export const ANONYMOUS_DISTINCT_ID = 'anonymous';

export const POSTHOG_HOST = 'https://eu.i.posthog.com';

export const POSTHOG_API_KEY =
   'phc_MrSAUUthn4y0PWjbxVt9a9ys7TrQKMQhdYvErJFPvE3';

const DISABLED_VALUES = ['0', 'false', 'off', 'no'];
const ENABLED_VALUES = ['1', 'true', 'yes', 'on'];

function matches(value: string | undefined, candidates: string[]): boolean {
   if (value === undefined) return false;
   return candidates.includes(value.trim().toLowerCase());
}

/**
 * Telemetry is on by default and can be turned off with either
 * `CALY_TELEMETRY=0` or `DO_NOT_TRACK=1`.
 */
export function isTelemetryEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
   if (matches(env[TELEMETRY_ENV], DISABLED_VALUES)) return false;
   if (matches(env[DO_NOT_TRACK_ENV], ENABLED_VALUES)) return false;
   return true;
}
