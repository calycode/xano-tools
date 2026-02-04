import {
   addApiGroupOptions,
   addFullContextOptions,
   addPrintOutputFlag,
   withErrorHandler,
} from '../../utils';
import { runTest } from './implementation/test';

function registerTestCommands(program, core) {
   const testNamespace = program
      .command('test')
      .description(
         'Set of test related operations for the Xano CLI, these help you build a reliable system.'
      );

   // Run tests command:
   const runTestsCommand = testNamespace
      .command('run')
      .description(
         'Run an API test suite. Requires a test config file (.json or .js). Schema: https://calycode.com/schemas/testing/config.json | Full guide: https://calycode.github.io/xano-tools/#/guides/testing'
      );

   addFullContextOptions(runTestsCommand);
   addApiGroupOptions(runTestsCommand);
   addPrintOutputFlag(runTestsCommand);

   runTestsCommand
      .option('-c, --config <path>', 'Path to the test configuration file (.json or .js).')
      .option(
         '-e, --env <keyValue...>',
         'Inject environment variables (KEY=VALUE) for tests. Repeatable.'
      )
      .option(
         '--ci',
         'CI mode: exit with code 1 if any tests fail. Use to block releases.'
      )
      .option(
         '--fail-on-warnings',
         'In CI mode, also fail if there are warnings (not just errors).'
      )
      .action(
         withErrorHandler(async (options) => {
            const cliTestEnvVars = {};
            const envArgs = options.env || [];
            for (const arg of envArgs) {
               const [key, ...rest] = arg.split('=');
               if (key && rest.length > 0) {
                  cliTestEnvVars[key] = rest.join('=');
               }
            }
            const configPath = options.config;

            const result = await runTest({
               ...options,
               testConfigPath: configPath,
               isAll: options.all,
               printOutput: options.printOutputDir,
               core,
               cliTestEnvVars,
               ciMode: options.ci || false,
               failOnWarnings: options.failOnWarnings || false,
            });

            // Return the exit code result for CI mode
            return result;
         })
      );
}

export { registerTestCommands };
