import { log, outro, intro, spinner } from '@clack/prompts';
import { metaApiGet, normalizeApiGroupName, replacePlaceholders, dirname } from '@calycode/utils';
import {
   addApiGroupOptions,
   addFullContextOptions,
   addPrintOutputFlag,
   chooseApiGroupOrAll,
   printOutputDir,
   withErrorHandler,
} from '../utils/index';
import { resolveEffectiveContext } from '../utils/commands/context-resolution';

import { runOpenApiGenerator } from '../features/code-gen/open-api-generator';

// [ ] CLI only feature
async function generateCodeFromOas({
   instance,
   workspace,
   branch,
   group,
   isAll = false,
   stack = {
      generator: 'typescript-fetch',
      args: ['--additional-properties=supportsES6=true'],
   },
   logger = false,
   printOutput = false,
   core,
}: {
   instance: string;
   workspace: string;
   branch: string;
   group: string;
   isAll: boolean;
   stack: { generator: string; args: string[] };
   logger: boolean;
   printOutput: boolean;
   core;
}) {
   const startTime: Date = new Date();
   intro('🔄 Starting to generate code');

   const resolvedContext = await resolveEffectiveContext({ instance, workspace, branch }, core);
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext(
      resolvedContext
   );
   // Determine generator and extra args
   const generator = stack.generator || 'typescript-fetch';
   const additionalArgs = stack.args || [];

   // 2. Get API groups (prompt or all)
   const groups = await chooseApiGroupOrAll({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
      workspace_id: workspaceConfig.id,
      branchLabel: branchConfig.label,
      promptUser: !isAll && !group,
      groupName: group,
      all: !!isAll,
   });

   // 3. For each group selected, regenerate OpenAPI spec
   for (const group of groups) {
      const s = spinner();
      s.start(`Generating code for group "${group.name}" with generator "${generator}"`);

      const apiGroupNameNorm = normalizeApiGroupName(group.name);
      const outputPath = replacePlaceholders(instanceConfig.openApiSpec.output, {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
         api_group_normalized_name: apiGroupNameNorm,
      });

      const openapiRaw = await metaApiGet({
         baseUrl: instanceConfig.url,
         token: await core.loadToken(instanceConfig.name),
         path: `/workspace/${workspaceConfig.id}/apigroup/${group.id}/openapi`,
      });

      // Prepare for better usability
      const { oas } = await core.doOasUpdate({
         inputOas: openapiRaw,
         outputDir: outputPath,
         instanceConfig,
         workspaceConfig,
         storage: core.storage,
      });

      // Create a temp file for the oas to reuse:
      await core.storage.mkdir(outputPath, { recursive: true });
      await core.storage.writeFile(`${outputPath}/spec.json`, JSON.stringify(oas, null, 2));

      try {
         await runOpenApiGenerator({
            input: `${outputPath}/spec.json`,
            output: `${outputPath}/codegen/${generator}`,
            generator,
            additionalArgs,
            logger,
         });
         s.stop(`Code generated for group "${group.name}" → ${outputPath}/codegen/${generator}`);
         printOutputDir(printOutput, outputPath);
      } catch (err) {
         s.stop();
         log.error(err.message);
      }
   }

   const endTime: Date = new Date();
   const duration: number = endTime.getTime() - startTime.getTime();
   outro(`Code successfully generated! Process took: ${duration}ms`);
}

function registerGenerateCodeCommand(program, core) {
   const cmd = program
      .command('generate-code')
      .description(
         'Create a library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step.'
      );

   addFullContextOptions(cmd);
   addApiGroupOptions(cmd);
   addPrintOutputFlag(cmd);

   cmd.option(
      '--generator <generator>',
      'Generator to use, see all options at: https://openapi-generator.tech/docs/generators'
   )
      .option(
         '--args <args>',
         'Additional arguments to pass to the generator. See https://openapi-generator.tech/docs/usage#generate'
      )
      .option(
         '--debug',
         'Specify this flag in order to allow logging. Logs will appear in output/_logs. Default: false'
      )
      .action(
         withErrorHandler(async (opts) => {
            const stack: { generator: string; args: string[] } = {
               generator: 'typescript-fetch',
               args: [],
            };
            if (opts.generator) {
               stack.generator = opts.generator;
            }
            if (opts.args) {
               stack.args = opts.args.split(',');
            }
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
}

export { registerGenerateCodeCommand };
