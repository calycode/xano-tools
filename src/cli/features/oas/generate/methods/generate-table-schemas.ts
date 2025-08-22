import { convertXanoSchemaToJsonSchema } from '../../../../../core/features/oas/generate/methods/convert-xano-schemas';
import { getCurrentContextConfig, metaApiGet } from '../../../../../utils';
import { loadToken } from '../../../../../config/loaders';

// [ ] CORE
async function generateTableSchemas() {
   const { instanceConfig, workspaceConfig } = getCurrentContextConfig();

   const tableSchemas = {};

   const workspaceTablesRaw = await metaApiGet({
      baseUrl: instanceConfig.url,
      path: `/workspace/${workspaceConfig.id}/table`,
      query: {
         sort: 'name',
         order: 'asc',
         page: 1,
         per_page: 500,
      },
      token: loadToken(instanceConfig.name),
   });

   const workspaceTables = workspaceTablesRaw.items;

   for (const table of workspaceTables) {
      const workspaceTableSchemaRaw = await metaApiGet({
         baseUrl: instanceConfig.url,
         path: `/workspace/${workspaceConfig.id}/table/${table.id}/schema`,
         token: loadToken(instanceConfig.name),
      });

      const workspaceTableSchema = workspaceTableSchemaRaw;

      tableSchemas[`Table.${table.name.replace(' ', '_')}`] = {
         title: `Table.${table.name.replace(' ', '_')}`,
         description: `#### Table id: ${table.id}. ${
            table.auth ? '\n\n **This table is used for AUTH.**' : ''
         }`,
         type: 'object',
         properties: convertXanoSchemaToJsonSchema(workspaceTableSchema, { includeInternal: true })
            .properties,
      };
   }

   return tableSchemas;
}

export { generateTableSchemas };
