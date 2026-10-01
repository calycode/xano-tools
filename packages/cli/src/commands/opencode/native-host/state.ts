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
}

export function getOrCreateNativeHostOwnerToken(): string {
   ensureDirectoryExists(NATIVE_HOST_STATE_DIR);
   try {
      if (fs.existsSync(NATIVE_HOST_OWNER_TOKEN_PATH)) {
         const existing = fs.readFileSync(NATIVE_HOST_OWNER_TOKEN_PATH, 'utf8').trim();
         if (existing) {
            return existing;
         }
      }
   } catch {
      // fall through and recreate
   }

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

export function loadPersistedManagedPids(ownerToken: string): Set<number> {
   const pids = new Set<number>();
   try {
      if (!fs.existsSync(NATIVE_HOST_STATE_DIR)) {
         return pids;
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
            if (Number.isInteger(parsed.pid) && parsed.pid > 0) {
               pids.add(parsed.pid);
            }
         } catch {
            // ignore malformed file
         }
      }
   } catch {
      // Best effort only.
   }
   return pids;
}
