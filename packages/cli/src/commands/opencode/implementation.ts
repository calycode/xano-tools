import { font } from '../../utils/methods/font';
import { log } from '@clack/prompts';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { isSea } from 'node:sea';
import { HOST_APP_INFO } from '../../utils/host-constants';

const OPENCODE_PKG = 'opencode-ai@latest';

// Build CORS origins from allowed extension IDs
const ALLOWED_CORS_ORIGINS = [
   'https://app.xano.com',
   'https://services.calycode.com',
   // Add all extension origins for CORS
   ...HOST_APP_INFO.allowedExtensionIds.map((id) => `chrome-extension://${id}`),
];

function getCorsArgs(extraOrigins: string[] = []) {
   const origins = new Set([...ALLOWED_CORS_ORIGINS, ...extraOrigins]);
   return Array.from(origins).flatMap((origin) => ['--cors', origin]);
}

/**
 * Proxy command to the underlying OpenCode AI CLI.
 * This allows exposing the full capability of the OpenCode agent.
 */
async function proxyOpencode(args: string[]) {
   log.info('🤖 Powered by OpenCode - The open source AI coding agent (https://opencode.ai)');
   log.message('Passing command to opencode-ai...');

   return new Promise<void>((resolve, reject) => {
      // Use 'npx' to execute the opencode-ai CLI with the provided arguments
      const proc = spawn('npx -y', [OPENCODE_PKG, ...args], {
         stdio: 'inherit',
         shell: true,
      });

      proc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            process.exit(code || 1);
         }
      });

      proc.on('error', (err) => {
         reject(new Error(`Failed to execute OpenCode CLI: ${err.message}`));
      });
   });
}

// --- Native Messaging Protocol Helpers ---

function displayNativeHostBanner(logPath?: string) {
   // We use console.error so we don't interfere with stdout (which is used for Native Messaging)
   console.error(
      font.color.cyan(`
+==================================================================================================+
|                                                                                                  |
|    ██████╗ █████╗ ██╗  ██╗   ██╗    ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗      ██████╗██╗     ██╗   |
|   ██╔════╝██╔══██╗██║  ╚██╗ ██╔╝    ╚██╗██╔╝██╔══██╗████╗  ██║██╔═══██╗    ██╔════╝██║     ██║   |
|   ██║     ███████║██║   ╚████╔╝█████╗╚███╔╝ ███████║██╔██╗ ██║██║   ██║    ██║     ██║     ██║   |
|   ██║     ██╔══██║██║    ╚██╔╝ ╚════╝██╔██╗ ██╔══██║██║╚██╗██║██║   ██║    ██║     ██║     ██║   |
|   ╚██████╗██║  ██║███████╗██║       ██╔╝ ██╗██║  ██║██║ ╚████║╚██████╔╝    ╚██████╗███████╗██║   |
|    ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝       ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝      ╚═════╝╚══════╝╚═╝   |
|                                                                                                  |
+==================================================================================================+
`),
   );

   console.error('\n' + font.combo.boldGreen('  Native Host Active'));
   console.error(font.color.gray('  You can keep this window minimized, but do not close it.'));
   console.error(
      font.color.gray('  This process enables the CalyCode extension to communicate with your system.'),
   );

   if (logPath) {
      console.error('\n' + font.combo.boldCyan('  Logs:'));
      console.error('  - Log file: ' + font.color.white(logPath));
   }

   console.error('\n' + font.combo.boldCyan('  Useful Links:'));
   console.error('  - Documentation: ' + font.color.white('https://calycode.com/docs'));
   console.error('  - Extension:     ' + font.color.white('https://calycode.com/extension'));
   console.error('  - OpenCode:      ' + font.color.white('https://opencode.ai'));
   console.error('\n');
}

function sendMessage(message: any) {
   const buffer = Buffer.from(JSON.stringify(message));
   const header = Buffer.alloc(4);
   header.writeUInt32LE(buffer.length, 0);
   process.stdout.write(header);
   process.stdout.write(buffer);
}

// Simple file-based logger for debugging Native Host without polluting stdout
class NativeHostLogger {
   private logPath: string;
   private logDir: string;
   private initialized: boolean = false;

   constructor() {
      const homeDir = os.homedir();
      this.logDir = path.join(homeDir, '.calycode', 'logs');
      this.logPath = path.join(this.logDir, 'native-host.log');
      this.ensureLogDir();
   }

