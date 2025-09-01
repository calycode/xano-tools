import type { Caly } from '../..';
import { ApiGroupConfig, CoreContext, PrepareRequestArgs } from '@calycode/types';
import { metaApiGet, prepareRequest } from '@calycode/utils';
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

function getByPath(obj, path) {
   return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * testConfig is actually an array of objects defining in what order and which
 * endpoints to run, also optionally define custom asserts (either inline func, or predefined asserts)
 * ApiGroupConfig allows for extra keys. In this case it should include an 'oas' key
 */
async function testRunnerReworked({
   context,
   groups,
   testConfig,
   core,
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
      customAsserts: string[];
   }[];
   core: Caly;
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

   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      branch,
   });

   const DEFAULT_X_DATA_SOURCE = 'test';
   const DEFAULT_X_BRANCH = branchConfig.label;
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

         const { path, method, headers, queryParams, requestBody, store, customAsserts } = endpoint;

         const mergedAsserts = {
            ...availableAsserts,
            ...customAsserts,
         };

         try {
            // Resolve values and prepare request:
            const resolvedQueryParams: PrepareRequestArgs['parameters'] = (queryParams ?? []).map(
               (param) => {
                  param.value = replaceDynamicValues(param.value, runtimeValues);
                  return param;
               }
            );
            const resolvedHeaders = replaceDynamicValues(headers, runtimeValues);
            const resolvedRequestBody = replaceDynamicValues(requestBody, runtimeValues);

            const preparedRequest = prepareRequest({
               baseUrl: instanceConfig.url,
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

            for (const [assertKey, assertFn] of Object.entries(availableAsserts)) {
               const level = mergedAsserts[assertKey] || 'error';
               if (level === 'off') continue;
               try {
                  assertFn(assertContext);
               } catch (e) {
                  if (level === 'error')
                     assertionErrors.push({ key: assertKey, message: e.message });
                  if (level === 'warn') {
                     assertionWarnings.push({ key: assertKey, message: e.message });
                  }
               }
            }

            // Add runtime values if request has 'store' defined
            if (store && requestOutcome.headers.get('content-type') === 'application/json') {
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

export { testRunnerReworked };
