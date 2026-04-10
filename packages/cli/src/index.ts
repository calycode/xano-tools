import { program } from './program';
import { startNativeHost } from './commands/opencode/implementation';
import { exitIfLegacyXanoInvocation } from './utils/legacy-command-guard';

// Check if we are being called as the Native Host
// This happens when the argument list includes 'opencode' and 'native-host'
// Bypassing Commander here ensures a cleaner stdout for the binary protocol
const args = process.argv;
exitIfLegacyXanoInvocation(args);
if (args.includes('opencode') && args.includes('native-host')) {
   startNativeHost();
} else {
   program.parseAsync();
}
