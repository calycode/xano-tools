import {
   addApiGroupOptions,
   addFullContextOptions,
   addPrintOutputFlag,
   withErrorHandler,
} from '../../utils';
import { hideFromRootHelp } from '../../utils/commands/main-program-utils';
import { generateCodeFromOas } from './implementation/codegen';
import { generateInternalDocs } from './implementation/internal-docs';
import { updateOasWizard } from './implementation/oas-spec';
import { generateRepo } from './implementation/repo';
import { generateXanoscriptRepo } from './implementation/xanoscript';

function registerGenerateCommands(program, core) {
   const generateNamespace = program
      .command('generate')
      .summary('Generate code, specs, docs and repos from Xano')
      .description(
         'Transformative operations that let you view your Xano through a fresh set of eyes.'
      );

   // Codegen command
   const codeGenCommand = generateNamespace
      .command('codegen')
      .summary('Create a client library from the OpenAPI spec')
      .description(
         'Create a client library from the OpenAPI specification. If the spec has not been generated yet, it is produced as the first step. Supports all OpenAPI Generator clients plus Orval clients (as orval-<client>).',
      );

   addFullContextOptions(codeGenCommand);
   addApiGroupOptions(codeGenCommand);
   addPrintOutputFlag(codeGenCommand);

   codeGenCommand
      .option(
         '--generator <generator>',
         'Generator to use (default: typescript-fetch). If omitted in an interactive terminal you will be prompted to pick one. See all options at: https://openapi-generator.tech/docs/generators or the full list of orval clients. To use orval client, write the generator as this: orval-<orval-client>.'
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
         withErrorHandler(async (passthroughArgs, opts) => {
            const stack: { generator?: string; args: string[] } = {
               generator: opts.generator,
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
      .summary('Generate an internal documentation suite')
      .description(
         'Collect all descriptions and internal documentation from a Xano instance and combine them into a documentation suite that can be hosted on static hosting.',
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
      .summary('Generate OpenAPI spec(s)')
      .description(
         'Update and generate OpenAPI spec(s) for the current context, or all API groups at once. Fetches the API definition directly from the Xano instance via the metadata API (there is no local-input mode). Produces an opinionated API reference powered by Scalar and upgrades the docs to OAS 3.1+.',
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
      .summary('Process the workspace into a browsable repo')
      .description(
         'Process a Xano workspace into a repo structure using the export-schema metadata API, enriched with XanoScripts after Xano 2.0. Fetches from the instance by default; pass --input to use a local schema file instead.',
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

   // Generate xanoscript command - hidden from root help but visible in `generate --help`
   const xanoscriptGenCommand = hideFromRootHelp(
      generateNamespace
         .command('xanoscript')
         .summary('Generate XanoScript repo (prefer the Xano VS Code extension)')
         .description(
            'Process a Xano workspace into XanoScript files. Supports tables, functions and APIs. The Xano VS Code extension is the preferred solution over this command. These outputs are also included in the default repo generation command.',
         ),
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
      }),
   );
}

export { registerGenerateCommands };
