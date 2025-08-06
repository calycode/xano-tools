import fs from 'fs/promises';
import path from 'path';
import { cleanupResponseSchemas } from './cleanup-response-schemas.js';
import { generateTableSchemas } from './generate-table-schemas.js';

// Pure function: patch OAS object in-memory
async function patchOasSpec(oas) {
   const newOas = { ...oas };
   const tableSchemas = await generateTableSchemas();
   newOas.openapi = '3.1.1';
   newOas.components = {
      ...(oas.components ?? {}),
      responses: {
         AccessDenied: {
            content: {
               'application/json': {
                  schema: {
                     $ref: '#/components/schemas/Errors.AccessDenied',
                  },
               },
            },
            description: 'Access denied due to insufficient permissions.',
         },
         Unauthorized: {
            content: {
               'application/json': {
                  schema: {
                     $ref: '#/components/schemas/Errors.Unauthorized',
                  },
               },
            },
            description: 'Authentication is required and has failed or has not yet been provided.',
         },
         InternalServerError: {
            content: {
               'application/json': {
                  schema: {
                     $ref: '#/components/schemas/Errors.InternalServerError',
                  },
               },
            },
            description: 'A generic server error.',
         },

         TooManyRequests: {
            content: {
               'application/json': {
                  schema: {
                     $ref: '#/components/schemas/Errors.TooManyRequests',
                  },
               },
            },
            description: 'Hit quota limits.',
         },

         NotFound: {
            content: {
               'application/json': {
                  schema: {
                     $ref: '#/components/schemas/Errors.NotFound',
                  },
               },
            },
            description: 'The requested resource cannot be found.',
         },

         BadRequest: {
            content: {
               'application/json': {
                  schema: {
                     $ref: '#/components/schemas/Errors.BadRequest',
                  },
               },
            },
            description: 'The provided inputs are not correct.',
         },
      },
      schemas: {
         ...(oas.schemas ?? {}),
         'Errors.AccessDenied': {
            type: 'object',
            title: 'Errors.AccessDenied',
            properties: {
               code: {
                  type: 'string',
                  example: 'ERROR_CODE_ACCESS_DENIED',
               },
               message: {
                  type: 'string',
                  example: 'Forbidden access.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                     },
                     { type: 'null' },
                     { type: 'object', properties: {}, additionalProperties: true },
                  ],
               },
            },
         },
         'Errors.Unauthorized': {
            type: 'object',
            title: 'Errors.Unauthorized',
            properties: {
               code: {
                  type: 'string',
                  example: 'ERROR_CODE_UNAUTHORIZED',
               },
               message: {
                  type: 'string',
                  example: 'Authentication required.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                     },
                     { type: 'null' },
                     { type: 'object', properties: {}, additionalProperties: true },
                  ],
               },
            },
         },
         'Errors.InternalServerError': {
            type: 'object',
            title: 'Errors.InternalServerError',
            properties: {
               code: {
                  type: 'string',
                  example: 'ERROR_FATAL',
               },
               message: {
                  type: 'string',
                  example: 'Something went wrong.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                     },
                     { type: 'null' },
                     { type: 'object', properties: {}, additionalProperties: true },
                  ],
               },
            },
         },
         'Errors.TooManyRequests': {
            type: 'object',
            title: 'Errors.TooManyRequests',
            properties: {
               code: {
                  type: 'string',
                  example: 'ERROR_CODE_TOO_MANY_REQUESTS',
               },
               message: {
                  type: 'string',
                  example: 'Hit quota limits.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                     },
                     { type: 'null' },
                     { type: 'object', properties: {}, additionalProperties: true },
                  ],
               },
            },
         },
         'Errors.NotFound': {
            type: 'object',
            title: 'Errors.NotFound',
            properties: {
               code: {
                  type: 'string',
                  example: 'ERROR_CODE_NOT_FOUND',
               },
               message: {
                  type: 'string',
                  example: 'The requested resource cannot be found.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                     },
                     { type: 'null' },
                     { type: 'object', properties: {}, additionalProperties: true },
                  ],
               },
            },
         },
         'Errors.BadRequest': {
            type: 'object',
            title: 'Errors.BadRequest',
            properties: {
               code: {
                  type: 'string',
                  example: 'ERROR_CODE_BAD_REQUEST',
               },
               message: {
                  type: 'string',
                  example: 'The provided inputs are not correct.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                     },
                     { type: 'null' },
                     { type: 'object', properties: {}, additionalProperties: true },
                  ],
               },
            },
         },
         ...(tableSchemas)
      },
   };
   newOas.components.securitySchemes = newOas.components.securitySchemes || {};
   newOas.components.securitySchemes.bearerAuth = {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
   };
   newOas.security = newOas.security || [{ bearerAuth: [] }];
   const oasWithPatchedResponseSchemas = cleanupResponseSchemas(newOas);
   return oasWithPatchedResponseSchemas;
}

// I/O: load, patch, save, and generate Scalar HTML
export async function doOasUpdate(inputOas, outputDir) {
   // Load and patch
   const originalOas = inputOas;
   const oas = await patchOasSpec(originalOas);

   // Ensure output directories exist
   await fs.mkdir(outputDir, { recursive: true });
   await fs.mkdir(path.join(outputDir, 'html'), { recursive: true });

   // Write JSON specs
   await fs.writeFile(path.join(outputDir, 'spec.json'), JSON.stringify(oas, null, 2));
   await fs.writeFile(path.join(outputDir, 'html', 'spec.json'), JSON.stringify(oas, null, 2));

   // Write Scalar HTML
   const html = `
<!doctype html>
<html>
  <head>
    <title>${oas.info?.title || 'API Reference'}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <div id="app"></div>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
    <script>
      Scalar.createApiReference('#app', {
        url: './spec.json',
        hideModels: false,
        hideDownloadButton: false,
        hideTestRequestButton: false,
        hideSearch: false,
        darkMode: false,
        searchHotKey: "k",
        favicon: "",
        defaultHttpClient: {
          targetKey: "node",
          clientKey: "fetch"
        },
        authentication: {
          preferredSecurityScheme: "bearerAuth"
        },
        defaultOpenAllTags: false,
        hideClientButton: false,
        tagsSorter: "alpha",
        operationsSorter: "method",
        theme: "deepSpace"
      })
    </script>
  </body>
</html>
`;
   await fs.writeFile(path.join(outputDir, 'html', 'index.html'), html);

   return oas; // Return the updated OAS object for further use (e.g., SDK generation)
}
