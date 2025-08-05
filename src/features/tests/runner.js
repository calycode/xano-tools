// src/tests/runner.js
import { prepareRequest } from './utils/request.js';
import { replacePlaceholders } from './utils/replacePlaceholders.js';
import { generateMockDataForSchema } from './utils/mockData.js';
import { validateSchema } from './utils/schemaValidation.js';
import { availableAsserts } from './utils/customAssertions.js';
import { log } from '@clack/prompts';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';

export async function runOasApiTests({
   oasSpec,
   endpointsToTest,
   baseUrl,
   headers = {}, // General headers that are relevant for all requests.
   secrets = {},
   output,
   defaultAsserts = {
      statusOk: 'error',
      responseDefined: 'error',
      responseSchema: 'error',
   },
}) {

   log.info('Starting tests...');
   const runtimeValues = { ...secrets };

   const results = [];

   for (const endpoint of endpointsToTest) {
      const {
         path,
         method,
         headers: customHeaders,
         requestBody,
         queryParams,
         response_runtime_key,
         customAsserts = {},
      } = endpoint;

      const asserts = {
         ...defaultAsserts,
         ...customAsserts,
      };

      // Start timer
      const testStart = Date.now();

      try {
         // Replace placeholders in headers, request body and queryParams
         const resolvedHeaders = replacePlaceholders(customHeaders, runtimeValues);
         const resolvedQueryParams = replacePlaceholders(queryParams, runtimeValues);
         const resolvedRequestBody = replacePlaceholders(requestBody, runtimeValues);

         const operation = oasSpec.paths?.[path]?.[method.toLowerCase()];
         const reqBodySchema = operation?.requestBody?.content?.['application/json']?.schema;
         let resSchema = operation?.responses?.['200']?.content?.['application/json']?.schema;

         let body = reqBodySchema ? generateMockDataForSchema(reqBodySchema) : null;
         if (requestBody) {
            body = { ...body, ...resolvedRequestBody };
         }

         const preparedRequest = prepareRequest({
            baseUrl,
            path,
            method,
            headers: {
               ...headers,
               ...resolvedHeaders,
            },
            queryParams: resolvedQueryParams,
            body,
         });

         const res = await fetch(preparedRequest.url, preparedRequest);

         const contentType = res.headers.get('content-type');
         const result = contentType?.includes('application/json')
            ? await res.json()
            : await res.text();

         const assertContext = {
            res,
            result,
            method,
            path,
            resSchema,
            validateSchema,
            isValid: validateSchema(resSchema, result),
            errors: validateSchema(resSchema, result).errors,
         };

         // Run each available and allowed assert for the current endpoint:
         for (const [assertKey, assertFn] of Object.entries(availableAsserts)) {
            const level = asserts[assertKey] || 'error';
            if (level === 'off') continue;
            try {
               assertFn(assertContext);
            } catch (e) {
               if (level === 'error') throw e;
               if (level === 'warn') log.warn(e.message);
            }
         }

         // Handle runtime values (e.g., DEMO_ADMIN_AUTH_TOKEN)
         // This shall happen on every request where the 'response_runtime_key' is specified
         // The stored response is reusable during runtime with the specified key: 'ENVIRONMENT[respone_runtime_key]'
         if (response_runtime_key) {
            if (result) {
               runtimeValues[response_runtime_key] = result;
            } else {
               console.warn('❌ Storing runtime value failed.');
            }
         }

         // End timer
         const testEnd = Date.now();
         const testDuration = testEnd - testStart;
         // Optionally collect results
         results.push({ path, method, success: true, errors: null, duration: testDuration });
      } catch (err) {
         // End timer
         const testEnd = Date.now();
         const testDuration = testEnd - testStart;
         console.warn(`❌ Test failed for ${method.toUpperCase()} ${path}:`, err);
         results.push({ path, method, success: false, errors: err.stack || err.message, duration: testDuration });
      }
   }

if (output) {
   const parentDir = path.dirname(output);
   await mkdir(parentDir, { recursive: true });
   await writeFile(output, JSON.stringify(results, null, 2));
}

   log.success(`Tests completed. Report is at -> ${output}`);

   return results;
}
