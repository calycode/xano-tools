import { intro, log } from '@clack/prompts';
import type { CoreContext } from '@repo/types';
import { getApiGroupByName, promptForComponents, scaffoldRegistry } from '../../../utils/index';
import { resolveConfigs } from '../../../utils/index';
import { printInstallSummary } from '../../../utils/feature-focused/registry/output-printing';

/**
 * Adds one or more registry components to a Xano instance, attempting to install each component file and collecting success, skip, and failure outcomes.
 *
 * @param componentNames - Registry component names to install; if empty, the user will be prompted to select components.
 * @param context - CLI context used to resolve instance, workspace, and branch configuration; defaults to an empty object.
 * @returns An object with `installed` (entries with `component`, `file` path, and `response`), `failed` (entries with `component`, `file`, `error`, and optional `response`), and `skipped` (entries for items skipped because the resource already exists).
 */
async function addToXano({
   componentNames,
   context = {},
   core,
}: {
   componentNames: string[];
   context: CoreContext;
   core: any;
}): Promise<{
   installed: Array<{ component: string; file: string; response: any }>;
   failed: Array<{ component: string; file: string; error: string; response?: any }>;
   skipped: Array<any>;
}> {
   const { instanceConfig, workspaceConfig, branchConfig } = await resolveConfigs({
      cliContext: context,
      core,
   });

   const registryUrl = process.env.CALY_REGISTRY_URL || 'http://localhost:5500/registry';

   intro('Adding components to your Xano instance:');

   const registryIndex = await core.getRegistryIndex(registryUrl);

   if (!componentNames?.length)
      componentNames = (await promptForComponents(core, registryUrl)) as string[];

   const results = { installed: [], failed: [], skipped: [] };

   for (const componentName of componentNames) {
      try {
         const indexEntry = registryIndex.items.find((item) => item.name === componentName);
         if (!indexEntry) {
            results.failed.push({
               component: componentName,
               error: `Component '${componentName}' not found in registry`,
            });
            continue;
         }

         // Fetch the full registry item definition (not just the index summary)
         const registryItem = await core.getRegistryItem(componentName, registryUrl);

          // Resolve apiGroupIds for query files
          if (registryItem.files) {
             for (const file of registryItem.files) {
                if (file.type === 'registry:query') {
                   if (!file.apiGroupName) {
                      throw new Error(
                         `Missing apiGroupName for file ${file.path || 'unnamed'} in registry item ${componentName}`,
                      );
                   }
                   const apiGroup = await getApiGroupByName(
                      file.apiGroupName,
                      { instanceConfig, workspaceConfig, branchConfig },
                      core,
                   );
                   file.apiGroupId = apiGroup.id;
                }
             }
          }

         const installResults = await core.installRegistryItemToXano(
            registryItem,
            { instanceConfig, workspaceConfig, branchConfig },
            registryUrl,
         );

         // Map core results to CLI format
         for (const installed of installResults.installed) {
            results.installed.push({
               component: componentName,
               file: installed.file,
               response: installed.response,
            });
         }
         for (const failed of installResults.failed) {
            results.failed.push({
               component: componentName,
               file: failed.file,
               error: failed.error,
            });
         }
         for (const skipped of installResults.skipped) {
            results.skipped.push({
               component: componentName,
               file: skipped.file,
               error: skipped.error,
            });
         }
      } catch (error) {
         results.failed.push({ component: componentName, error: error.message });
      }
   }

   // --- Output summary table ---
   printInstallSummary(results, log);

   return results;
}

export { addToXano, scaffoldRegistry };
