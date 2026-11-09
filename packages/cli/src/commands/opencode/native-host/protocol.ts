import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const MAX_NATIVE_MESSAGE_SIZE = 1 * 1024 * 1024;

/**
 * Frame a message for the Chrome native messaging protocol: a 4-byte
 * little-endian length prefix followed by the JSON payload.
 */
export function encodeNativeMessage(message: unknown): Buffer {
   const payload = Buffer.from(JSON.stringify(message));
   const header = Buffer.alloc(4);
   header.writeUInt32LE(payload.length, 0);
   return Buffer.concat([header, payload]);
}

let stdoutClosed = false;

process.stdout.on('error', (error: NodeJS.ErrnoException) => {
   // Chrome closes the native messaging pipe after a one-shot
   // `sendNativeMessage` reply. Later status writes must not crash the host,
   // especially when a keep-alive server is still starting.
   if (error.code === 'EPIPE' || error.code === 'ERR_STREAM_DESTROYED') {
      stdoutClosed = true;
      return;
   }

   throw error;
});

export function sendMessage(message: unknown) {
   if (stdoutClosed) {
      return;
   }

   try {
      process.stdout.write(encodeNativeMessage(message));
   } catch {
      stdoutClosed = true;
   }
}

/**
 * Native-host logging is on by default only for source checkouts. Npm-installed
 * and packaged builds stay quiet unless explicitly enabled. An explicit `0`
 * disables it in every mode.
 */
export function isNativeHostDebugEnabled(
   envValue: string | undefined = process.env.CALY_OC_NATIVE_HOST_DEBUG,
   execPath: string = process.execPath,
   entryPath: string | undefined = process.argv[1],
): boolean {
   const value = envValue?.trim();
   if (value === '1') {
      return true;
   }
   if (value === '0') {
      return false;
   }

   const executable = execPath.toLowerCase();
   if (executable.endsWith('caly.exe') || executable.endsWith('caly')) {
      return false;
   }

   // `node dist/index.cjs` from a source checkout is a dev run. The same entry
   // point under node_modules is an npm install and should not log by default.
   const entry = (entryPath ?? '').replace(/\\/g, '/').toLowerCase();
   if (!entry || entry.includes('/node_modules/')) {
      return false;
   }

   return true;
}

// Simple file-based logger for debugging Native Host without polluting stdout
export class NativeHostLogger {
   private logPath: string;
   private logDir: string;
   private initialized: boolean = false;
   private enabled: boolean;

   constructor() {
      this.enabled = isNativeHostDebugEnabled();
      const homeDir = os.homedir();
      this.logDir = path.join(homeDir, '.calycode', 'logs');
      this.logPath = path.join(this.logDir, 'native-host.log');
      if (this.enabled) {
         this.ensureLogDir();
      }
   }

   private ensureLogDir() {
      if (this.initialized) return;
      try {
         if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
         }
         this.initialized = true;
         this.log('Logger initialized', { logPath: this.logPath, pid: process.pid });
      } catch (e) {
         console.error(`[NativeHostLogger] Failed to create log directory ${this.logDir}: ${e}`);
         try {
            this.logDir = os.tmpdir();
            this.logPath = path.join(this.logDir, 'calycode-native-host.log');
            this.initialized = true;
            console.error(`[NativeHostLogger] Using fallback log path: ${this.logPath}`);
         } catch (e2) {
            console.error(`[NativeHostLogger] Fallback also failed: ${e2}`);
         }
      }
   }

   log(msg: string, data?: any) {
      if (!this.enabled) return;
      try {
         const timestamp = new Date().toISOString();
         let content = `[${timestamp}] ${msg}`;
         if (data) {
            content += `\nData: ${JSON.stringify(data, null, 2)}`;
         }
         content += '\n';
         fs.appendFileSync(this.logPath, content);
      } catch (e) {
         console.error(`[NativeHostLogger] Log failed: ${msg}`);
      }
   }

   error(msg: string, err?: any) {
      if (!this.enabled) return;
      try {
         const timestamp = new Date().toISOString();
         let content = `[${timestamp}] ERROR: ${msg}`;
         if (err) {
            content += `\nError: ${err instanceof Error ? err.stack : JSON.stringify(err)}`;
         }
         content += '\n';
         fs.appendFileSync(this.logPath, content);
      } catch (e) {
         console.error(`[NativeHostLogger] Error log failed: ${msg} - ${err}`);
      }
   }

   getLogPath(): string {
      return this.logPath;
   }
}
