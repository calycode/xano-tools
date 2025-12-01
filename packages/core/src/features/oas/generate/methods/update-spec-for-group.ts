import { metaApiGet } from '@repo/utils';
import { doOasUpdate } from '../index';

interface GeneratedItem {
   path: string;
   content: string;
}

async function updateSpecForGroup({
   group,
   instanceConfig,
   workspaceConfig,
   storage,
   core,
   includeTables = false,
}: {
   group: any;
   instanceConfig: any;
   workspaceConfig: any;
   branchConfig: any;
   storage: any;
   core: any;
   includeTables: boolean;
}): Promise<{
   oas: string;
   generatedItems: GeneratedItem[];
}> {
   // Get raw OAS from API
   const openapiRaw = await metaApiGet({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
      path: `/workspace/${workspaceConfig.id}/apigroup/${group.id}/openapi`,
   });

   // Generate OAS and artifacts (relative paths)
   const { oas, generatedItems } = await doOasUpdate({
      inputOas: openapiRaw,
      instanceConfig,
      workspaceConfig,
      storage,
      includeTables,
   });

   // Optionally emit info for consumer
   core.emit('info', {
      name: 'oas-group-generated',
      payload: { group: group.name, generatedItems },
      message: `OAS generated for group: ${group.name}`,
   });

   return { oas, generatedItems };
}

export { updateSpecForGroup };
