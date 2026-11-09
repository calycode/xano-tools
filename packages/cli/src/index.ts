import { program } from './program';
import { startNativeHost } from './commands/opencode/native-host';
import { launchOpencodeServer } from './commands/opencode/distribution';
import { detectNativeHostLaunch } from './commands/opencode/native-host/launch-args';
import { exitIfLegacyXanoInvocation } from './utils/legacy-command-guard';
import { maybeRunTelemetrySink } from './telemetry';

// Check if we are being called as the Native Host
// This happens when the argument list includes 'opencode' and 'native-host'
// Bypassing Commander here ensures a cleaner stdout for the binary protocol
const args = process.argv;
exitIfLegacyXanoInvocation(args);

if (maybeRunTelemetrySink()) {
   // Detached telemetry sink: it flushes the batch and exits on its own.
} else if (detectNativeHostLaunch(args).isNativeHost) {
   startNativeHost({ launchServer: launchOpencodeServer });
} else {
   program.parseAsync();
}
