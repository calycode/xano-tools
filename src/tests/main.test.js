import { describe, test, expect, afterAll } from 'vitest';
import { loadOAS } from './utils/loadOAS.js';
import { prepareRequest } from './utils/request.js';
import { validateSchema } from './utils/schemaValidation.js';
import { generateMockDataForSchema } from './utils/mockData.js';
import { endpointsToTest } from './config/setup.js';
import {
   assertResponseStatus,
   assertResponseDefined,
   assertResponseSchema,
} from './utils/customAssertions.js';
import { replacePlaceholders } from './utils/replacePlaceholders.js';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL;
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';
const DEFAULT_X_DATA_SOURCE = process.env.DEFAULT_X_DATA_SOURCE || 'test';
const DEFAULT_X_BRANCH = process.env.DEFAULT_X_BRANCH || 'staging';

const debugRequests = [];

const oas = await loadOAS();

describe('OAS - API tests | Response status and schema', () => {
   const runtimeValues = { ...process.env };

   for (const endpoint of endpointsToTest) {
      const { path, method, headers, requestBody: customRequestBody, queryParams } = endpoint;

      test(`${method.toUpperCase()}:${path}`, async () => {
         try {
            // Replace placeholders in headers, request body and queryParams with runtime values
            const resolvedHeaders = replacePlaceholders(headers, runtimeValues);
            const resolvedQueryParams = replacePlaceholders(queryParams, runtimeValues);
            const resolvedRequestBody = replacePlaceholders(customRequestBody, runtimeValues);

            const operation = oas.paths?.[path]?.[method.toLowerCase()];
            const reqBodySchema = operation?.requestBody?.content?.['application/json']?.schema;
            let resSchema = true;
            if (operation?.responses?.['200']?.content?.['application/json']?.schema.properties) {
               resSchema = operation?.responses?.['200']?.content?.['application/json']?.schema;
            }

            let body = reqBodySchema ? generateMockDataForSchema(reqBodySchema) : null;
            if (customRequestBody) {
               body = { ...body, ...resolvedRequestBody };
            }

            const preparedRequest = prepareRequest({
               baseUrl: API_BASE_URL,
               path,
               method,
               headers: {
                  'X-Branch': DEFAULT_X_BRANCH,
                  'X-Data-Source': DEFAULT_X_DATA_SOURCE,
                  ...resolvedHeaders,
               },
               queryParams: resolvedQueryParams,
               body,
            });

            debugRequests.push(preparedRequest);

            if (!DEBUG_MODE) {
               const res = await fetch(preparedRequest.url, preparedRequest);

               assertResponseStatus(res, method, path);

               // Parse response
               const contentType = res.headers.get('content-type');
               const result = contentType?.includes('application/json')
                  ? await res.json()
                  : await res.text();

               assertResponseDefined(result, method, path);

               // Validate response schema
               if (resSchema) {
                  const { isValid, errors } = validateSchema(resSchema, result);
                  assertResponseSchema(isValid, errors, method, path);

                  if (!isValid) {
                     console.warn(
                        `❌ Schema validation failed for ${method.toUpperCase()} ${path}`,
                        errors
                     );
                  }
               }

               // Handle runtime values (e.g., DEMO_ADMIN_AUTH_TOKEN)
               if (path === '/auth/continue' && method.toUpperCase() === 'POST') {
                  if (result.authToken) {
                     runtimeValues.DEMO_ADMIN_AUTH_TOKEN = result.authToken;
                  } else {
                     console.warn('❌ authToken is missing in the response for /auth/continue');
                  }
               }
            } else {
               console.log(`Debug mode: Prepared request for ${method.toUpperCase()} ${path}`);
            }
         } catch (err) {
            console.warn(`❌ Test failed for ${method.toUpperCase()} ${path}:`, err);
            expect(
               err,
               `${method.toUpperCase()}:${path} | ❌ Test failed with: ${err.stack || err.message}`
            ).toBeNull();
         }
      });
   }

   afterAll(() => {
      if (DEBUG_MODE) {
         fs.writeFileSync('debug_requests.json', JSON.stringify(debugRequests, null, 2));
         console.log('Debug requests written to debug_requests.json');
      }
   });
});
