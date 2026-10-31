import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
   TELEMETRY_LOCK_ENV,
   TELEMETRY_SINK_ENV,
   TELEMETRY_SPOOL_ENV,
} from './config';
import {
   createEventSpool,
   createSinkLock,
   defaultSinkLockPath,
   defaultSpoolPath,
   type EventSpool,
   type SinkLock,
} from './spool';
import type { TelemetryDispatcher, TelemetryEvent } from './types';

export interface DetachedDispatcherDeps {
   env?: NodeJS.ProcessEnv;
   execPath?: string;
   scriptPath?: string;
   spawnProcess?: typeof spawn;
   fileExists?: (path: string) => boolean;
   isSea?: () => boolean;
   spool?: EventSpool;
   lock?: SinkLock;
}

/**
 * Node 20+ exposes the SEA flag. On older runtimes the module is missing, which
 * simply means we cannot recognise a packaged executable.
 */
function isSeaRuntime(): boolean {
   try {
      const sea = require('node:sea') as { isSea?: () => boolean };
      return typeof sea.isSea === 'function' && sea.isSea();
   } catch {
      return false;
   }
}

function resolveSinkArgs(
   scriptPath: string | undefined,
   fileExists: (path: string) => boolean,
   isSea: () => boolean
): string[] | null {
   if (scriptPath && /\.(c|m)?js$/i.test(scriptPath) && fileExists(scriptPath)) {
      return [scriptPath];
   }

   if (isSea()) {
      return [];
   }

   // Unknown launcher (e.g. a wrapper without a JS entry point): skip telemetry
   // rather than spawning something that might behave unexpectedly.
   return null;
}

/**
 * Spools events and guarantees at most one detached flusher at a time.
 *
 * The parent only appends to a file and spawns when no flusher holds the lock.
 * A flusher drains everything spooled so far, so a burst of commands costs one
 * process, not one per command, and a crashed flusher is replaced after its
 * lock goes stale.
 */
export function createDetachedDispatcher(
   deps: DetachedDispatcherDeps = {}
): TelemetryDispatcher {
   const env = deps.env ?? process.env;
   const execPath = deps.execPath ?? process.execPath;
   const scriptPath = deps.scriptPath ?? process.argv[1];
   const spawnProcess = deps.spawnProcess ?? spawn;
   const fileExists = deps.fileExists ?? existsSync;
   const isSea = deps.isSea ?? isSeaRuntime;
   const spool = deps.spool ?? createEventSpool(defaultSpoolPath(env));
   const lock = deps.lock ?? createSinkLock(defaultSinkLockPath(env));

   return (events: TelemetryEvent[]) => {
      try {
         if (events.length === 0) return;
         spool.append(events);

         // A flusher is already draining; it will pick these events up on its
         // next run, or the next command will.
         if (!lock.acquire()) return;

         const args = resolveSinkArgs(scriptPath, fileExists, isSea);
         if (!args) {
            lock.release();
            return;
         }

         const child = spawnProcess(execPath, args, {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
            env: {
               ...env,
               [TELEMETRY_SINK_ENV]: '1',
               [TELEMETRY_SPOOL_ENV]: spool.path,
               [TELEMETRY_LOCK_ENV]: lock.path,
            },
         });

         // Identify the flusher immediately: the parent usually exits before the
         // child reaches its own entry point, and the lock is the way to find a
         // running flusher if it ever needs reaping.
         if (child.pid) lock.identify(child.pid);

         // Without a listener, a failed spawn would surface as an uncaught
         // 'error' event and take the CLI down with it.
         child.on('error', () => lock.release());
         child.unref();
      } catch {
         // Telemetry is best effort and must never break a command.
         lock.release();
      }
   };
}
