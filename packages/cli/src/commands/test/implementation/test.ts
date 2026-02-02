import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { intro, log, spinner, outro } from '@clack/prompts';
import { normalizeApiGroupName, replacePlaceholders } from '@repo/utils';
import {
   chooseApiGroupOrAll,
   findProjectRoot,
   printOutputDir,
   resolveConfigs,
} from '../../../utils/index';

/**
 *
 * @param cliEnvVars - object of CLI provided env vars (e.g., {DEMO_ADMIN_PWD: 'xyz'})
 * @returns flat object with keys as-is, to be used with {{ENVIRONMENT.KEY}} template pattern
 */
function collectInitialRuntimeValues(cliEnvVars = {}) {
   // 1. Collect process.env XANO_* vars (Node only)
   const envVars = {};
   for (const [k, v] of Object.entries(process.env)) {
      if (k.startsWith('XANO_')) envVars[k] = v;
   }

   // 2. Merge CLI over ENV, CLI wins
   const merged = { ...envVars, ...cliEnvVars };

   return merged;
}

/**
 * Prints a formatted summary table of test outcomes to the log.
 *
 * The table includes columns for status, HTTP method, path, warnings count, and duration (ms),
 * followed by an aggregate summary line with total, passed, failed, and total duration.
 *
 * @param results - Array of test result objects. Each object should include:
 *   - `success`: whether the test passed
 *   - `method`: HTTP method used for the test
 *   - `path`: endpoint path exercised by the test
 *   - `duration` (optional): duration of the test in milliseconds
 *   - `warnings` (optional): array of warning objects; each warning should include `key` and `message`
 * @returns Summary stats: { total, passed, failed, warnings }
 */
