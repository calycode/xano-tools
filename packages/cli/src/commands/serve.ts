import { spawn } from 'node:child_process';
import { normalizeApiGroupName, replacePlaceholders } from '@repo/utils';
import {
   addApiGroupOptions,
   addFullContextOptions,
   chooseApiGroupOrAll,
   findProjectRoot,
   resolveConfigs,
} from '../utils/index';

async function serveOas({ instance, workspace, branch, group, listen = 5999, cors = false, core }) {
   const { instanceConfig, workspaceConfig, branchConfig } = await resolveConfigs({
      cliContext: { instance, workspace, branch },
      core,
   });

   const apiGroups = await chooseApiGroupOrAll({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
      workspace_id: workspaceConfig.id,
      branchLabel: branchConfig.label,
      promptUser: !group,
      groupName: group,
      all: false,
   });

   const currentApiGroup = apiGroups[0];
   const apiGroupNameNorm = normalizeApiGroupName(currentApiGroup.name);

   const specBasePath = replacePlaceholders(instanceConfig.openApiSpec.output, {
      '@': await findProjectRoot(),
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
      api_group_normalized_name: apiGroupNameNorm,
   });

   const specHtmlPath = `${specBasePath}/html`;

   return new Promise<void>((resolve, reject) => {
      const serveArgs = ['-l', String(listen)];
      if (cors) String(serveArgs.push('-C'));

      const cliArgs: string[] = ['serve', specHtmlPath, ...serveArgs];

      const oasProc = spawn('npx', cliArgs, { stdio: 'inherit', shell: true });

      oasProc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            reject(new Error(`serve exited with code ${code}`));
         }
         oasProc.on('error', (err) => {
            reject(new Error(`Failed to start serve: ${err.message}`));
         });
      });
   });
}

function serveRegistry({ root = 'registry', listen = 5000, cors = false }) {
   return new Promise<void>((resolve, reject) => {
      const serveArgs = [String(root), '-l', String(listen)];
      if (cors) serveArgs.push('-C');

      const cliArgs = ['serve', ...serveArgs];

      const proc = spawn('npx', cliArgs, { stdio: 'inherit', shell: true });

      proc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            reject(new Error(`serve exited with code ${code}`));
         }
      });
      proc.on('error', (err) => {
         reject(new Error(`Failed to start serve: ${err.message}`));
      });
   });
}

function registerRegistryServeCommand(program) {
   program
      .command('serve-registry')
      .description(
         'Serve the registry locally. This allows you to actually use your registry without deploying it.'
      )
      .option('--root <path>', 'Where did you put your registry?')
      .option(
         '--listen <port>',
         'The port where you want your registry to be served locally. By default it is 5000.'
      )
      .option('--cors', 'Do you want to enable CORS? By default false.')
      .action((options) => {
         serveRegistry({
            root: options.root,
            listen: options.listen,
            cors: options.cors,
         });
      });
}

function registerOasServeCommand(program, core) {
   const cmd = program
      .command('serve-oas')
      .description('Serve the Open API specification locally for quick visual check.');
   addFullContextOptions(cmd);
   addApiGroupOptions(cmd);
   cmd.option(
      '--listen <port>',
      'The port where you want your registry to be served locally. By default it is 5000.'
   )
      .option('--cors', 'Do you want to enable CORS? By default false.')
      .action((options) => {
         serveOas({
            instance: options.instance,
            workspace: options.workspace,
            branch: options.branch,
            group: options.group,
            listen: options.listen,
            cors: options.cors,
            core,
         });
      });
}

export { registerRegistryServeCommand, registerOasServeCommand };
