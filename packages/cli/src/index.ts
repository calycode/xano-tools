import { program } from './program';
import { startNativeHost } from './commands/opencode/implementation';
import { exitIfLegacyXanoInvocation } from './utils/legacy-command-guard';

// Check if we are being called as the Native Host
// This happens when the argument list includes 'opencode' and 'native-host'
// Bypassing Commander here ensures a cleaner stdout for the binary protocol
const args = process.argv;
exitIfLegacyXanoInvocation(args);

function isNativeHostLaunchArgs(extraArgs: string[]): boolean {
   if (extraArgs.length === 0) {
      return true;
   }

   if (extraArgs.length === 2 && extraArgs[0] === '--oc-version' && !!extraArgs[1]) {
      return true;
   }

   if (extraArgs.length === 1 && extraArgs[0].startsWith('--oc-version=')) {
      return true;
   }

   return false;
}

const chromeExtensionArg = args.find((arg) => arg.startsWith('chrome-extension://'));
const commandIndex = Math.max(args.lastIndexOf('opencode'), args.lastIndexOf('oc'));
const nativeHostExtraArgs =
   commandIndex >= 0 && args[commandIndex + 1] === 'native-host'
      ? args.slice(commandIndex + 2)
      : [];
const isDirectNativeHostInvocation =
   commandIndex >= 0 &&
   args[commandIndex + 1] === 'native-host' &&
   isNativeHostLaunchArgs(nativeHostExtraArgs);

if (chromeExtensionArg || isDirectNativeHostInvocation) {
   startNativeHost();
} else {
   program.parseAsync();
}
