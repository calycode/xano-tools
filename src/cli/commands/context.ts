import { select, intro, outro, log } from '@clack/prompts';
import { withErrorHandler, addFullContextOptions } from '../utils/index';

// [ ] CLI
// [ ] TODO: refactor same as the setup command was. (main method to come from core + selection wizard be here)
// So we need a async function contextSwitchWizard(core) {}
// This context switch wizard would be the implementation of the cli selection. But the main save method should come from the core class!

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
async function switchContextWizard(
   { instance: cliInstance, workspace: cliWorkspace, branch: cliBranch },
   core
) {
   intro('🔄 Switch Xano Context');
   const config = await core.loadGlobalConfig();

   // 1. Select instance
   const instance = await selectOrValidate({
      cliValue: cliInstance,
      options: config.instances.map((i) => ({ value: i, label: i })),
      prompt: 'Select an instance:',
   });

   // 2. Select workspace
   let instanceConfig;
   try {
      instanceConfig = await core.loadInstanceConfig(instance);
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

   await core.switchContext(instance, workspace, branch);

   outro(
      `✅ Now using instance "${instance}", workspace "${
         wsObj ? wsObj.name : workspace
      }", branch "${branchObj ? branchObj.label : branch}".`
   );
}

// [ ] CLI
function registerSwitchContextCommand(program, core) {
   const cmd = program.command('switch-context').description('Switch instance/workspace context');
   addFullContextOptions(cmd);
   cmd.action(
      withErrorHandler(async (opts) => {
         if (opts.instance && opts.workspace && opts.branch) {
            await core.switchContext(opts.instance, opts.workspace, opts.branch);
         } else {
            await switchContextWizard(opts, core);
         }
      })
   );
}

// [ ] CLI
function registerCurrentContextCommand(program, core) {
   program.command('current-context').action(async () => {
      const currentContext = await core.getCurrentContextConfig();
      log.info(`Current context: ${JSON.stringify(currentContext, null, 2)}`);
   });
}

export { registerSwitchContextCommand, registerCurrentContextCommand };
