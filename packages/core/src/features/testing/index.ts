import type { Caly } from '../..';
import {
   ApiGroupConfig,
   AssertDefinition,
   AssertOptions,
   CoreContext,
} from '@repo/types';
import { metaApiGet, prepareRequest } from '@repo/utils';
import { availableAsserts } from './asserts';

// Re-export types for consumers (will be available once types package is rebuilt)
// For now, define inline to avoid build issues
interface TestConfigEntry {
   path: string;
   method: string;
   headers: Record<string, string>;
   queryParams: Array<{ name: string; in: 'path' | 'query' | 'header' | 'cookie'; value: any }> | null;
   requestBody: any;
   store?: Array<{ key: string; path: string }>;
   customAsserts?: AssertDefinition;
}

interface TestResult {
   path: string;
   method: string;
   success: boolean;
   errors: Array<{ key: string; message: string }> | string | null;
   warnings: Array<{ key: string; message: string }> | null;
   duration: number;
}

interface TestGroupResult {
   group: ApiGroupConfig;
   results: TestResult[];
}

interface AssertContext {
   requestOutcome: Response;
   result: any;
   method: string;
   path: string;
}

// ----------- UTILS ------------- //
const replaceDynamicValues = (obj, replacements) => {
   if (typeof obj === 'string') {
      return obj.replace(/{{ENVIRONMENT\.([A-Z0-9_]+)}}/g, (_, key) => replacements[key] || '');
   }
   if (Array.isArray(obj)) {
      return obj.map((item) => replaceDynamicValues(item, replacements));
   }
   if (typeof obj === 'object' && obj !== null) {
      return Object.fromEntries(
         Object.entries(obj).map(([key, value]) => [key, replaceDynamicValues(value, replacements)])
      );
   }
   return obj;
};

// [ ] Consider using the JSONPath package for a full-featured JSONPath lookup.
/**
 * Utility to extract runtime values.
 *
 * @param obj
 * @param path
 * @returns
 */
function getByPath(obj, path) {
   // Normalize: remove leading "$.", "$", or "."
   let cleanPath = path.replace(/^\$\.?/, '').replace(/^\./, '');
   // Split into tokens for dot and array
   const tokens = cleanPath.split(/[\.\[]/g).map((t) => t.replace(/]$/, ''));
   return tokens.reduce((acc, key) => acc?.[key], obj);
}

/**
 * Execute the configured API tests across the provided API groups and return per-group results.
 *
 * For each group, ensures an OpenAPI spec is available (fetching and patching from the remote API if absent),
 * runs the endpoints defined by `testConfig` in order, evaluates assertions (built-in or custom),
 * optionally extracts runtime values from JSON responses into a shared runtime store, and records timing,
 * successes, errors, and warnings for each endpoint.
 *
 * @param context - Execution context containing instance, workspace, and branch identifiers
 * @param groups - Array of API group configurations; each group may include an `oas` property (OpenAPI) and a `canonical` identifier used to build request base URLs
 * @param testConfig - Ordered array of endpoint test definitions. Each entry should include:
 *   - `path` and `method` for the request
 *   - `headers`, `queryParams`, and `requestBody` for request composition
 *   - optional `store` mappings [{ key, path }] to extract values from JSON responses into runtime variables
 *   - optional `customAsserts` to override or provide per-endpoint assertions
 *
 * @returns An array of objects, one per input group, each containing the original `group` and a `results` array.
 *          Each result includes `path`, `method`, `success` (true if no assertion errors), `errors` (or null),
 *          `warnings` (or null), and `duration` (milliseconds)
 */
