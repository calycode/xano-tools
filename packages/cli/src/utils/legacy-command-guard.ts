import path from 'node:path';

const LEGACY_XANO_BINARY_NAMES = new Set(['xano', 'xano.cmd', 'xano.ps1', 'xano.exe']);

function isNativeHostInvocation(args: string[]): boolean {
   return args.includes('opencode') && args.includes('native-host');
}

function exitIfLegacyXanoInvocation(args: string[]) {
   if (isNativeHostInvocation(args)) {
      return;
   }

   const invokedBinary = path.basename(args[1] ?? '').toLowerCase();
   if (!LEGACY_XANO_BINARY_NAMES.has(invokedBinary)) {
      return;
   }

   console.error('The `xano` command has moved to Xano\'s official CLI.');
   console.error('Use `caly-xano` for CalyCode CLI commands.');
   console.error('Need the official `xano` command? Install Xano\'s official CLI.');
   process.exit(1);
}

export { exitIfLegacyXanoInvocation };
