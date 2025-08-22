import { select, intro, outro, log } from '@clack/prompts';
import { loadGlobalConfig, saveGlobalConfig, loadInstanceConfig } from '../../config/loaders';
import { getCurrentContextConfig, withErrorHandler, addFullContextOptions } from '../../utils/index';

// [ ] CLI
/**
 * Helper to select or validate an option from a list
 */
async function selectOrValidate({
   cliValue,
   options,
   valueKey = 'value',
   labelKey = 'label',
   prompt,
}) {
   if (cliValue) {
      const found = options.find((opt) => opt[valueKey] == cliValue || opt[labelKey] === cliValue);
      if (found) return found[valueKey];
      log.error(`"${cliValue}" not found. Options: ${options.map((o) => o[labelKey]).join(', ')}`);
      outro();
      throw new Error('Selection failed');
   }
   if (!options.length) {
      log.error(`No options available for ${prompt}.`);
      outro();
      throw new Error('Selection failed');
   }
   return await select({
      message: prompt,
      options: options.map((opt) => ({ value: opt[valueKey], label: opt[labelKey] })),
   });
}

// [ ] CORE, needs fs
async function switchContextPrompt({
   instance: cliInstance,
   workspace: cliWorkspace,
   branch: cliBranch,
}) {
   intro('🔄 Switch Xano Context');
   const config = loadGlobalConfig();

   // 1. Select instance
   const instance = await selectOrValidate({
      cliValue: cliInstance,
      options: config.instances.map((i) => ({ value: i, label: i })),
      prompt: 'Select an instance:',
   });

   // 2. Select workspace
   let instanceConfig;
   try {
      instanceConfig = loadInstanceConfig(instance);
   } catch {
      log.error(`Instance "${instance}" not found.`);
      outro();
      return;
   }
   const workspaces = Array.isArray(instanceConfig.workspaces) ? instanceConfig.workspaces : [];
   const workspace = await selectOrValidate({
      cliValue: cliWorkspace,
      options: workspaces.map((ws) => ({ value: ws.id, label: ws.name })),
      prompt: `Select a workspace for "${instance}":`,
   });
   const wsObj = workspaces.find((ws) => ws.id == workspace);

   // 3. Select branch
   const branches = wsObj && Array.isArray(wsObj.branches) ? wsObj.branches : [];
   const branch = await selectOrValidate({
      cliValue: cliBranch,
      options: branches.map((b) => ({
         value: b.label,
         label: b.label + (b.live ? ' (live)' : '') + (b.backup ? ' (backup)' : ''),
      })),
      prompt: `Select a branch for workspace "${wsObj?.name}":`,
   });
   const branchObj = branches.find((b) => b.label === branch);

   // 4. Save and confirm
   config.currentContext = { instance, workspace, branch };
   saveGlobalConfig(config);

   outro(
      `✅ Now using instance "${instance}", workspace "${
         wsObj ? wsObj.name : workspace
      }", branch "${branchObj ? branchObj.label : branch}".`
   );
}

// [ ] CLI
function registerSwitchContextCommand(program) {
   const cmd = program.command('switch-context').description('Switch instance/workspace context');
   addFullContextOptions(cmd);
   cmd.action(
      withErrorHandler(async (opts) => {
         await switchContextPrompt(opts);
      })
   );
}

// [ ] CLI
function registerCurrentContextCommand(program) {
   program.command('current-context').action(() => {
      const currentContext = getCurrentContextConfig();
      log.info(`Current context: ${JSON.stringify(currentContext, null, 2)}`);
   });
}

export { registerSwitchContextCommand, registerCurrentContextCommand };
