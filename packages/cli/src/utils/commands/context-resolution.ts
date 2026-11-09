import { select, text } from '@clack/prompts';
import { Context, CoreContext } from '@repo/types';

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

/**
 * Resolves the effective context through Core's single resolution module.
 *
 * The config tree is read once: when a prompt is needed we re-derive from the
 * already-loaded inputs instead of walking the directory again. Resolution is
 * only performed here; precedence and validation live in Core's context module.
 */
async function resolveConfigs({
   cliContext = {},
   core,
   startDir = process.cwd(),
   requiredFields = ['instance', 'workspace', 'branch'],
   configFiles,
   interactive = true,
}: {
   cliContext?: Context;
   core: {
      loadContextInputs: (args: any) => Promise<any>;
      deriveContext: (args: any) => Promise<any>;
   };
   startDir?: string;
   requiredFields?: string[];
   configFiles?: string[];
   interactive?: boolean;
}) {
   // 1. Read the tree and global config once.
   const inputs = await core.loadContextInputs({ startDir, configFiles });

   // 2. Derive with flag precedence (explicit > nearest level > global).
   let resolution = await core.deriveContext({ inputs, context: cliContext });

   // 3. Prompt for missing context, re-deriving from the same inputs.
   const missing = resolution.missing(requiredFields);
   if (missing.length > 0 && interactive) {
      const userInput = await promptForContext(
         missing,
         resolution.context,
         resolution.instanceConfig ?? {}
      );
      resolution = await core.deriveContext({
         inputs,
         context: { ...resolution.context, ...userInput },
      });
   }

   const stillMissing = resolution.missing(requiredFields);
   if (stillMissing.length > 0) {
      throw new Error(`Missing context: ${stillMissing.join(', ')}`);
   }

   return {
      context: resolution.context,
      instanceConfig: resolution.instanceConfig,
      workspaceConfig: resolution.workspaceConfig,
      branchConfig: resolution.branchConfig,
      apigroupConfig: resolution.apigroupConfig,
      mergedConfig: inputs.mergedConfig,
      foundLevels: inputs.foundLevels,
   };
}

export { resolveConfigs };
