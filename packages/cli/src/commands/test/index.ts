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
         'Run an API test suite via the OpenAPI spec. To execute this command a specification is required. Find the schema here: https://calycode.com/schemas/testing/config.json '
      );

   addFullContextOptions(runTestsCommand);
   addApiGroupOptions(runTestsCommand);
   addPrintOutputFlag(runTestsCommand);

   runTestsCommand
      .option('--test-config-path <path>', 'Local path to the test configuration file.')
      .option(
         '--test-env <keyValue...>',
         'Inject environment variables (KEY=VALUE) for tests. Can be repeated to set multiple.'
      )
      .action(
         withErrorHandler(async (options) => {
            const cliTestEnvVars = {};
            for (const arg of options.testEnv) {
               const [key, ...rest] = arg.split('=');
               if (key && rest.length > 0) {
                  cliTestEnvVars[key] = rest.join('=');
               }
            }

            await runTest({
               ...options,
               isAll: options.all,
               printOutput: options.printOutputDir,
               core,
               cliTestEnvVars,
            });
         })
      );
}

export { registerTestCommands };
