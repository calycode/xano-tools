import { program } from './program';
import { startNativeHost } from './commands/opencode/implementation';
import { exitIfLegacyXanoInvocation } from './utils/legacy-command-guard';

// Check if we are being called as the Native Host
// This happens when the argument list includes 'opencode' and 'native-host'
// Bypassing Commander here ensures a cleaner stdout for the binary protocol
const args = process.argv;
exitIfLegacyXanoInvocation(args);

const commandIndex = Math.max(args.lastIndexOf('opencode'), args.lastIndexOf('oc'));
const isDirectNativeHostInvocation =
   commandIndex >= 0 &&
   args[commandIndex + 1] === 'native-host' &&
   commandIndex + 2 >= args.length;

if (isDirectNativeHostInvocation) {
   startNativeHost();
} else {
   program.parseAsync();
}
