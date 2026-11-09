import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getCalycodeOpencodeConfigDir, ensureDirectoryExists } from '../distribution';

export const NATIVE_HOST_STATE_DIR = path.join(getCalycodeOpencodeConfigDir(), 'native-host-state');
export const NATIVE_HOST_OWNER_TOKEN_PATH = path.join(NATIVE_HOST_STATE_DIR, 'owner-token.txt');

export interface NativeHostSessionMetadata {
   port: number;
   pid: number;
   ownerToken: string;
   updatedAt: string;
   url?: string;
   requestedPort?: number | null;
   autoSelected?: boolean;
   keepAlive?: boolean;
   origins?: string[];
   ocVersion?: string;
   password?: string;
}

export function getNativeHostOwnerToken(): string | null {
   try {
      if (!fs.existsSync(NATIVE_HOST_OWNER_TOKEN_PATH)) {
         return null;
      }

      const existing = fs.readFileSync(NATIVE_HOST_OWNER_TOKEN_PATH, 'utf8').trim();
      return existing || null;
   } catch {
      return null;
   }
}

export function getOrCreateNativeHostOwnerToken(): string {
   const existing = getNativeHostOwnerToken();
   if (existing) {
      return existing;
   }

   ensureDirectoryExists(NATIVE_HOST_STATE_DIR);
   const token = randomUUID();
   fs.writeFileSync(NATIVE_HOST_OWNER_TOKEN_PATH, token, 'utf8');
   return token;
}

export function getNativeHostSessionMetadataPath(port: number): string {
   return path.join(NATIVE_HOST_STATE_DIR, `session-${port}.json`);
}

export function writeNativeHostSessionMetadata(metadata: NativeHostSessionMetadata): void {
   try {
      ensureDirectoryExists(NATIVE_HOST_STATE_DIR);
      fs.writeFileSync(
         getNativeHostSessionMetadataPath(metadata.port),
         JSON.stringify(metadata, null, 2),
         'utf8',
      );
   } catch {
      // Best effort only.
   }
}

export function deleteNativeHostSessionMetadata(port: number): void {
   try {
      fs.rmSync(getNativeHostSessionMetadataPath(port), { force: true });
   } catch {
      // Best effort only.
   }
}

/**
 * Read all persisted session metadata owned by this host installation.
 *
 * Keep-alive sessions outlive the native host process, so a later host can
 * adopt them and report the real port instead of spawning a second server.
 */
export function loadNativeHostSessions(ownerToken: string): NativeHostSessionMetadata[] {
   const sessions: NativeHostSessionMetadata[] = [];
   try {
      if (!fs.existsSync(NATIVE_HOST_STATE_DIR)) {
         return sessions;
      }

      const entries = fs.readdirSync(NATIVE_HOST_STATE_DIR, { withFileTypes: true });
      for (const entry of entries) {
         if (!entry.isFile() || !entry.name.startsWith('session-') || !entry.name.endsWith('.json')) {
            continue;
         }

         const filePath = path.join(NATIVE_HOST_STATE_DIR, entry.name);
         try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(raw) as NativeHostSessionMetadata;
            if (parsed?.ownerToken !== ownerToken) {
               continue;
            }
            if (Number.isInteger(parsed.port) && Number.isInteger(parsed.pid) && parsed.pid > 0) {
               sessions.push(parsed);
            }
         } catch {
            // ignore malformed file
         }
      }
   } catch {
      // Best effort only.
   }
   return sessions;
}

export function loadPersistedManagedPids(ownerToken: string): Set<number> {
   const pids = new Set<number>();
   for (const session of loadNativeHostSessions(ownerToken)) {
      pids.add(session.pid);
   }
   return pids;
}
