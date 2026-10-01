export * from './paths';
export * from './version';
export * from './install';
export * from './spawn-plan';
export * from './launch';
export * from './artifacts';

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