async function testRunner({
   context,
   groups,
   testConfig,
   core,
   storage,
   initialRuntimeValues = {},
}: {
   context: CoreContext;
   groups: ApiGroupConfig[];
   testConfig: TestConfigEntry[];
   core: Caly;
   storage: Caly['storage'];
   initialRuntimeValues?: Record<string, any>;
}): Promise<TestGroupResult[]> {
   const { instance, workspace, branch } = context;

   core.emit('start', { name: 'start-testing', payload: context });
   const startDir = storage.getStartDir();
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      branch,
      startDir,
   });

   const DEFAULT_HEADERS = {
      'X-Data-Source': 'test',
      'X-Branch': branchConfig.label,
   };
   let runtimeValues = initialRuntimeValues ?? {};

   let finalOutput: TestGroupResult[] = [];

   for (const group of groups) {
      // Make sure we have OpenaAPI specs to run our tests against
      if (!group.oas) {
         const remoteOas = await metaApiGet({
            baseUrl: instanceConfig.url,
            token: await core.loadToken(instanceConfig.name),
            path: `/workspace/${workspaceConfig.id}/apigroup/${group.id}/openapi`,
         });
         const patchedOas = await core.doOasUpdate({
            inputOas: remoteOas,
            instanceConfig,
            workspaceConfig,
         });
         group.oas = patchedOas.oas;
      }

      const results: TestResult[] = [];
      // Actually run the test based on config (support runtime values)
      for (const endpoint of testConfig) {
         const testStart = Date.now();
         const {
            path,
            method,
            headers = {},
            queryParams,
            requestBody,
            store,
            customAsserts,
         } = endpoint;

         // Setup all asserts that are available for this endpoint
         const assertsToRun: AssertOptions[] = [];

         const customAssertKeys = customAsserts ? Object.keys(customAsserts) : [];

         if (customAssertKeys.length > 0) {
            for (const key of customAssertKeys) {
               const assertOpt = customAsserts[key];
               if (assertOpt && typeof assertOpt.fn === 'function' && assertOpt.level !== 'off') {
                  assertsToRun.push({
                     key,
                     ...assertOpt,
                  });
               }
            }
         } else {
            for (const [key, assertOpt] of Object.entries(availableAsserts)) {
               if (assertOpt.level !== 'off') {
                  assertsToRun.push({
                     key,
                     ...assertOpt,
                  });
               }
            }
         }

         try {
            // Resolve values and prepare request:
            const resolvedQueryParams = (queryParams ?? []).map((param) => ({
               ...param,
               value: replaceDynamicValues(param.value, runtimeValues),
            }));
            const resolvedHeaders = replaceDynamicValues(
               { ...headers, ...DEFAULT_HEADERS },
               {
                  ...runtimeValues,
               }
            );
            const resolvedRequestBody = replaceDynamicValues(requestBody, runtimeValues);
            const preparedRequest = prepareRequest({
               baseUrl: `${instanceConfig.url}/api:${group.canonical}`,
               path,
               method,
               headers: resolvedHeaders,
               parameters: resolvedQueryParams,
               body: resolvedRequestBody,
            });
            // Execute the request
            const requestOutcome = await fetch(preparedRequest.url, preparedRequest);
            const contentType = requestOutcome.headers.get('content-type');
            const result = contentType?.includes('application/json')
               ? await requestOutcome.json()
               : await requestOutcome.text();

            // Collect assertion results/errors
            const assertContext: AssertContext = {
               requestOutcome,
               result,
               method,
               path,
            };
            let assertionErrors: Array<{ key: string; message: string }> = [];
            let assertionWarnings: Array<{ key: string; message: string }> = [];

            // Run all prepared asserts
            for (const { key, fn, level } of assertsToRun) {
               if (level === 'off') continue;
               try {
                  fn(assertContext);
               } catch (e) {
                  if (level === 'error') assertionErrors.push({ key, message: e.message });
                  if (level === 'warn') assertionWarnings.push({ key, message: e.message });
               }
            }

            // Add runtime values if request has 'store' defined
            if (store && requestOutcome.headers.get('content-type')?.includes('application/json')) {
               const newRuntimeValues = Object.fromEntries(
                  store.map(({ key, path }) => [key, getByPath(result, path.replace(/^\./, ''))])
               );
               runtimeValues = {
                  ...runtimeValues,
                  ...newRuntimeValues,
               };
            }

            const testEnd = Date.now();
            const testDuration = testEnd - testStart;
            results.push({
               path,
               method,
               success: assertionErrors.length === 0,
               errors: assertionErrors.length > 0 ? assertionErrors : null,
               warnings: assertionWarnings.length > 0 ? assertionWarnings : null,
               duration: testDuration,
            });
         } catch (error) {
            const testEnd = Date.now();
            const testDuration = testEnd - testStart;
            results.push({
               path,
               method,
               success: false,
               errors: error.stack || error.message,
               warnings: null,
               duration: testDuration,
            });
         }
      }

      finalOutput.push({ group, results });
   }
   return finalOutput;
}

export { testRunner };