function printTestSummary(results): { total: number; passed: number; failed: number; warnings: number } {
   // Collect all rows for sizing
   const rows = results.map((r) => {
      const status = r.success ? '✅' : '❌';
      const method = r.method || '';
      const path = r.path || '';
      const warningsCount = r.warnings && Array.isArray(r.warnings) ? r.warnings.length : 0;
      const duration = (r.duration || 0).toString();
      return { status, method, path, warnings: warningsCount.toString(), duration, warningsCount };
   });

   // Calculate max width for each column (including header)
   const headers = {
      status: 'Status',
      method: 'Method',
      path: 'Path',
      warnings: 'Warnings',
      duration: 'Duration (ms)',
   };

   const colWidths = {
      status: Math.max(headers.status.length, ...rows.map((r) => r.status.length)),
      method: Math.max(headers.method.length, ...rows.map((r) => r.method.length)),
      path: Math.max(headers.path.length, ...rows.map((r) => r.path.length)),
      warnings: Math.max(headers.warnings.length, ...rows.map((r) => r.warnings.length)),
      duration: Math.max(headers.duration.length, ...rows.map((r) => r.duration.length)),
   };

   // Helper to pad cell
   const pad = (str, len) => str.padEnd(len);

   const sepLine = '-'.repeat(
      colWidths.status +
         colWidths.method +
         colWidths.path +
         colWidths.warnings +
         colWidths.duration +
         13
   );

   // Header
   log.message(`${'='.repeat(sepLine.length)}
 Test Results Summary
 ${sepLine}
 ${pad(headers.status, colWidths.status)} | ${pad(headers.method, colWidths.method)} | ${pad(
      headers.path,
      colWidths.path
   )} | ${pad(headers.warnings, colWidths.warnings)} | ${pad(headers.duration, colWidths.duration)}
 ${sepLine}`);

   // Rows
   for (const r of rows) {
      log.message(
         `${pad(r.status, colWidths.status)} | ${pad(r.method, colWidths.method)} | ${pad(
            r.path,
            colWidths.path
         )} | ${pad(r.warnings, colWidths.warnings)} | ${pad(r.duration, colWidths.duration)}`
      );
   }

   // Summary
   const total = results.length;
   const succeeded = results.filter((r) => r.success).length;
   const failed = total - succeeded;
   const totalWarnings = rows.reduce((sum, r) => sum + r.warningsCount, 0);
   const totalDuration = results.reduce((sum, r) => sum + (r.duration || 0), 0);

   log.message(
      `${sepLine}
 Total: ${total} | Passed: ${succeeded} | Failed: ${failed} | Warnings: ${totalWarnings} | Duration: ${totalDuration} ms
 ${sepLine}`
   );

   // Print out the warnings list:
   const testsWithWarnings = results.filter((r) => r.warnings && r.warnings.length > 0);
   if (testsWithWarnings.length > 0) {
      log.message('\nWarnings details:');
      for (const r of testsWithWarnings) {
         log.message(`- ${r.method} ${r.path}:`);
         for (const warn of r.warnings) {
            log.message(`    [${warn.key}] ${warn.message}`);
         }
      }
   }

   return { total, passed: succeeded, failed, warnings: totalWarnings };
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
 * Run API tests for selected API groups, write per-group JSON results to disk, and print a formatted summary.
 *
 * Resolves the target instance/workspace/branch, selects API groups (optionally prompting), loads the test
 * configuration, executes tests via the provided runtime `core`, writes each group's results to a timestamped
 * JSON file under the configured output path, and prints a summary table and optional output directory path.
 *
 * @param instance - Target instance name or alias used to resolve configuration
 * @param workspace - Workspace name within the instance
 * @param branch - Branch label within the workspace
 * @param group - Specific API group name to run; when omitted and `isAll` is false the user may be prompted
 * @param testConfigPath - Filesystem path to the test configuration file (supported: .json, .js, .ts)
 * @param isAll - If true, run tests for all API groups without prompting
 * @param printOutput - If true, display the output directory path after writing results
 * @param core - Runtime provider exposing `loadToken` and `runTests` used to execute tests and load credentials
 * @param ciMode - If true, exit with non-zero code on test failures
 * @param failOnWarnings - If true (and ciMode), also fail on warnings
 * @returns Exit code: 0 for success, 1 for failures
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
   cliTestEnvVars,
   ciMode = false,
   failOnWarnings = false,
}: {
   instance: string;
   workspace: string;
   branch: string;
   testConfigPath: string;
   group: string;
   isAll: boolean;
   printOutput: boolean;
   core: any;
   cliTestEnvVars: any;
   ciMode?: boolean;
   failOnWarnings?: boolean;
}): Promise<number> {
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

   // Collect env vars to set up
   const initialRuntimeValues = collectInitialRuntimeValues(cliTestEnvVars);

   // Run tests
   const testResults = await core.runTests({
      context: {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
      },
      groups: groups,
      testConfig,
      initialRuntimeValues,
   });
   s.stop();

   // Write output to fs and present the summary table
   const now = new Date();
   const ts = now.toISOString().replace(/[:.]/g, '-');
   const testFileName = `test-results-${ts}.json`;

   // Aggregate stats across all groups
   let totalTests = 0;
   let totalPassed = 0;
   let totalFailed = 0;
   let totalWarnings = 0;

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
      const stats = printTestSummary(outcome.results);
      totalTests += stats.total;
      totalPassed += stats.passed;
      totalFailed += stats.failed;
      totalWarnings += stats.warnings;
      printOutputDir(printOutput, apiGroupTestPath);
   }

   // CI mode: determine exit code
   if (ciMode) {
      const hasFailures = totalFailed > 0;
      const hasWarnings = failOnWarnings && totalWarnings > 0;
      
      if (hasFailures || hasWarnings) {
         const reasons = [];
         if (hasFailures) reasons.push(`${totalFailed} test(s) failed`);
         if (hasWarnings) reasons.push(`${totalWarnings} warning(s)`);
         
         outro(`❌ Tests failed: ${reasons.join(', ')}`);
         log.error(`\nCI mode: Exiting with code 1 due to ${reasons.join(' and ')}`);
         process.exit(1);
      } else {
         outro(`✅ All ${totalPassed} tests passed!`);
      }
   }

   return totalFailed > 0 ? 1 : 0;
}

export { runTest };
