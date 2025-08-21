import { spinner } from '@clack/prompts';
import {
   normalizeApiGroupName,
   replacePlaceholders,
   metaApiGet,
   printOutputDir,
} from '../../../../utils/index';
import { loadToken } from '../../../../config/loaders';
import { doOasUpdate } from '../index';

/**
 * Updates the OpenAPI spec for a single group.
 */
async function updateSpecForGroup({
   group,
   instanceConfig,
   workspaceConfig,
   branchConfig,
   printOutput,
}) {
   const s = spinner();
   s.start(`Generating OpenAPI spec for group "${group.name}"`);

   const apiGroupNameNorm = normalizeApiGroupName(group.name);

   const outputPath = replacePlaceholders(instanceConfig.openApiSpec.output, {
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
      api_group_normalized_name: apiGroupNameNorm,
   });

   const openapiRaw = await metaApiGet({
      baseUrl: instanceConfig.url,
      token: loadToken(instanceConfig.name),
      path: `/workspace/${workspaceConfig.id}/apigroup/${group.id}/openapi`,
   });

   await doOasUpdate(openapiRaw, outputPath);

   s.stop(`OpenAPI spec generated for group "${group.name}" → ${outputPath}`);
   printOutputDir(printOutput, outputPath);
}

export { updateSpecForGroup };
