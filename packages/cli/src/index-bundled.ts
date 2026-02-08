import { spawnSync } from 'node:child_process';
import { isSea } from 'node:sea';
import { program } from './program';
import { setupOpencode, startNativeHost } from './commands/opencode/implementation';
import { HOST_APP_INFO } from './utils/host-constants';

/**
 * Escape a string for safe use in PowerShell.
 * Handles single quotes and prevents expression evaluation.
 * @param str - String to escape
 * @returns Escaped string safe for PowerShell
 */
function escapePowerShell(str: string): string {
   // Replace single quotes with two single quotes (PowerShell escape)
   // Also escape $ to prevent variable interpolation, and backticks
   return str.replace(/'/g, "''").replace(/`/g, '``').replace(/\$/g, '`$');
}

/**
 * Escape a string for safe use in AppleScript.
 * @param str - String to escape
 * @returns Escaped string safe for AppleScript
 */
function escapeAppleScript(str: string): string {
   // Escape backslashes first, then double quotes
   return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// This entry point is specific for the bundled binary to handle "double-click" behavior.
// If run with no arguments (double click), it triggers the init flow.
// If run with arguments (CLI usage), it passes through to the standard program.

(async () => {
   const isBundled = isSea();
   const args = process.argv;

   // Check if we are being called as the Native Host
   // This handles both direct chrome-extension:// invocations (Linux/Mac)
   // and manual "opencode native-host" invocations (Windows wrapper)
   const chromeExtensionArg = args.find((arg) => arg.startsWith('chrome-extension://'));
   const isNativeHostCommand = args.includes('opencode') && args.includes('native-host');

   if (chromeExtensionArg || isNativeHostCommand) {
      // We are running as a Native Host
      // BYPASS Commander entirely to prevent stdout pollution
      startNativeHost();
      return;
   }

   if (isBundled) {
      // In SEA (Single Executable Application), process.argv[0] is the executable.
      // Sometimes, depending on how it's invoked (especially on Windows or via shells),
      // process.argv[1] might redundantly be the executable path or "undefined" might appear.
      
      // We start by taking everything after the executable (index 0).
      const userArgs = args.slice(1);
      
      // If the first "user" arg is actually the executable path again, ignore it.
      if (userArgs.length > 0 && (userArgs[0] === process.execPath || userArgs[0] === process.argv[0])) {
         userArgs.shift();
      }

      // Now check if we have any real user arguments left.
      if (userArgs.length === 0) {
         // No arguments -> Installer Mode (Double Click)
         await runSetup();
      } else {
         // Arguments present -> CLI Mode
         // Commander with { from: 'user' } expects args to be the flags/commands directly.
         await program.parseAsync(userArgs, { from: 'user' });
      }
   } else {
      // Standard Node.js execution (dev mode, or 'node index.js')
      await program.parseAsync();
   }
})();

async function runSetup() {
   console.log('@calycode Native Host Installer');
   console.log('------------------------------');
   console.log(`Setting up native host for ${HOST_APP_INFO.allowedExtensionIds.length} extension(s)...`);
   console.log(`Executable: ${process.argv[0]}`);

   try {
      await setupOpencode();
      console.log('\nSetup complete! You can close this window.');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      try {
         showSuccessDialog();
      } catch (e) {
         console.error('Failed to show success dialog:', e);
      }
      
      keepOpen();
   } catch (err) {
      console.error('Setup failed:', err);
      keepOpen();
   }
}

function showSuccessDialog() {
   const message =
      '@calycode Native Host Installer\n\nSetup complete successfully!\n\nYou can now use it in your terminal.\n\nClick OK to exit.';

   if (process.platform === 'win32') {
      // Use robust PowerShell escaping to prevent injection
      const psCommand = `
         Add-Type -AssemblyName System.Windows.Forms;
         [System.Windows.Forms.MessageBox]::Show('${escapePowerShell(message)}', '@calycode Installer', 'OK', 'Information')
      `;
      spawnSync('powershell.exe', ['-NoProfile', '-Command', psCommand]);
   } else if (process.platform === 'darwin') {
      // Use robust AppleScript escaping to prevent injection
      spawnSync('osascript', [
         '-e',
         `tell app "System Events" to display dialog "${escapeAppleScript(message)}" with title "@calycode Installer" buttons {"OK"} default button "OK"`,
      ]);
   } else {
      const zenity = spawnSync('zenity', [
         '--info',
         '--text=' + message,
         '--title=@calycode Installer',
      ]);
      if (zenity.status !== 0) {
         spawnSync('xmessage', ['-center', message]);
      }
   }
}

function keepOpen() {
   console.log('\nPress any key to exit...');
   if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
   }
   process.stdin.resume();
   process.stdin.on('data', () => {
      process.exit(0);
   });
   setInterval(() => {}, 100000);
}
