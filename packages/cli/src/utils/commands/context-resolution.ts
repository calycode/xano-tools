import { select, text } from '@clack/prompts';
import { Context, CoreContext, CurrentContextConfig } from '@repo/types';

async function promptForContext(
   missingFields: string[],
   knownContext: CoreContext,
   instanceConfig
) {
   const responses = {};
   // Ensure order: workspace before branch!
   const orderedFields = ['instance', 'workspace', 'branch', 'apigroup'].filter((f) =>
      missingFields.includes(f)
   );
   for (const field of orderedFields) {
      let choices = [];
      if (field === 'workspace' && instanceConfig.workspaces) {
         choices = instanceConfig.workspaces;
      } else if (field === 'branch' && instanceConfig.workspaces) {
         // Use most recent workspace selection
         const selectedWorkspaceId = responses['workspace'] ?? knownContext.workspace;
         // Workspace could be identified by id or label or name; adjust as needed:
         let workspace = instanceConfig.workspaces.find(
            (w) => w.id === selectedWorkspaceId || w.name === selectedWorkspaceId
         );
         choices = workspace?.branches || [];
      }
      if (choices.length > 0) {
         const selectedValue = await select({
            message: `Select ${field}:`,
            options: choices.map((c) => ({
               value: c.id ?? c.label,
               label: c.name ?? c.label,
            })),
         });
         // Store both id and label for later use
         responses[field] = selectedValue;
      } else {
         responses[field] = await text({ message: `Enter ${field}:` });
      }
   }
   return responses;
}

async function resolveConfigs({
   cliContext = {},
   core,
   startDir = process.cwd(),
   requiredFields = ['instance', 'workspace', 'branch'],
   configFiles = ['branch.config.json', 'workspace.config.json', 'instance.config.json'],
   interactive = true,
}: {
   cliContext?: Context;
   core: {
      storage: { loadMergedConfig: (startDir: string, configFiles?: string[]) => any };
      getCurrentContextConfig: (args: {
         startDir?: string;
         context: Context;
      }) => Promise<CurrentContextConfig>;
   };
   startDir?: string;
   requiredFields?: string[];
   configFiles?: string[];
   interactive?: boolean;
}) {
   // 1. Initial config load (for choices, etc.)
   let { mergedConfig, instanceConfig, foundLevels } = await core.storage.loadMergedConfig(
      startDir,
      configFiles
   );

   // 2. Determine current context (CLI > foundLevels > null)
   let context = {
      instance: cliContext.instance ?? foundLevels.instance ?? null,
      workspace: cliContext.workspace ?? foundLevels.workspace ?? null,
      branch: cliContext.branch ?? foundLevels.branch ?? null,
      apigroup: cliContext.apigroup ?? null,
   };

   // 3. Prompt for missing context
   const missing = requiredFields.filter((f) => !context[f]);
   if (missing.length > 0 && interactive) {
      const userInput = await promptForContext(missing, context, instanceConfig);
      context = { ...context, ...userInput };
   } else if (missing.length > 0 && !interactive) {
      throw new Error(`Missing context: ${missing.join(', ')}`);
   }

   // 4. Derive the configs for the fully resolved context through core, so the
   // workspace/branch/apigroup resolution lives in one place.
   const {
      instanceConfig: resolvedInstanceConfig,
      workspaceConfig,
      branchConfig,
      apigroupConfig,
   } = await core.getCurrentContextConfig({ context, startDir });

   return {
      context,
      instanceConfig: resolvedInstanceConfig ?? instanceConfig,
      workspaceConfig,
      branchConfig,
      apigroupConfig,
      mergedConfig,
      foundLevels,
   };
}

export { resolveConfigs };