   private ensureLogDir() {
      if (this.initialized) return;
      try {
         if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
         }
         this.initialized = true;
         // Write initial log to verify logging works
         this.log('Logger initialized', { logPath: this.logPath, pid: process.pid });
      } catch (e) {
         // If we can't create the log dir, try to log to stderr as a fallback
         console.error(`[NativeHostLogger] Failed to create log directory ${this.logDir}: ${e}`);
         // Try the temp directory as fallback
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
      try {
         const timestamp = new Date().toISOString();
         let content = `[${timestamp}] ${msg}`;
         if (data) {
            content += `\nData: ${JSON.stringify(data, null, 2)}`;
         }
         content += '\n';
         fs.appendFileSync(this.logPath, content);
      } catch (e) {
         // If logging fails, output to stderr as last resort
         console.error(`[NativeHostLogger] Log failed: ${msg}`);
      }
   }

   error(msg: string, err?: any) {
      try {
         const timestamp = new Date().toISOString();
         let content = `[${timestamp}] ERROR: ${msg}`;
         if (err) {
            content += `\nError: ${err instanceof Error ? err.stack : JSON.stringify(err)}`;
         }
         content += '\n';
         fs.appendFileSync(this.logPath, content);
      } catch (e) {
         // If logging fails, output to stderr as last resort
         console.error(`[NativeHostLogger] Error log failed: ${msg} - ${err}`);
      }
   }

   getLogPath(): string {
      return this.logPath;
   }
}

