import { startNativeHost } from './runtime';
import { setupNativeHostRegistration, showNativeHostStatus } from './setup';
import { getAllowedCorsOrigins } from './origins';

export { startNativeHost } from './runtime';
export {
   killProcessOnPort,
   isLikelyOpenCodeServerOnPort,
   validateNativeHostPort,
} from './runtime';
export type { NativeHostDependencies } from './runtime';
export { setupNativeHostRegistration, showNativeHostStatus } from './setup';
export { getAllowedCorsOrigins, filterAndValidateOrigins } from './origins';
export { encodeNativeMessage, sendMessage, NativeHostLogger } from './protocol';
export { resolveAllowedExtensionIds, resolveWriteAllBrowserManifests } from './discovery';
export type { ResolveExtensionIdsResult, ExtensionCandidateMatch } from './discovery';

/**
 * The native host module's interface: the binary protocol entry, install-time
 * registration, status, and the browser-extension origins the host allows.
 */
export const nativeHost = {
   start: startNativeHost,
   register: setupNativeHostRegistration,
   status: showNativeHostStatus,
   allowedOrigins: getAllowedCorsOrigins,
};
