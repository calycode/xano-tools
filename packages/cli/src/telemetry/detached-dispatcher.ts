import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
   MAX_TELEMETRY_PAYLOAD_CHARS,
   TELEMETRY_PAYLOAD_ENV,
   TELEMETRY_SINK_ENV,
} from './config';
import type { TelemetryDispatcher, TelemetryEvent } from './types';

export interface DetachedDispatcherDeps {
   env?: NodeJS.ProcessEnv;
   execPath?: string;
   scriptPath?: string;
   spawnProcess?: typeof spawn;
   fileExists?: (path: string) => boolean;
   isSea?: () => boolean;
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
   if (
      scriptPath &&
      /\.(c|m)?js$/i.test(scriptPath) &&
      fileExists(scriptPath)
   ) {
      return [scriptPath];
   }

   if (isSea()) {
      return [];
   }

   // Unknown launcher (e.g. a wrapper without a JS entry point): skip telemetry
   // rather than spawning something that might behave unexpectedly.
   return null;
}

function encodeEvents(events: TelemetryEvent[]): string {
   return Buffer.from(JSON.stringify(events), 'utf8').toString('base64');
}

/**
 * Sends events from a short-lived detached process. The spawn is the only work
 * the CLI process performs; the network request (and any retries or failures)
 * happen after the CLI has already exited.
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

   return (events) => {
      try {
         const payload = encodeEvents(events);
         if (payload.length > MAX_TELEMETRY_PAYLOAD_CHARS) return;

         const args = resolveSinkArgs(scriptPath, fileExists, isSea);
         if (!args) return;

         const child = spawnProcess(execPath, args, {
            detached: true,
            stdio: 'ignore',
            windowsHide: true,
            env: {
               ...env,
               [TELEMETRY_SINK_ENV]: '1',
               [TELEMETRY_PAYLOAD_ENV]: payload,
            },
         });

         // Without a listener, a failed spawn would surface as an uncaught
         // 'error' event and take the CLI down with it.
         child.on('error', () => {});
         child.unref();
      } catch {
         // Telemetry is best effort and must never break a command.
      }
   };
}
