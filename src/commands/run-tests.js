import fs from 'fs/promises';
import path from 'path';
import { intro, log } from '@clack/prompts';
import { getCurrentContextConfig } from '../utils/context/index.js';
import { loadGlobalConfig, loadToken } from '../config/loaders.js';
import { chooseApiGroupOrAll } from '../utils/api-group-selection/index.js';
import { normalizeApiGroupName } from '../utils/normalizeApiGroupName.js';
import { replacePlaceholders } from '../features/tests/utils/replacePlaceholders.js';
import { metaApiGet } from '../utils/metadata/api-helper.js';
import { doOasUpdate } from '../features/oas/update/index.js';
import { isEmptySchema } from '../utils/testing/is-empty-schema.js';
import { prepareRequest } from '../utils/testing/prepare-request.js';
// [ ] TODO: bring back the schema validation!
import { availableAsserts } from '../features/tests/utils/customAssertions.js';
import { withErrorHandler } from '../utils/commander/with-error-handler.js';

async function testRunner(instance, workspace, branch, group, isAll = false) {
   intro('☣️   Stating up the testing...');

   // 1. Get the current context.
   const globalConfig = loadGlobalConfig();
   const context = {
      ...globalConfig.currentContext,
      instance,
      workspace,
      branch,
      group,
   };
   const { instanceConfig, workspaceConfig, branchConfig } = getCurrentContextConfig(
      globalConfig,
      context
   );

   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      log.error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
      process.exit(1);
   }

   // 2. Get API groups (prompt or all)
   const groups = await chooseApiGroupOrAll({
      baseUrl: instanceConfig.url,
      token: loadToken(instanceConfig.name),
      workspace_id: workspaceConfig.id,
      branchLabel: branchConfig.label,
      promptUser: !isAll && !group,
      groupName: group,
      all: isAll,
   });

   // 3. Loop through the groups: fetch OAS, run test.
   for (const group of groups) {
      const apiGroupNameNorm = normalizeApiGroupName(group.name);
      const oasOutputPath = replacePlaceholders(instanceConfig.openApiSpec.output, {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
         api_group_normalized_name: apiGroupNameNorm,
      });

      // 3.1 Find the OAS at the outputPath. If not present, generate from remote...
      const localOasPath = path.join(oasOutputPath, 'spec.json');
      let oasSpec;
      try {
         oasSpec = JSON.parse(await fs.readFile(localOasPath, 'utf8'));
      } catch {
         // [ ] TODO: Log event to the temp logs.
         if (!oasSpec) {
            log.warn(
               `Local OpenAPI spec for ${group.name} not found. Generating one from remote source...`
            );

            const openapiRaw = await metaApiGet({
               baseUrl: instanceConfig.url,
               token: loadToken(instanceConfig.name),
               path: `/workspace/${workspaceConfig.id}/apigroup/${group.id}/openapi`,
            });

            oasSpec = await doOasUpdate(openapiRaw, oasOutputPath);
         }

         log.step(`Local OpenAPI spec for ${group.name} generated. Continuing to tests.`);
      }

      // 3.2 Actually do the test running.

      // 3.2.1 Prepare the endpoints to test
      const serverUrl = oasSpec.servers[0].url;
      const endpointsToTest = [];

      for (const path in oasSpec.paths) {
         for (const method in oasSpec.paths[path]) {
            // [ ] TODO: implement here a merge from future optional test setup file
            // [ ] TODO: implement a potential formdata request body to also be able to test file uploads or functionality from restricted frontends.
            // [ ] TODO: extend to also allow runtime key handling so that we can pass on specific
            const op = oasSpec.paths[path][method];
            const responseSchema = op.responses?.['200']?.content?.['application/json']?.schema;
            const customAsserts = {};

            if (isEmptySchema(responseSchema)) {
               customAsserts.responseSchema = 'off';
            }

            endpointsToTest.push({
               path,
               method: method.toUpperCase(),
               headers: {},
               parameters: op.parameters || [],
               requestBody: op.requestBody?.content?.['application/json']?.schema || {},
               customAsserts,
            });
         }
      }

      // 3.2.2 Start the test with looping through the endpointsToTest:
      const defaultTestSetup = instanceConfig.test;
      const results = [];
      for (const endpoint of endpointsToTest) {
         const testStart = Date.now();

         const { path, method, headers, parameters, requestBody, customAsserts } = endpoint;
         try {
            const mergedAsserts = {
               ...defaultTestSetup.defaultAsserts,
               ...customAsserts,
            };
            const mergedHeaders = replacePlaceholders(
               {
                  ...defaultTestSetup.headers,
                  ...headers,
               },
               { branch: branchConfig.label }
            );

            // Resolve headers, params or body depending on the method:
            const req = prepareRequest({
               baseUrl: serverUrl,
               path,
               method,
               headers: mergedHeaders,
               parameters,
               body: requestBody,
            });

            const res = await fetch(req.url, req);
            const contentType = res.headers.get('content-type');
            const result = contentType?.includes('application/json')
               ? await res.json()
               : await res.text();

            // [ ] TODO: add a feature to handle runtime values of the tests.

            const assertContext = {
               res,
               result,
               method,
               path,
            };

            // Collect assertion results/errors
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
                     log.warn(`${method} ${path} [${assertKey}]: ${e.message}`);
                  }
               }
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
         } catch (err) {
            const testEnd = Date.now();
            const testDuration = testEnd - testStart;
            log.warn(`Test failed for ${method.toUpperCase()} ${path}: ${err}`);
            results.push({
               path,
               method,
               success: false,
               errors: err.stack || err.message,
               duration: testDuration,
            });
         }
      }

      const testOutputPath = replacePlaceholders(defaultTestSetup.output, {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
         api_group_normalized_name: apiGroupNameNorm,
      });

      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, '-');
      const testFileName = `test-results-${ts}.json`;

      await fs.mkdir(testOutputPath, { recursive: true });
      await fs.writeFile(path.join(testOutputPath, testFileName), JSON.stringify(results, null, 3));

      printTestSummary(results);

      log.step(`Tests for ${group.name} completed. Results -> ${testOutputPath}${testFileName}`);
   }
}

function printTestSummary(results) {
   const total = results.length;
   const succeeded = results.filter((r) => r.success).length;
   const failed = total - succeeded;
   const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

   // Table header
   log.message(
      `${'='.repeat(60)}
Test Results Summary
${'-'.repeat(60)}
${'Status'.padEnd(4)} | ${'Method'.padEnd(6)} | ${'Path'.padEnd(24)} | ${'Duration (ms)'}
${'-'.repeat(60)}`
   );

   // Table rows
   for (const r of results) {
      const status = r.success ? '✅' : '❌';
      log.message(
         `${status.padEnd(4)} | ${r.method.padEnd(6)} | ${r.path.padEnd(24)} | ${(
            r.duration || 0
         ).toString()}`
      );
   }

   log.message(
      `${'-'.repeat(60)}
Total: ${total} | Passed: ${succeeded} | Failed: ${failed} | Total Duration: ${totalDuration} ms
${'-'.repeat(60)}`
   );
}

function registerTestViaOasCommand(program) {
   program
      .command('test-via-oas')
      .description('Run an API test suite via the OpenAPI spec. WIP...')
      .action(
         withErrorHandler(async () => {
            await testRunner();
         })
      );
}

export { registerTestViaOasCommand };
