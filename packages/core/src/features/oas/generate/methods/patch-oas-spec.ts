import { cleanupResponseSchemas } from './cleanup-response-schemas';
import { extractTagsToGlobal } from './extract-tags-to-global-level';
import { generateTableSchemas } from '..';

async function patchOasSpec({
   oas,
   instanceConfig,
   workspaceConfig,
   storage,
   includeTables = false,
}) {
   const newOas = { ...oas };
   const tableSchemas = includeTables
      ? await generateTableSchemas({ instanceConfig, workspaceConfig, storage })
      : {};

   newOas.openapi = '3.1.1';

   newOas.tags = extractTagsToGlobal(newOas.paths);

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
                  format: 'const',
                  maxLength: 64,
                  example: 'ERROR_CODE_ACCESS_DENIED',
               },
               message: {
                  type: 'string',
                  format: 'const',
                  maxLength: 256,
                  example: 'Forbidden access.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                        format: 'const',
                        maxLength: 1024,
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
                  format: 'const',
                  maxLength: 64,
                  example: 'ERROR_CODE_UNAUTHORIZED',
               },
               message: {
                  type: 'string',
                  format: 'const',
                  maxLength: 256,
                  example: 'Authentication required.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                        format: 'const',
                        maxLength: 1024,
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
                  format: 'const',
                  maxLength: 64,
                  example: 'ERROR_FATAL',
               },
               message: {
                  type: 'string',
                  format: 'const',
                  maxLength: 256,
                  example: 'Something went wrong.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                        format: 'const',
                        maxLength: 1024,
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
                  format: 'const',
                  maxLength: 64,
                  example: 'ERROR_CODE_TOO_MANY_REQUESTS',
               },
               message: {
                  type: 'string',
                  format: 'const',
                  maxLength: 256,
                  example: 'Hit quota limits.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                        format: 'const',
                        maxLength: 1024,
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
                  format: 'const',
                  maxLength: 64,
                  example: 'ERROR_CODE_NOT_FOUND',
               },
               message: {
                  type: 'string',
                  format: 'const',
                  maxLength: 256,
                  example: 'The requested resource cannot be found.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                        format: 'const',
                        maxLength: 1024,
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
                  format: 'const',
                  maxLength: 64,
                  example: 'ERROR_CODE_BAD_REQUEST',
               },
               message: {
                  type: 'string',
                  format: 'const',
                  maxLength: 256,
                  example: 'The provided inputs are not correct.',
               },
               payload: {
                  anyOf: [
                     {
                        type: 'string',
                        format: 'const',
                        maxLength: 1024,
                     },
                     { type: 'null' },
                     { type: 'object', properties: {}, additionalProperties: true },
                  ],
               },
            },
         },
         ...tableSchemas,
      },

      securitySchemes: {
         ...(newOas.components.securitySchemes ?? {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
         }),
      },
   };

   newOas.security = newOas.security || [{ bearerAuth: [] }];

   const oasWithPatchedResponseSchemas = cleanupResponseSchemas(newOas);

   return oasWithPatchedResponseSchemas;
}

export { patchOasSpec };
