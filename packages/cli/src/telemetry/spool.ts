import { createHash } from 'node:crypto';
import {
   appendFileSync,
   closeSync,
   mkdirSync,
   openSync,
   readFileSync,
   rmSync,
   statSync,
   writeFileSync,
   writeSync,
} from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type { TelemetryEvent } from './types';

/**
 * Events are spooled to disk instead of being handed to a per-command child
 * process. One detached flusher drains the spool and exits; further commands
 * append to the same file while it runs.
 *
 * Both bounds below are deliberate: a spool that cannot be delivered must not
 * grow without limit, and dropping a batch is preferable to eating disk.
 */
const MAX_SPOOL_BYTES = 512 * 1024;
const MAX_SPOOL_EVENTS = 200;

/** A lock older than this is treated as left behind by a crashed flusher. */
const SINK_LOCK_STALE_MS = 15_000;

function isTelemetryEvent(value: unknown): value is TelemetryEvent {
   if (!value || typeof value !== 'object') return false;
   return typeof (value as TelemetryEvent).event === 'string';
}

export interface EventSpool {
   readonly path: string;
   /** Appends a batch. Returns false when the spool is full. Never throws. */
   append(events: TelemetryEvent[]): boolean;
   /** Reads and removes every spooled event. Never throws. */
   drain(): TelemetryEvent[];
}

export function createEventSpool(path: string): EventSpool {
   return {
      path,

      append(events) {
         if (events.length === 0) return true;

         try {
            mkdirSync(dirname(path), { recursive: true });
            const line = `${JSON.stringify(events)}\n`;
            let existingSize = 0;
            try {
               existingSize = statSync(path).size;
            } catch {
               // Missing spool file: nothing to size-check.
            }
            if (existingSize + Buffer.byteLength(line) > MAX_SPOOL_BYTES) return false;
            appendFileSync(path, line, { encoding: 'utf8', mode: 0o600 });
            return true;
         } catch {
            return false;
         }
      },

      drain() {
         let raw: string;
         try {
            raw = readFileSync(path, 'utf8');
         } catch {
            return [];
         }

         try {
            rmSync(path, { force: true });
         } catch {
            // If removal fails the next drain re-reads the same batch; sending
            // it twice is better than never sending it.
         }

         const events: TelemetryEvent[] = [];
         for (const line of raw.split('\n')) {
            if (!line.trim() || events.length >= MAX_SPOOL_EVENTS) continue;
            try {
               const parsed = JSON.parse(line);
               const batch = Array.isArray(parsed) ? parsed : [parsed];
               for (const entry of batch) {
                  if (isTelemetryEvent(entry) && events.length < MAX_SPOOL_EVENTS) {
                     events.push(entry);
                  }
               }
            } catch {
               // Skip a corrupt line rather than dropping the whole spool.
            }
         }

         return events;
      },
   };
}

export interface SinkLock {
   readonly path: string;
   /** Creates the lock atomically. False when another flusher holds it. */
   acquire(): boolean;
   /**
    * Records the flusher's pid in the lock so it can be found and killed while
    * it is draining. Called by the parent right after spawn and by the flusher
    * itself once it starts.
    */
   identify(pid: number): void;
   /** Rewrites the lock with this process's own pid. */
   own(): void;
   release(): void;
}

export function createSinkLock(path: string, staleMs = SINK_LOCK_STALE_MS): SinkLock {
   return {
      path,

      acquire() {
         try {
            mkdirSync(dirname(path), { recursive: true });
         } catch {
            return false;
         }

         // Two attempts: the second runs only after removing a stale lock.
         for (let attempt = 0; attempt < 2; attempt++) {
            try {
               const fd = openSync(path, 'wx', 0o600);
               writeSync(fd, `${process.pid}\n${Date.now()}`);
               closeSync(fd);
               return true;
            } catch (error) {
               if ((error as NodeJS.ErrnoException).code !== 'EEXIST') return false;
               if (attempt === 1) return false;

               let ageMs: number;
               try {
                  ageMs = Date.now() - statSync(path).mtimeMs;
               } catch {
                  // Lock vanished between open and stat: retry immediately.
                  continue;
               }
               if (ageMs < staleMs) return false;

               try {
                  rmSync(path, { force: true });
               } catch {
                  return false;
               }
            }
         }

         return false;
      },

      identify(pid) {
         try {
            writeFileSync(path, `${pid}\n${Date.now()}`, 'utf8');
         } catch {
            // The lock is advisory; failing to rewrite it must not stop the flush.
         }
      },

      own() {
         this.identify(process.pid);
      },

      release() {
         try {
            rmSync(path, { force: true });
         } catch {
            // A stale lock expires on its own.
         }
      },
   };
}

function userHash(): string {
   return createHash('sha256').update(homedir()).digest('hex').slice(0, 12);
}

/** Path overrides exist so tests and wrappers can isolate the spool. */
export function defaultSpoolPath(env: NodeJS.ProcessEnv = process.env): string {
   return env.CALY_TELEMETRY_SPOOL || join(homedir(), '.xano-tools', 'telemetry-spool.jsonl');
}

export function defaultSinkLockPath(env: NodeJS.ProcessEnv = process.env): string {
   return env.CALY_TELEMETRY_LOCK || join(tmpdir(), `caly-xano-telemetry-${userHash()}.lock`);
}

export { MAX_SPOOL_EVENTS, SINK_LOCK_STALE_MS };
