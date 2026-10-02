import path from 'node:path';
import { normalizeApiGroupName, replacePlaceholders } from '@repo/utils';
import {
   chooseApiGroupOrAll,
   findProjectRoot,
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

   const specBasePath = replacePlaceholders(instanceConfig.openApiSpec.output, {
      '@': await findProjectRoot(),
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
      api_group_normalized_name: apiGroupNameNorm,
   });

   await serveStaticDirectory({
      root: path.join(specBasePath, 'html'),
      port: listen,
      cors,
      label: 'OpenAPI spec',
      missingHint: "Run 'caly-xano generate spec' first to produce the spec.",
   });
}

function serveRegistry({ root = 'registry', listen = 5000, cors = false }) {
   return serveStaticDirectory({
      root,
      port: listen,
      cors,
      label: 'registry',
      missingHint:
         "Run 'caly-xano registry scaffold --output <path>' first, or pass --root <path>.",
   });
}

export { serveOas, serveRegistry };
