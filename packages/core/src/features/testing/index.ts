import type { Caly } from '../..';
import {
   ApiGroupConfig,
   AssertDefinition,
   AssertOptions,
   CoreContext,
   PrepareRequestArgs,
} from '@repo/types';
import { metaApiGet, prepareRequest } from '@repo/utils';
import { availableAsserts } from './asserts';

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
 * testConfig is actually an array of objects defining in what order and which
 * endpoints to run, also optionally define custom asserts (either inline func, or predefined asserts)
 * ApiGroupConfig allows for extra keys. In this case it should include an 'oas' key
 */
async function testRunner({
   context,
   groups,
   testConfig,
   core,
   storage,
}: {
   context: CoreContext;
   groups: ApiGroupConfig[];
   testConfig: {
      path: string;
      method: string;
      headers: { [key: string]: string };
      queryParams: PrepareRequestArgs['parameters'];
      requestBody: any;
      store?: { key: string; path: string }[];
      customAsserts: AssertDefinition;
   }[];
   core: Caly;
   storage: Caly['storage'];
}): Promise<
   {
      group: ApiGroupConfig;
      results: {
         path: string;
         method: string;
         success: boolean;
         errors: any;
         warnings: any;
         duration: number;
      }[];
   }[]
> {
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
   let runtimeValues = {};

   let finalOutput = [];

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

      const results = [];
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
            // Use only asserts provided in customAsserts (with their specified levels/fns)
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
            // Use all available asserts (with their default levels/fns)
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
            const resolvedQueryParams: PrepareRequestArgs['parameters'] = (queryParams ?? []).map(
               (param) => {
                  param.value = replaceDynamicValues(param.value, runtimeValues);
                  return param;
               }
            );
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
            const assertContext = {
               requestOutcome,
               result,
               method,
               path,
            };
            let assertionErrors = [];
            let assertionWarnings = [];

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
            if (store && requestOutcome.headers.get('content-type').includes('application/json')) {
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
               duration: testDuration,
            });
         }
      }

      finalOutput.push({ group, results });
   }
   return finalOutput;
}

export { testRunner };
