export {
   getCalycodeOpencodeConfigDir,
   getCalycodeOpencodeWorkspaceDir,
   ensureDirectoryExists,
   getOpencodeWorkingDir,
} from './paths';
export type { OpencodeWorkingDirOverrides } from './paths';

export {
   DEFAULT_OPENCODE_VERSION,
   OPENCODE_V1_PACKAGE,
   OPENCODE_V2_PACKAGE,
   getOpencodeMajorVersion,
   resolveOcVersion,
   parseOcVersionFromArgv,
   normalizeOcVersion,
   warnIfUsingNonDefaultOcVersion,
} from './version';

export {
   ensureManagedOpencodeInstalled,
   getManagedOpencodePackageBinaryPath,
   getManagedOpencodePackageDir,
   getOpencodePackageName,
   getOpencodePackageSpecifier,
   shouldUseManagedOpencodeInstall,
} from './install';

export {
   XANO_APP_ORIGIN,
   getExtraCorsOriginsFromEnv,
   launchOpencodeServer,
   proxyOpencode,
   validatePort,
} from './launch';
export type { LaunchOpencodeServerOptions, LaunchedOpencodeServer } from './launch';

export {
   DEFAULT_OPENCODE_PORT,
   OPENCODE_PORT_SCAN_END,
   OPENCODE_PORT_SCAN_SIZE,
   OPENCODE_PORT_SCAN_START,
   getEphemeralPort,
   isPortAvailable,
   parsePortRequest,
   selectAvailablePort,
} from './ports';
export type {
   EphemeralPortProvider,
   PortAvailabilityCheck,
   PortSelection,
   SelectAvailablePortOptions,
} from './ports';

export {
   installArtifact,
   updateArtifact,
   getArtifactStatus,
   clearArtifactCache,
} from './artifacts';
export type { ArtifactKind, ArtifactInstallStatus } from './artifacts';

import { resolveOcVersion, warnIfUsingNonDefaultOcVersion } from './version';
import { ensureManagedOpencodeInstalled, shouldUseManagedOpencodeInstall } from './install';
import { launchOpencodeServer, proxyOpencode } from './launch';
import { parsePortRequest, selectAvailablePort } from './ports';
import {
   installArtifact,
   updateArtifact,
   getArtifactStatus,
   clearArtifactCache,
} from './artifacts';

/**
 * The OpenCode distribution module's interface: obtaining, versioning,
 * installing, launching, and proxying OpenCode, plus its installable
 * templates and skills.
 */
export const distribution = {
   resolveVersion: resolveOcVersion,
   warnIfNonDefault: warnIfUsingNonDefaultOcVersion,
   ensureInstalled: ensureManagedOpencodeInstalled,
   shouldUseManagedInstall: shouldUseManagedOpencodeInstall,
   launchServer: launchOpencodeServer,
   selectPort: selectAvailablePort,
   parsePort: parsePortRequest,
   proxy: proxyOpencode,
   artifacts: {
      install: installArtifact,
      update: updateArtifact,
      status: getArtifactStatus,
      clear: clearArtifactCache,
   },
};
