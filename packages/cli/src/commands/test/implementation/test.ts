import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { intro, log, spinner } from '@clack/prompts';
import { normalizeApiGroupName, replacePlaceholders } from '@repo/utils';
import {
   chooseApiGroupOrAll,
   findProjectRoot,
   printOutputDir,
   resolveConfigs,
} from '../../../utils/index';

/**
 * Prints a formatted summary table of test outcomes to the log.
 *
 * Logs a header, one row per result showing status, HTTP method, path, and duration, and a final summary line with totals and aggregate duration.
 *
 * @param results - Array of test result objects. Each object should include:
 *   - `success` (boolean): whether the test passed,
 *   - `method` (string): HTTP method used,
 *   - `path` (string): endpoint path,
 *   - `duration` (number, optional): duration of the test in milliseconds
 */
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

/**
 * Load a test configuration from a file path supporting `.json`, `.js`, and `.ts` files.
 *
 * For `.json` files the content is read and parsed as JSON. For `.js` and `.ts` files the module is required and the `default` export is returned if present, otherwise the module itself is returned.
 *
 * @param testConfigPath - Filesystem path to the test configuration file
 * @returns The loaded test configuration object
 * @throws Error if the file extension is not `.json`, `.js`, or `.ts`
 */
async function loadTestConfig(testConfigPath) {
   const ext = path.extname(testConfigPath).toLowerCase();
   if (ext === '.json') {
      const content = await readFile(testConfigPath, 'utf8');
      return JSON.parse(content);
   } else if (ext === '.js') {
      const config = require(path.resolve(testConfigPath));
      return config.default || config;
   } else {
      throw new Error('Unsupported test config file type.');
   }
}

/**
 * Runs API tests for selected API groups using a provided test configuration and writes per-group results to disk.
 *
 * @param instance - Name or alias of the target instance
 * @param workspace - Workspace name within the instance
 * @param branch - Branch label within the workspace
 * @param group - Specific API group name to run; when omitted and `isAll` is false the user may be prompted
 * @param testConfigPath - Filesystem path to the test configuration file (supported: .json, .js, .ts)
 * @param isAll - If true, run tests for all API groups without prompting
 * @param printOutput - If true, display the output directory path after writing results
 * @param core - Runtime provider exposing `loadToken` and `runTests` used to execute tests and load credentials
 */
async function runTest({
   instance,
   workspace,
   branch,
   group,
   testConfigPath,
   isAll = false,
   printOutput = false,
   core,
}: {
   instance: string;
   workspace: string;
   branch: string;
   testConfigPath: string;
   group: string;
   isAll: boolean;
   printOutput: boolean;
   core: any;
}) {
   intro('☣️   Starting up the testing...');

   // 1. Get the current context.
   const { instanceConfig, workspaceConfig, branchConfig } = await resolveConfigs({
      cliContext: { instance, workspace, branch },
      core,
   });

   // 2. Get API groups (prompt or all)
   const groups = await chooseApiGroupOrAll({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
      workspace_id: workspaceConfig.id,
      branchLabel: branchConfig.label,
      promptUser: !isAll && !group,
      groupName: group,
      all: isAll,
   });

   // Take the core implementation for test running:
   // for now testconfig has to exist on the machine prior to running the tests.
   const testConfig = await loadTestConfig(testConfigPath);
   const s = spinner();
   s.start('Running tests based on the provided spec');
   const testResults = await core.runTests({
      context: {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
      },
      groups: groups,
      testConfig,
   });
   s.stop();

   // Write output to fs and present the summary table
   const now = new Date();
   const ts = now.toISOString().replace(/[:.]/g, '-');
   const testFileName = `test-results-${ts}.json`;

   for (const outcome of testResults) {
      const apiGroupTestPath = replacePlaceholders(instanceConfig.test.output, {
         '@': await findProjectRoot(),
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
         api_group_normalized_name: normalizeApiGroupName(outcome.group.name),
      });

      await mkdir(apiGroupTestPath, { recursive: true });
      await writeFile(
         `${apiGroupTestPath}/${testFileName}`,
         JSON.stringify(outcome.results, null, 2)
      );

      log.step(
         `Tests for ${outcome.group.name} completed. Results -> ${apiGroupTestPath}/${testFileName}`
      );
      printTestSummary(outcome.results);
      printOutputDir(printOutput, apiGroupTestPath);
   }
}

export { runTest };