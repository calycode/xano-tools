import { startNativeHost } from './runtime';
import { setupNativeHostRegistration, showNativeHostStatus } from './setup';
import { getAllowedCorsOrigins } from './origins';

export { startNativeHost } from './runtime';
export type { NativeHostDependencies } from './runtime';
export { setupNativeHostRegistration, showNativeHostStatus } from './setup';
export { getAllowedCorsOrigins } from './origins';

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
