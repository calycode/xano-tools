import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { getCalycodeOpencodeConfigDir, ensureDirectoryExists } from '../distribution';

export const NATIVE_HOST_STATE_DIR = path.join(getCalycodeOpencodeConfigDir(), 'native-host-state');
export const NATIVE_HOST_OWNER_TOKEN_PATH = path.join(NATIVE_HOST_STATE_DIR, 'owner-token.txt');

const PRIVATE_DIRECTORY_MODE = 0o700;
const PRIVATE_FILE_MODE = 0o600;

/** Apply a POSIX mode where the platform supports it. */
function restrictPermissions(targetPath: string, mode: number): void {
   try {
      fs.chmodSync(targetPath, mode);
   } catch {
      // Best effort only. Windows does not expose POSIX permission bits.
   }
}

/**
 * The state directory holds the owner token and server passwords, so keep it
 * private even when the parent config directory used a broader umask.
 */
function ensurePrivateNativeHostStateDirectory(): void {
   ensureDirectoryExists(path.dirname(NATIVE_HOST_STATE_DIR));
   ensureDirectoryExists(NATIVE_HOST_STATE_DIR);
   restrictPermissions(NATIVE_HOST_STATE_DIR, PRIVATE_DIRECTORY_MODE);
}

/** Write a state file with owner-only read/write permissions. */
function writePrivateFile(filePath: string, contents: string): void {
   fs.writeFileSync(filePath, contents, { encoding: 'utf8', mode: PRIVATE_FILE_MODE });
   restrictPermissions(filePath, PRIVATE_FILE_MODE);
}

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

/** Read the owner token without creating state, tightening existing file mode. */
export function getNativeHostOwnerToken(): string | null {
   try {
      if (!fs.existsSync(NATIVE_HOST_OWNER_TOKEN_PATH)) {
         return null;
      }

      const existing = fs.readFileSync(NATIVE_HOST_OWNER_TOKEN_PATH, 'utf8').trim();
      if (existing) {
         restrictPermissions(NATIVE_HOST_OWNER_TOKEN_PATH, PRIVATE_FILE_MODE);
      }
      return existing || null;
   } catch {
      return null;
   }
}

/** Read or create the token that scopes sessions to this installation. */
export function getOrCreateNativeHostOwnerToken(): string {
   const existing = getNativeHostOwnerToken();
   if (existing) {
      return existing;
   }

   ensurePrivateNativeHostStateDirectory();
   const token = randomUUID();
   writePrivateFile(NATIVE_HOST_OWNER_TOKEN_PATH, token);
   return token;
}

/** Path of the persisted metadata for one server port. */
export function getNativeHostSessionMetadataPath(port: number): string {
   return path.join(NATIVE_HOST_STATE_DIR, `session-${port}.json`);
}

/** Persist one session so a later host can adopt it. */
export function writeNativeHostSessionMetadata(metadata: NativeHostSessionMetadata): void {
   try {
      ensurePrivateNativeHostStateDirectory();
      writePrivateFile(
         getNativeHostSessionMetadataPath(metadata.port),
         JSON.stringify(metadata, null, 2),
      );
   } catch {
      // Best effort only.
   }
}

/** Remove persisted metadata for a stopped server port. */
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
            // Tighten permissions on files created by older CLI versions.
            restrictPermissions(filePath, PRIVATE_FILE_MODE);
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

/** PIDs of all persisted sessions owned by this installation. */
export function loadPersistedManagedPids(ownerToken: string): Set<number> {
   const pids = new Set<number>();
   for (const session of loadNativeHostSessions(ownerToken)) {
      pids.add(session.pid);
   }
   return pids;
}
