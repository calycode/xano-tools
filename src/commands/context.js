import { select, intro, outro, log, spinner } from '@clack/prompts';
import { loadGlobalConfig, saveGlobalConfig, loadInstanceConfig } from '../config/loaders.js';

async function switchContextPrompt({ instance: cliInstance, workspace: cliWorkspace }) {
   intro('🔄 Switch Xano Context');
   const config = loadGlobalConfig();

   // 1. Select instance if not provided
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

   // 2. Select workspace from that instance
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

   // Try to resolve CLI workspace input (by id or name)
   if (workspace) {
      let found = workspaces.find((ws) => ws.id == workspace || ws.name === workspace);
      if (found) {
         workspace = found.id;
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
   }

   // 3. Save and confirm
   const s = spinner();
   s.start('Switching context...');
   config.currentContext = { instance, workspace };
   saveGlobalConfig(config);
   s.stop('Context switched!');
   const wsObj = workspaces.find((ws) => ws.id == workspace);
   outro(`✅ Now using instance "${instance}" and workspace "${wsObj ? wsObj.name : workspace}".`);
}

export { switchContextPrompt };
