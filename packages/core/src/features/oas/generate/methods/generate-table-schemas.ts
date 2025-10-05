import { convertXanoSchemaToJsonSchema } from './convert-xano-schemas';
import { metaApiGet } from '@repo/utils';

async function generateTableSchemas({ instanceConfig, workspaceConfig, storage }) {
   // Step 1: Fetch all tables
   const workspaceTablesRaw = await metaApiGet({
      baseUrl: instanceConfig.url,
      path: `/workspace/${workspaceConfig.id}/table`,
      query: {
         sort: 'name',
         order: 'asc',
         page: 1,
         per_page: 500,
      },
      token: await storage.loadToken(instanceConfig.name),
   });

   const workspaceTables = workspaceTablesRaw.items;

   // Step 2: Prepare all schema fetch promises
   const tableSchemaPromises = workspaceTables.map(async (table) => {
      const workspaceTableSchemaRaw = await metaApiGet({
         baseUrl: instanceConfig.url,
         path: `/workspace/${workspaceConfig.id}/table/${table.id}/schema`,
         token: await storage.loadToken(instanceConfig.name),
      });

      const workspaceTableSchema = workspaceTableSchemaRaw;

      return [
         `Table.${table.name.replace(' ', '_')}`,
         {
            title: `Table.${table.name.replace(' ', '_')}`,
            description: `#### Table id: ${table.id}. ${
               table.auth ? '\n\n **This table is used for AUTH.**' : ''
            }`,
            type: 'object',
            properties: convertXanoSchemaToJsonSchema(workspaceTableSchema, {
               includeInternal: true,
            }).properties,
         },
      ];
   });

   // Step 3: Resolve all promises in parallel
   const tableSchemasEntries = await Promise.all(tableSchemaPromises);

   // Step 4: Convert entries array to object
   const tableSchemas = Object.fromEntries(tableSchemasEntries);

   return tableSchemas;
}

export { generateTableSchemas };