async function startNativeHost() {
   const logger = new NativeHostLogger();
   logger.log('Native host process started.');
   logger.log('Process info', {
      pid: process.pid,
      ppid: process.ppid,
      argv: process.argv,
      execPath: process.execPath,
      cwd: process.cwd(),
      platform: process.platform,
   });

   displayNativeHostBanner(logger.getLogPath());

   let serverProc: ReturnType<typeof spawn> | null = null;

   // Wait for server to be ready by polling the URL
   const waitForServerReady = async (
      url: string,
      maxAttempts: number = 30,
      intervalMs: number = 500,
   ): Promise<boolean> => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
         try {
            const response = await fetch(url);
            if (response.ok || response.status === 404) {
               // Server is responding (404 is fine, means server is up but endpoint not found)
               logger.log(`Server ready after ${attempt} attempts`);
               return true;
            }
         } catch (e) {
            // Server not ready yet
         }
         await new Promise((resolve) => setTimeout(resolve, intervalMs));
      }
      logger.log(`Server not ready after ${maxAttempts} attempts`);
      return false;
   };

   const startServer = async (port: number = 4096, extraOrigins: string[] = []) => {
      const serverUrl = `http://localhost:${port}`;
      logger.log(`Attempting to start server on port ${port}`, { extraOrigins });

      // If already running, kill it? For now, let's assume single instance or fail if port busy
      if (serverProc) {
         logger.log('Killing existing server process...');
         serverProc.kill();
         serverProc = null;
         // Give it a moment to release the port
         await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Check if already running via fetch
      try {
         await fetch(serverUrl);
         logger.log('Server already active on url', { serverUrl });
         sendMessage({ status: 'running', url: serverUrl, message: 'Server already active' });
         return;
      } catch (e) {
         // Not running, proceed
      }

      try {
         const args = [OPENCODE_PKG, 'serve', '--port', String(port), ...getCorsArgs(extraOrigins)];
         logger.log(`Spawning npx -y ${args.join(' ')}`);

         serverProc = spawn('npx -y', args, {
            stdio: 'ignore', // Must ignore stdio to prevent polluting stdout
            shell: true,
         });

         serverProc.on('error', (err) => {
            logger.error('Failed to spawn server process', err);
            sendMessage({ status: 'error', message: `Failed to spawn server: ${err.message}` });
         });

         serverProc.on('exit', (code) => {
            logger.log(`Server process exited with code ${code}`);
            sendMessage({ status: 'stopped', code });
            serverProc = null;
         });

         logger.log('Server process spawned, waiting for ready...');
         sendMessage({ status: 'starting', url: serverUrl, message: 'Server process spawned, waiting for ready...' });

         // Wait for server to actually be ready
         const isReady = await waitForServerReady(serverUrl);
         if (isReady) {
            logger.log('Server is now running and ready');
            sendMessage({ status: 'running', url: serverUrl, message: 'Server is ready' });
         } else {
            logger.error('Server failed to become ready in time');
            sendMessage({
               status: 'error',
               url: serverUrl,
               message: 'Server spawned but failed to become ready in time',
            });
         }
      } catch (err) {
         logger.error('Unexpected error starting server', err);
         sendMessage({ status: 'error', message: 'Unexpected error starting server' });
      }
   };

   const handleMessage = (msg: any) => {
      logger.log('Received message', msg);

      try {
         if (msg.type === 'ping') {
            sendMessage({ type: 'pong', timestamp: Date.now() });
         } else if (msg.type === 'start') {
            const port = msg.port ? parseInt(msg.port, 10) : 4096;
            const origins = Array.isArray(msg.origins) ? msg.origins : [];
            startServer(port, origins);
         } else if (msg.type === 'stop') {
            if (serverProc) {
               serverProc.kill();
               serverProc = null;
               sendMessage({ status: 'stopped', message: 'Server stopped by request' });
            }
         } else {
            sendMessage({ status: 'received', received: msg });
         }
      } catch (err) {
         logger.error('Error handling message', err);
         sendMessage({ status: 'error', message: 'Internal error processing message' });
      }
   };

   // Cleanup function to kill server and exit cleanly
   const cleanup = (reason: string) => {
      logger.log(`Cleanup triggered: ${reason}`);
      if (serverProc) {
         logger.log('Killing server process during cleanup');
         serverProc.kill();
         serverProc = null;
      }
      process.exit(0);
   };

   // 2. Listen for messages from Chrome (stdin)
   // Chrome sends length-prefixed JSON.
   // CRITICAL: On Windows, stdin must be in raw binary mode for Native Messaging
   
   // Ensure stdin is in flowing mode and properly configured
   if (process.stdin.isTTY) {
      logger.log('Warning: stdin is a TTY, Native Messaging may not work correctly');
   }
   
   // Resume stdin in case it's paused (Node.js default behavior)
   process.stdin.resume();
   
   // Log stdin state for debugging
   logger.log('stdin configured', { 
      readable: process.stdin.readable,
      isTTY: process.stdin.isTTY,
   });

   let inputBuffer = Buffer.alloc(0);
   let expectedLength: number | null = null;

   process.stdin.on('data', (chunk) => {
      logger.log('Received data chunk', { length: chunk.length });
      inputBuffer = Buffer.concat([inputBuffer, chunk]);

      while (true) {
         if (expectedLength === null) {
            if (inputBuffer.length >= 4) {
               expectedLength = inputBuffer.readUInt32LE(0);
               inputBuffer = inputBuffer.subarray(4);
            } else {
               break; // Wait for more data
            }
         }

         if (expectedLength !== null) {
            if (inputBuffer.length >= expectedLength) {
               const messageData = inputBuffer.subarray(0, expectedLength);
               inputBuffer = inputBuffer.subarray(expectedLength);
               expectedLength = null;

               try {
                  const msg = JSON.parse(messageData.toString());
                  handleMessage(msg);
               } catch (err) {
                  logger.error('Failed to parse JSON message', err);
               }
            } else {
               break; // Wait for more data
            }
         }
      }
   });

   // Handle stdin close - Chrome extension disconnected
   // This is CRITICAL to prevent ghost server processes
   process.stdin.on('end', () => {
      logger.log('stdin end event received', { 
         receivedAnyData: inputBuffer.length > 0 || expectedLength !== null,
         bufferLength: inputBuffer.length,
      });
      // Small delay to allow any pending data to be processed
      setTimeout(() => {
         cleanup('stdin end (extension disconnected)');
      }, 100);
   });

   process.stdin.on('close', () => {
      logger.log('stdin close event received');
   });

   process.stdin.on('error', (err) => {
      logger.error('stdin error', err);
      cleanup('stdin error');
   });

   // Handle process signals
   process.on('SIGINT', () => {
      cleanup('SIGINT received');
   });

   process.on('SIGTERM', () => {
      cleanup('SIGTERM received');
   });

   // Handle uncaught exceptions to ensure cleanup
   process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', err);
      cleanup('uncaughtException');
   });
}

