export {
   getCalycodeOpencodeConfigDir,
   getCalycodeOpencodeWorkspaceDir,
   ensureDirectoryExists,
   getOpencodeWorkingDir,
} from './paths';
export type { OpencodeWorkingDirOverrides } from './paths';

export {
   DEFAULT_OPENCODE_VERSION,
   resolveOcVersion,
   parseOcVersionFromArgv,
   normalizeOcVersion,
   warnIfUsingNonDefaultOcVersion,
} from './version';

export {
   ensureManagedOpencodeInstalled,
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
   installArtifact,
   updateArtifact,
   getArtifactStatus,
   clearArtifactCache,
} from './artifacts';
export type { ArtifactKind, ArtifactInstallStatus } from './artifacts';

import { resolveOcVersion, warnIfUsingNonDefaultOcVersion } from './version';
import { ensureManagedOpencodeInstalled, shouldUseManagedOpencodeInstall } from './install';
import { launchOpencodeServer, proxyOpencode } from './launch';
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
   proxy: proxyOpencode,
   artifacts: {
      install: installArtifact,
      update: updateArtifact,
      status: getArtifactStatus,
      clear: clearArtifactCache,
   },
};
