import {
   addApiGroupOptions,
   addFullContextOptions,
   addPrintOutputFlag,
   withErrorHandler,
} from '../../utils';
import { generateCodeFromOas } from './implementation/codegen';
import { generateInternalDocs } from './implementation/internal-docs';
import { updateOasWizard } from './implementation/oas-spec';
import { generateRepo } from './implementation/repo';
import { generateXanoscriptRepo } from './implementation/xanoscript';

function registerGenerateCommands(program, core) {
   const generateNamespace = program
      .command('generate')
      .description(
         'Transforamtive operations that allow you to view you Xano through a fresh set of eyes.'
      );

   // Codegen command
   const codeGenCommand = generateNamespace
      .command('codegen')
      .description(
         'Create a library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step. Supports **all** openapi tools generators + orval clients.'
      );

   addFullContextOptions(codeGenCommand);
   addApiGroupOptions(codeGenCommand);
   addPrintOutputFlag(codeGenCommand);

   codeGenCommand
      .option(
         '--generator <generator>',
         'Generator to use, see all options at: https://openapi-generator.tech/docs/generators or the full list of orval clients. To use orval client, write the generator as this: orval-<orval-client>.'
      )
      .option(
         '--debug',
         'Specify this flag in order to allow logging. Logs will appear in output/_logs. Default: false'
      )
      .allowUnknownOption()
      .argument(
         '[passthroughArgs...]',
         'Additional arguments to pass to the generator. For options for each generator see https://openapi-generator.tech/docs/usage#generate this also accepts Orval additional arguments e.g. --mock etc. See Orval docs as well: https://orval.dev/reference/configuration/full-example'
      )
      .action(
         withErrorHandler(async (opts, passthroughArgs) => {
            const stack: { generator: string; args: string[] } = {
               generator: opts.generator || 'typescript-fetch',
               args: passthroughArgs || [],
            };
            await generateCodeFromOas({
               instance: opts.instance,
               workspace: opts.workspace,
               branch: opts.branch,
               group: opts.group,
               isAll: opts.all,
               stack: stack,
               logger: opts.debug,
               printOutput: opts.printOutputDir,
               core: core,
            });
         })
      );

   // Internal doc generation command
   const internalDocsGenCommand = generateNamespace
      .command('docs')
      .description(
         'Collect all descriptions, and internal documentation from a Xano instance and combine it into a nice documentation suite that can be hosted on a static hosting.'
      )
      .option('-I, --input <file>', 'Workspace schema file (.yaml [legacy] or .json) from a local source, if present.')
      .option(
         '-O, --output <dir>',
         'Output directory (overrides default config), useful when ran from a CI/CD pipeline and want to ensure consistent output location.'
      );

   addFullContextOptions(internalDocsGenCommand);
   addPrintOutputFlag(internalDocsGenCommand);

   internalDocsGenCommand
      .option(
         '-F, --fetch',
         'Forces fetching the workspace schema from the Xano instance via metadata API.'
      )
      .action(
         withErrorHandler(async (opts) => {
            await generateInternalDocs({
               instance: opts.instance,
               workspace: opts.workspace,
               branch: opts.branch,
               input: opts.input,
               output: opts.output,
               fetch: opts.fetch,
               printOutput: opts.printOutputDir,
               core: core,
            });
         })
      );

   // OpenAPI sepc generation command
   const specGenCommand = generateNamespace
      .command('spec')
      .description(
         'Update and generate OpenAPI spec(s) for the current context, or all API groups simultaneously. This generates an opinionated API documentation powered by Scalar API Reference. + this command brings the Swagger docs to OAS 3.1+ version.'
      );

   addFullContextOptions(specGenCommand);
   addApiGroupOptions(specGenCommand);
   addPrintOutputFlag(specGenCommand);

   specGenCommand.option(
      '--include-tables',
      'Requests table schema fetching and inclusion into the generate spec. By default tables are not included.'
   );

   specGenCommand.action(
      withErrorHandler(async (opts) => {
         await updateOasWizard({
            instance: opts.instance,
            workspace: opts.workspace,
            branch: opts.branch,
            group: opts.group,
            isAll: opts.all,
            printOutput: opts.printOutputDir,
            core: core,
            includeTables: opts.includeTables,
         });
      })
   );

   // Generate repo comman
   const repoGenCommand = generateNamespace
      .command('repo')
      .description(
         'Process Xano workspace into repo structure. We use the export-schema metadata API to offer the full details. However that is enriched with the Xanoscripts after Xano 2.0 release.'
      )
      .option(
         '-I, --input <file>',
         'Workspace schema file (.yaml [legacy] or .json) from a local source, if present.'
      )
      .option(
         '-O, --output <dir>',
         'Output directory (overrides default config), useful when ran from a CI/CD pipeline and want to ensure consistent output location.'
      );

   addFullContextOptions(repoGenCommand);
   addPrintOutputFlag(repoGenCommand);

   repoGenCommand
      .option(
         '-F, --fetch',
         'Forces fetching the workspace schema from the Xano instance via metadata API.'
      )
      .action(
         withErrorHandler(async (opts) => {
            await generateRepo({
               instance: opts.instance,
               workspace: opts.workspace,
               branch: opts.branch,
               input: opts.input,
               output: opts.output,
               fetch: opts.fetch,
               printOutput: opts.printOutputDir,
               core: core,
            });
         })
      );

   // Generate xanoscript command
   const xanoscriptGenCommand = generateNamespace
      .command('xanoscript')
      .description(
         'Process Xano workspace into repo structure. Supports table, function and apis as of know. Xano VSCode extension is the preferred solution over this command. Outputs of this process are also included in the default repo generation command.'
      );

   addFullContextOptions(xanoscriptGenCommand);
   addPrintOutputFlag(xanoscriptGenCommand);

   xanoscriptGenCommand.action(
      withErrorHandler(async (opts) => {
         await generateXanoscriptRepo({
            instance: opts.instance,
            workspace: opts.workspace,
            branch: opts.branch,
            core: core,
            printOutput: opts.printOutputDir,
         });
      })
   );
}

export { registerGenerateCommands };