async function serveOpencode({ port = 4096, detach = false }: { port?: number; detach?: boolean }) {
   if (detach) {
      log.info(`Starting OpenCode server on port ${port} in background...`);
      const proc = spawn(
         'npx -y',
         [OPENCODE_PKG, 'serve', '--port', String(port), ...getCorsArgs()],
         {
            detached: true,
            stdio: 'ignore',
            shell: true,
         },
      );
      proc.unref();
      log.success('OpenCode server started in background.');
      return;
   }

   return new Promise<void>((resolve, reject) => {
      log.info(`Starting OpenCode server on port ${port}...`);

      const proc = spawn('npx -y', [OPENCODE_PKG, 'serve', '--port', String(port), ...getCorsArgs()], {
         stdio: 'inherit',
         shell: true,
      });

      proc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            reject(new Error(`OpenCode server exited with code ${code}`));
         }
      });

      proc.on('error', (err) => {
         reject(new Error(`Failed to start OpenCode server: ${err.message}`));
      });
   });
}

async function setupOpencode({ extensionIds }: { extensionIds?: string[] } = {}) {
   const platform = os.platform();
   const homeDir = os.homedir();
   let manifestPath = '';

   // Use provided extension IDs or fall back to the ones in HOST_APP_INFO
   const allowedExtensionIds = extensionIds?.length
      ? extensionIds
      : HOST_APP_INFO.allowedExtensionIds;

   log.info(`Setting up native host for ${allowedExtensionIds.length} extension(s)...`);

   // We need to point to the executable.
   // If we are running from source (dev), it's `node .../cli/dist/index.cjs opencode native-host`.
   // If bundled, it's `/path/to/calycode-exe opencode native-host`.
   // Chrome Native Hosts usually want a direct path to an executable or a bat/sh script.
   // They don't natively support arguments in the "path" field of the manifest (except on Linux sometimes, but it's flaky).
   // Best practice: Create a wrapper script (bat/sh) that calls our CLI with the `native-host` argument.

   const isWin = platform === 'win32';
   const executablePath = process.execPath; // Path to node or the bundled binary

   // Determine how to call the CLI
   // If we are in pkg (bundled), process.execPath is the binary.
   // If we are in node, process.execPath is node, and we need the script path.
   const isBundled = isSea();

   let manifestExePath: string;
   
   if (isWin) {
      if (isBundled) {
         // For bundled binary on Windows, point manifest directly to the .exe
         // Chrome Native Messaging works best with direct .exe paths that don't need wrappers
         manifestExePath = executablePath;
         
         log.info(`Using bundled executable directly: ${manifestExePath}`);
      } else {
         // Development mode on Windows:
         // Batch files have known issues with binary stdin/stdout for Native Messaging.
         // 
         // The recommended solution for Windows is to use a VBScript (.vbs) or 
         // Windows Script Host (.wsf) wrapper that properly handles stdin/stdout.
         // However, these also have limitations with binary data.
         //
         // The most reliable approach is to use a small compiled launcher or
         // directly reference node.exe with the script in a way Chrome accepts.
         //
         // For development, we'll try a batch file with minimal commands.
         // If this doesn't work, users can run `xano opencode native-host` directly
         // from a terminal for testing, or build the bundled exe.
         
         const wrapperDir = path.join(homeDir, '.calycode', 'bin');
         if (!fs.existsSync(wrapperDir)) {
            fs.mkdirSync(wrapperDir, { recursive: true });
         }
         
         const scriptPath = process.argv[1];
         
         // Try approach 1: Direct batch file (minimal, single-line execution)
         const wrapperPath = path.join(wrapperDir, 'calycode-host.bat');
         // Use the @ prefix to suppress echo, and quote all paths
         // The %* passes any additional arguments
         const wrapperContent = `@"${executablePath}" "${scriptPath}" opencode native-host %*\r\n`;
         fs.writeFileSync(wrapperPath, wrapperContent);
         
         // Also create a fallback JSON launcher config that could be used
         // by a future compiled launcher
         const launcherConfig = {
            node: executablePath,
            script: scriptPath,
            args: ['opencode', 'native-host'],
         };
         const launcherConfigPath = path.join(wrapperDir, 'launcher-config.json');
         fs.writeFileSync(launcherConfigPath, JSON.stringify(launcherConfig, null, 2));
         
         manifestExePath = wrapperPath;
         
         log.info(`Created wrapper script: ${wrapperPath}`);
         log.info(`Node path: ${executablePath}`);
         log.info(`Script path: ${scriptPath}`);
         log.info(`Wrapper content: ${wrapperContent.trim()}`);
         log.warn('Note: Development mode on Windows uses a batch file wrapper.');
         log.warn('If Native Messaging fails, try building the bundled exe instead.');
      }
   } else {
      // Unix-like systems - shell scripts work fine
      const wrapperDir = path.join(homeDir, '.calycode', 'bin');
      if (!fs.existsSync(wrapperDir)) {
         fs.mkdirSync(wrapperDir, { recursive: true });
      }
      
      const wrapperPath = path.join(wrapperDir, 'calycode-host.sh');
      let wrapperContent: string;
      
      if (isBundled) {
         wrapperContent = `#!/bin/sh\nexec "${executablePath}" opencode native-host\n`;
      } else {
         wrapperContent = `#!/bin/sh\nexec "${executablePath}" "${process.argv[1]}" opencode native-host\n`;
      }
      
      fs.writeFileSync(wrapperPath, wrapperContent);
      fs.chmodSync(wrapperPath, '755');
      manifestExePath = wrapperPath;
   }

   let manifestContent: any = {
      name: HOST_APP_INFO.reverseAppId,
      description: HOST_APP_INFO.description,
      path: manifestExePath,
      type: 'stdio',
      // Allow all configured extension IDs
      allowed_origins: allowedExtensionIds.map((id) => `chrome-extension://${id}/`),
   };

   // Adjust manifest path based on OS
   if (platform === 'darwin') {
      manifestPath = path.join(
         homeDir,
         `Library/Application Support/Google/Chrome/NativeMessagingHosts/${HOST_APP_INFO.reverseAppId}.json`,
      );
   } else if (platform === 'linux') {
      manifestPath = path.join(
         homeDir,
         `.config/google-chrome/NativeMessagingHosts/${HOST_APP_INFO.reverseAppId}.json`,
      );
   } else if (platform === 'win32') {
      // Windows requires registry key
      manifestPath = path.join(homeDir, '.calycode', `${HOST_APP_INFO.reverseAppId}.json`);

      try {
         // Use full HKEY_CURRENT_USER instead of HKCU for clarity/safety
         const regKey = `HKEY_CURRENT_USER\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_APP_INFO.reverseAppId}`;
         // Use reg.exe to add the key.
         // /ve adds the default value. /t REG_SZ specifies type. /d specifies data. /f forces overwrite.
         const regArgs = ['add', regKey, '/ve', '/t', 'REG_SZ', '/d', manifestPath, '/f'];

         log.info(`Executing registry command: reg ${regArgs.join(' ')}`);

         await new Promise<void>((resolve, reject) => {
            const proc = spawn('reg', regArgs, { stdio: 'ignore' });

            proc.on('close', (code) => {
               if (code === 0) {
                  log.success(`Registry key added: ${regKey}`);

                  // Verify it immediately
                  try {
                     const verifyArgs = ['query', regKey, '/ve'];
                     const verifyProc = spawn('reg', verifyArgs, { stdio: 'pipe' });
                     verifyProc.stdout.on('data', (d) =>
                        log.info(`Registry Verification: ${d.toString().trim()}`),
                     );
                  } catch (e) {
                     /* ignore verify error */
                  }
                  resolve();
               } else {
                  log.error(`Failed to add registry key. Exit code: ${code}`);
                  log.warn('You may need to add it manually:');
                  log.info(`Key: ${regKey}`);
                  log.info(`Value: ${manifestPath}`);
                  reject(new Error(`Failed to add registry key. Exit code: ${code}`));
               }
            });

            proc.on('error', (err) => {
               log.error(`Failed to spawn registry command: ${err.message}`);
               reject(new Error(`Failed to spawn registry command: ${err.message}`));
            });
         });
      } catch (error: any) {
         log.error(`Error adding registry key: ${error.message}`);
      }
   } else {
      throw new Error(`Unsupported platform: ${platform}`);
   }

   // Ensure directory exists
   const manifestDir = path.dirname(manifestPath);
   if (!fs.existsSync(manifestDir)) {
      fs.mkdirSync(manifestDir, { recursive: true });
   }

   // Write manifest
   fs.writeFileSync(manifestPath, JSON.stringify(manifestContent, null, 2));
   log.success(`Native messaging host manifest created at: ${manifestPath}`);
   log.success(`Executable path in manifest: ${manifestExePath}`);

   log.info('Ready! The native host is configured.');
}

export { serveOpencode, setupOpencode, startNativeHost, proxyOpencode };
