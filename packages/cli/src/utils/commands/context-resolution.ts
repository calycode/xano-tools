import { select, text } from '@clack/prompts';
import {
   Context,
   WorkspaceConfig,
   BranchConfig,
   ApiGroupConfig,
   CoreContext,
} from '@calycode/types';

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
   core: { storage: any };
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

   // 4. Now derive the correct configs for the fully resolved context
   // (use the pattern from getCurrentContextConfigImplementation)
   // Ensure all configs are correct for the *final* context
   let finalWorkspaceConfig: WorkspaceConfig | null = null;
   let finalBranchConfig: BranchConfig | null = null;
   let finalApiGroupConfig: ApiGroupConfig | null = null;

   // Instance config is always mergedConfig/instanceConfig
   // Extract workspace config
   if (instanceConfig?.workspaces) {
      finalWorkspaceConfig =
         instanceConfig.workspaces.find(
            (ws: any) =>
               String(ws.id) === String(context.workspace) || ws.name === context.workspace
         ) ?? null;
   }
   // Extract branch config
   if (finalWorkspaceConfig?.branches) {
      finalBranchConfig =
         finalWorkspaceConfig.branches.find(
            (b: any) => b.label === context.branch || String(b.id) === String(context.branch)
         ) ?? null;
   }
   // Extract apigroup config
   if (finalWorkspaceConfig?.apigroups && context.apigroup) {
      finalApiGroupConfig =
         finalWorkspaceConfig.apigroups.find(
            (g: any) => String(g.id) === String(context.apigroup) || g.name === context.apigroup
         ) ?? null;
   }

   return {
      context,
      instanceConfig,
      workspaceConfig: finalWorkspaceConfig,
      branchConfig: finalBranchConfig,
      apigroupConfig: finalApiGroupConfig,
      mergedConfig,
      foundLevels,
   };
}

export { resolveConfigs };
