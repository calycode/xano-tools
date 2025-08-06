import { select, intro, outro, log, spinner } from '@clack/prompts';
import { loadGlobalConfig, saveGlobalConfig, loadInstanceConfig } from '../config/loaders.js';
import { getCurrentContextConfig } from '../utils/context/index.js';
import { withErrorHandler } from '../utils/commander/with-error-handler.js';

async function switchContextPrompt({
   instance: cliInstance,
   workspace: cliWorkspace,
   branch: cliBranch,
}) {
   intro('🔄 Switch Xano Context');
   const config = loadGlobalConfig();

   // 1. Select instance
   let instance = cliInstance;
   if (!instance || !config.instances.includes(instance)) {
      if (!config.instances.length) {
         log.error('No instances configured. Run setup-instance first.');
         outro();
         return;
      }
      instance = await select({
         message: 'Select an instance:',
         options: config.instances.map((i) => ({ value: i, label: i })),
      });
   }

   // 2. Select workspace
   let workspace = cliWorkspace;
   let instanceConfig;
   try {
      instanceConfig = loadInstanceConfig(instance);
   } catch (e) {
      log.error(`Instance "${instance}" not found.`);
      outro();
      return;
   }
   const workspaces = Array.isArray(instanceConfig.workspaces) ? instanceConfig.workspaces : [];
   let wsObj = null;

   if (workspace) {
      wsObj = workspaces.find((ws) => ws.id == workspace || ws.name === workspace);
      if (wsObj) {
         workspace = wsObj.id;
      } else {
         log.error(`Workspace "${workspace}" not found in "${instance}".`);
         outro();
         return;
      }
   } else {
      if (!workspaces.length) {
         log.error(`No workspaces found in "${instance}". Try setup-instance again.`);
         outro();
         return;
      }
      workspace = await select({
         message: `Select a workspace for "${instance}":`,
         options: workspaces.map((ws) => ({
            value: ws.id,
            label: ws.name,
         })),
      });
      wsObj = workspaces.find((ws) => ws.id == workspace);
   }

   // 3. Select branch
   let branch = cliBranch;
   const branches = wsObj && Array.isArray(wsObj.branches) ? wsObj.branches : [];
   let branchObj = null;

   if (branch) {
      branchObj = branches.find((b) => b.label === branch);
      if (!branchObj) {
         log.error(
            `Branch "${branch}" not found in workspace "${wsObj ? wsObj.name : workspace}".`
         );
         outro();
         return;
      }
   } else {
      if (!branches.length) {
         log.error(`No branches found in workspace "${wsObj ? wsObj.name : workspace}".`);
         outro();
         return;
      }
      branch = await select({
         message: `Select a branch for workspace "${wsObj.name}":`,
         options: branches.map((b) => ({
            value: b.label,
            label: b.label + (b.live ? ' (live)' : '') + (b.backup ? ' (backup)' : ''),
         })),
      });
      branchObj = branches.find((b) => b.label === branch);
   }

   // 4. Save and confirm
   const s = spinner();
   s.start('Switching context...');
   config.currentContext = { instance, workspace, branch };
   saveGlobalConfig(config);
   s.stop('Context switched!');
   outro(
      `✅ Now using instance "${instance}", workspace "${
         wsObj ? wsObj.name : workspace
      }", branch "${branchObj ? branchObj.label : branch}".`
   );
}

function registerSwitchContextCommand(program) {
   program
      .command('switch-context')
      .description('Switch instance/workspace context')
      .option('--instance <instance>', 'The name of your instance')
      .option('--workspace <workspace>', 'The name of your workspace')
      .action(
         withErrorHandler(async (opts) => {
            await switchContextPrompt(opts);
         })
      );
}

function registerCurrentContextCommand(program) {
   program.command('current-context').action(() => {
      const currentContext = getCurrentContextConfig();
      log.info(`Current context: ${JSON.stringify(currentContext)}`);
   });
}

export { registerSwitchContextCommand, registerCurrentContextCommand };
