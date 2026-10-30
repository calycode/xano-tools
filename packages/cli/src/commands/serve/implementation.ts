import path from 'node:path';
import { normalizeApiGroupName } from '@repo/utils';
import {
   chooseApiGroupOrAll,
   resolveArtifactDestination,
   resolveConfigs,
   serveStaticDirectory,
} from '../../utils/index';

async function serveOas({ instance, workspace, branch, group, listen = 5999, cors = false, core }) {
   const { instanceConfig, workspaceConfig, branchConfig } = await resolveConfigs({
      cliContext: { instance, workspace, branch },
      core,
   });

   const apiGroups = await chooseApiGroupOrAll({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
      workspace_id: workspaceConfig.id,
      branchLabel: branchConfig.label,
      promptUser: !group,
      groupName: group,
      all: false,
   });

   const currentApiGroup = apiGroups[0];
   const apiGroupNameNorm = normalizeApiGroupName(currentApiGroup.name);

   const specBasePath = await resolveArtifactDestination({
      template: instanceConfig.openApiSpec.output,
      context: {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
         apiGroupNormalized: apiGroupNameNorm,
      },
   });

   await serveStaticDirectory({
      root: path.join(specBasePath, 'html'),
      port: listen,
      cors,
      label: 'OpenAPI spec',
      entryPath: '/',
      missingHint: "Run 'caly-xano generate spec' first to produce the spec.",
   });
}

function serveRegistry({ root = 'registry', listen = 5000, cors = false }) {
   return serveStaticDirectory({
      root,
      port: listen,
      cors,
      label: 'registry',
      entryPath: '/index.json',
      missingHint:
         "Run 'caly-xano registry scaffold --output <path>' first, or pass --root <path>.",
   });
}

export { serveOas, serveRegistry };
