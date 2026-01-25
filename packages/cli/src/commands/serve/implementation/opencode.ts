import { log } from '@clack/prompts';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { HOST_APP_INFO } from '../../../utils/host-constants';

const OPENCODE_PKG = 'opencode-ai@latest';

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
            // We don't reject here because the child process already likely printed the error
            // and we want to exit with the same code.
            process.exit(code || 1);
         }
      });

      proc.on('error', (err) => {
         reject(new Error(`Failed to execute OpenCode CLI: ${err.message}`));
      });
   });
}

// --- Native Messaging Protocol Helpers ---

function sendMessage(message: any) {
   const buffer = Buffer.from(JSON.stringify(message));
   const header = Buffer.alloc(4);
   header.writeUInt32LE(buffer.length, 0);
   process.stdout.write(header);
   process.stdout.write(buffer);
}

async function startNativeHost() {
   // 1. Start the OpenCode server in the background
   const port = 4096;
   const serverUrl = `http://localhost:${port}`;

   // We spawn the server DETACHED so it keeps running even if the native host (this process) exits?
   // Actually, typically the extension keeps the native host alive as long as it wants.
   // But we want the SERVER to run.
   // Let's spawn it and keep track of it.

   // Check if already running? (Simple fetch check)
   try {
      await fetch(serverUrl);
      // It's running.
      sendMessage({ status: 'running', url: serverUrl, message: 'Server already active' });
   } catch (e) {
      // Not running, start it.
      // Note: In a real native binary, 'npx' might not be available if node isn't installed.
      // We're assuming for now we bundle 'node' or download the binary.
      // The plan mentions downloading/caching the OpenCode binary.
      // For this MVP step, we'll stick to 'npx' assuming the user environment or bundled environment.

      const proc = spawn('npx -y', [OPENCODE_PKG, 'serve', '--port', String(port)], {
         detached: true,
         stdio: 'ignore', // server output shouldn't interfere with native messaging stdout
         shell: true,
      });
      proc.unref(); // Let it run independently

      sendMessage({ status: 'starting', url: serverUrl, message: 'Server process spawned' });
   }

   // 2. Listen for messages from Chrome (stdin)
   // Chrome sends length-prefixed JSON.

   let inputBuffer = Buffer.alloc(0);
   let expectedLength: number | null = null;

   process.stdin.on('data', (chunk) => {
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
                  // Log error to a file if needed, can't print to stdout
               }
            } else {
               break; // Wait for more data
            }
         }
      }
   });
}

function handleMessage(msg: any) {
   // Handle incoming messages from the extension
   // For now, mostly just echo or status checks
   if (msg.type === 'ping') {
      sendMessage({ type: 'pong', timestamp: Date.now() });
   } else {
      sendMessage({ status: 'received', received: msg });
   }
}

async function serveOpencode({ port = 4096 }: { port?: number }) {
   return new Promise<void>((resolve, reject) => {
      log.info(`Starting OpenCode server on port ${port}...`);

      const proc = spawn('npx -y', [OPENCODE_PKG, 'serve', '--port', String(port)], {
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

async function setupOpencode({ extensionId }: { extensionId: string }) {
   const platform = os.platform();
   const homeDir = os.homedir();
   let manifestPath = '';

   // We need to point to the executable.
   // If we are running from source (dev), it's `node .../cli/dist/index.cjs opencode native-host`.
   // If bundled, it's `/path/to/calycode-exe opencode native-host`.
   // Chrome Native Hosts usually want a direct path to an executable or a bat/sh script.
   // They don't natively support arguments in the "path" field of the manifest (except on Linux sometimes, but it's flaky).
   // Best practice: Create a wrapper script (bat/sh) that calls our CLI with the `native-host` argument.

   // Wrapper script path
   const wrapperDir = path.join(homeDir, '.calycode', 'bin');
   if (!fs.existsSync(wrapperDir)) {
      fs.mkdirSync(wrapperDir, { recursive: true });
   }

   const isWin = platform === 'win32';
   const wrapperName = isWin ? 'calycode-host.bat' : 'calycode-host.sh';
   const wrapperPath = path.join(wrapperDir, wrapperName);
   const executablePath = process.execPath; // Path to node or the bundled binary

   // Determine how to call the CLI
   // If we are in pkg (bundled), process.execPath is the binary.
   // If we are in node, process.execPath is node, and we need the script path.
   const isPkg = (process as any).pkg !== undefined;

   let wrapperContent = '';
   if (isWin) {
      if (isPkg) {
         wrapperContent = `@echo off\n"${executablePath}" opencode native-host`;
      } else {
         // Development mode: node path + script path
         // process.argv[1] should be the path to index.cjs
         wrapperContent = `@echo off\n"${executablePath}" "${process.argv[1]}" opencode native-host`;
      }
   } else {
      if (isPkg) {
         wrapperContent = `#!/bin/sh\n"${executablePath}" opencode native-host`;
      } else {
         wrapperContent = `#!/bin/sh\n"${executablePath}" "${process.argv[1]}" opencode native-host`;
      }
   }

   fs.writeFileSync(wrapperPath, wrapperContent);
   if (!isWin) {
      fs.chmodSync(wrapperPath, '755');
   }

   let manifestContent: any = {
      name: HOST_APP_INFO.reverseAppId,
      description: HOST_APP_INFO.description,
      path: wrapperPath,
      type: 'stdio',
      allowed_origins: [`chrome-extension://${extensionId}/`],
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
      log.warn(
         'On Windows, you must also create a registry key pointing to this manifest file. Automatic registry modification is not yet implemented.',
      );
      log.info(
         `Registry Key: HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_APP_INFO.reverseAppId}`,
      );
      log.info(`Value (Default): ${manifestPath}`);
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
   log.success(`Wrapper script created at: ${wrapperPath}`);

   log.info('Ready! The native host is configured.');
}

export { serveOpencode, setupOpencode, startNativeHost, proxyOpencode };
