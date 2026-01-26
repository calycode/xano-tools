import { spawnSync } from 'node:child_process';
import { isSea } from 'node:sea';
import { program } from './program';
import { setupOpencode } from './commands/opencode/implementation';
import { HOST_APP_INFO } from './utils/host-constants';

// This entry point is specific for the bundled binary to handle "double-click" behavior.
// If run with no arguments (double click), it triggers the init flow.
// If run with arguments (CLI usage), it passes through to the standard program.

// Check if running as a pkg binary and with no extra arguments
const isBundled = isSea();
// If double clicked, usually argv has length 1 or 2 depending on platform/execution
// We'll assume if there are no 'user' arguments (commands), we run setup.
// Standard CLI: node script <command>
// Pkg: binary <command>
// So if argv.length <= 2, it's likely just the binary running.
if (isBundled && process.argv.length === 1) {
   console.log('@calycode Native Host Installer');
   console.log('------------------------------');
   console.log('Running setup...');

   // We need to run setup
   setupOpencode({
      extensionId: HOST_APP_INFO.extensionId,
   })
      .then(() => {
         console.log('\nSetup complete! You can close this window.');
         showSuccessDialog();
      })
      .catch((err) => {
         console.error('Setup failed:', err);
         keepOpen();
      });
} else {
   // Arguments provided or not running in pkg, run as normal CLI
   program.parseAsync();
}

function showSuccessDialog() {
   const message =
      '@calycode Native Host Installer\n\nSetup complete successfully!\n\nYou can now use it in your terminal.\n\nClick OK to exit.';

   if (process.platform === 'win32') {
      // Windows: PowerShell MessageBox (requires no extra assemblies)
      spawnSync('powershell.exe', [
         '-NoProfile',
         '-Command',
         `[System.Windows.MessageBox]::Show('${message.replace(/'/g, "''")}', '@calycode Installer', 'OK', 'Information')`,
      ]);
   } else if (process.platform === 'darwin') {
      // macOS: AppleScript dialog
      spawnSync('osascript', [
         '-e',
         `tell app "System Events" to display dialog "${message.replace(/"/g, '\\"')}" with title "@calycode Installer" buttons {"OK"} default button "OK"`,
      ]);
   } else {
      // Linux: Use zenity (common on most distros) or fallback to xmessage
      const zenity = spawnSync('zenity', [
         '--info',
         '--text=' + message,
         '--title=@calycode Installer',
      ]);
      if (zenity.status !== 0) {
         // Fallback if zenity missing
         spawnSync('xmessage', ['-center', message]);
      }
   }
}

function keepOpen() {
   process.stdin.resume();
   process.stdin.on('data', () => {
      // Optional: Exit on key press if desired, or just stay open
      // process.exit(0);
   });
}
