/**
 * Detection of native-host launches from a raw argv list.
 *
 * Browsers start the host with the extension origin as the only argument
 * (`chrome-extension://…`), while the wrapper and manual invocations use
 * `caly-xano opencode native-host [--oc-version <version>]`. Both bundled and
 * unbundled entry points must agree on this so the host bypasses Commander and
 * keeps stdout clean for the binary protocol.
 */

const NATIVE_HOST_COMMANDS = ['opencode', 'oc'];

export interface NativeHostLaunch {
   /** True when argv should be handled by the native host instead of Commander. */
   isNativeHost: boolean;
   /** Arguments following `native-host`, empty for unsupported shapes. */
   extraArgs: string[];
}

/**
 * Whether the arguments trailing `native-host` describe a supported launch.
 *
 * No extra args is the browser extension launch; `--oc-version <version>` and
 * `--oc-version=<version>` are the wrapper / manual launches.
 */
export function isNativeHostLaunchArgs(extraArgs: string[]): boolean {
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

/**
 * Decides whether `argv` is a native-host launch and returns its arguments.
 *
 * @param argv - Raw process arguments, including the executable at index 0.
 * @returns The launch decision plus any arguments passed after `native-host`.
 */
export function detectNativeHostLaunch(argv: string[]): NativeHostLaunch {
   const hasChromeExtensionOrigin = argv.some((arg) => arg.startsWith('chrome-extension://'));

   const commandIndex = Math.max(...NATIVE_HOST_COMMANDS.map((command) => argv.lastIndexOf(command)));
   const hasNativeHostCommand = commandIndex >= 0 && argv[commandIndex + 1] === 'native-host';
   const extraArgs = hasNativeHostCommand ? argv.slice(commandIndex + 2) : [];

   return {
      isNativeHost:
         hasChromeExtensionOrigin || (hasNativeHostCommand && isNativeHostLaunchArgs(extraArgs)),
      extraArgs,
   };
}
