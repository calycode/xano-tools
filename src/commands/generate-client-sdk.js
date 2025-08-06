import { log, outro, intro, spinner } from '@clack/prompts';
import { loadGlobalConfig, loadToken } from '../config/loaders.js';
import { getCurrentContextConfig } from '../utils/context/index.js';
import { metaApiGet } from '../utils/metadata/api-helper.js';
import { replacePlaceholders } from '../features/tests/utils/replacePlaceholders.js';
import { normalizeApiGroupName } from '../utils/normalizeApiGroupName.js';
import { chooseApiGroupOrAll } from '../utils/api-group-selection/index.js';
import { doOasUpdate } from '../features/oas/update/index.js';
import { runOpenApiGenerator } from '../features/oas/client-sdk/open-api-generator.js';
import { withErrorHandler } from '../utils/commander/with-error-handler.js';

async function generateClientSdk(
   instance,
   workspace,
   branch,
   group,
   isAll = false,
   stack = {
      generator: 'typescript-fetch',
      args: ['--additional-properties=supportsES6=true'],
   },
   logger = false
) {
   intro('🔄 Starting to generate client SDK');

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

   // Determine generator and extra args
   const generator = stack.generator || 'typescript-fetch';
   const additionalArgs = stack.args || [];

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
      all: !!isAll,
   });

   // 3. For each group selected, regenerate OpenAPI spec
   for (const group of groups) {
      const apiGroupNameNorm = normalizeApiGroupName(group.name);
      const outputPath = replacePlaceholders(instanceConfig.openApiSpec.output, {
         instance: instanceConfig.name,
         workspace: workspaceConfig.name,
         branch: branchConfig.label,
         api_group_normalized_name: apiGroupNameNorm,
      });

      const openapiRaw = await metaApiGet({
         baseUrl: instanceConfig.url,
         token: loadToken(instanceConfig.name),
         path: `/workspace/${workspaceConfig.id}/apigroup/${group.id}/openapi`,
      });

      // Prepare for better usability
      await doOasUpdate(openapiRaw, outputPath);

      const s = spinner();
      try {
         s.start(`Generating client SDK for group "${group.name}" with generator "${generator}"`);
         await runOpenApiGenerator({
            input: `${outputPath}/spec.json`,
            output: `${outputPath}/client-sdk/${generator}`,
            generator,
            additionalArgs,
            logger,
         });
         s.stop(
            `Client SDK generated for group "${group.name}" → ${outputPath}/client-sdk/${generator}`
         );
      } catch (err) {
         log.error(err.message);
      }
   }

   outro('All client SDKs generated!');
}

function registerGenerateCodeCommand(program) {
   program
      .command('generate-code')
      .description(
         'Create a library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step.'
      )
      .option('--instance <instance>')
      .option('--workspace <workspace>')
      .option('--branch <branch>')
      .option('--group <name>', 'API group to update')
      .option('--all', 'Regenerate for all API groups in workspace/branch')
      .option(
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
            const stack = {};
            if (opts.generator) {
               stack.generator = opts.generator;
            }
            if (opts.args) {
               stack.args = opts.args.split(',');
            }
            await generateClientSdk(
               opts.instance,
               opts.workspace,
               opts.branch,
               opts.group,
               opts.all,
               stack,
               opts.debug
            );
         })
      );
}

export { registerGenerateCodeCommand };
