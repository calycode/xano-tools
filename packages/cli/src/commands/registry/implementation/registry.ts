import { intro, log } from '@clack/prompts';
import type { CoreContext } from '@repo/types';
import {
   fetchRegistryFileContent,
   getApiGroupByName,
   getRegistryItem,
   promptForComponents,
   resolveInstallUrl,
   scaffoldRegistry,
   sortFilesByType,
} from '../../../utils/index';
import { resolveConfigs } from '../../../utils/index';
import { printInstallSummary } from '../../../utils/feature-focused/registry/output-printing';

function isAlreadyExistsError(errorObj: any): boolean {
   if (!errorObj || typeof errorObj !== 'object') return false;
   if (errorObj.code !== 'ERROR_FATAL') return false;
   const msg = errorObj.message?.toLowerCase() || '';
   // Expand patterns as needed for robustness:
   return (
      msg.includes('already being used') ||
      msg.includes('already exists') ||
      msg.includes('duplicate') // Add more patterns if needed
   );
}

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

   intro('Adding components to your Xano instance:');

   if (!componentNames?.length) componentNames = (await promptForComponents()) as string[];

   const results = { installed: [], failed: [], skipped: [] };

   for (const componentName of componentNames) {
      try {
         const registryItem = await getRegistryItem(componentName);
         const sortedFiles = sortFilesByType(registryItem.files);
         for (const file of sortedFiles) {
            const installResult = await installComponentToXano(
               file,
               { instanceConfig, workspaceConfig, branchConfig },
               core
            );
            if (installResult.success) {
               results.installed.push({
                  component: componentName,
                  file: file.path,
                  response: installResult.body,
               });
            } else if (installResult.body && isAlreadyExistsError(installResult.body)) {
               // Skipped due to already existing
               results.skipped.push({
                  component: componentName,
                  file: file.path,
                  error: installResult.body.message,
               });
            } else {
               // Other failures
               results.failed.push({
                  component: componentName,
                  file: file.path,
                  error: installResult.error || 'Installation failed',
                  response: installResult.body,
               });
            }
         }
      } catch (error) {
         results.failed.push({ component: componentName, error: error.message });
      }
   }

   // --- Output summary table ---
   printInstallSummary(results, log);

   return results;
}

/**
 * Install a single component file into the configured Xano instance.
 *
 * @param file - Component file metadata (e.g., `type`, `path`, `target`, and for query files `apiGroupName`) that identifies what to install and where.
 * @param resolvedContext - Resolved configuration objects: `instanceConfig`, `workspaceConfig`, and `branchConfig`.
 * @returns An object with `success: true` and the parsed response `body` on success; on failure `success: false` and `error` contains a human-readable message, `body` may include the raw response when available.
 */
async function installComponentToXano(file, resolvedContext, core) {
   const { instanceConfig, workspaceConfig, branchConfig } = resolvedContext;
   let apiGroupId;

   // For types that require dynamic IDs, resolve them first
   if (file.type === 'registry:query') {
      const targetApiGroup = await getApiGroupByName(
         file.apiGroupName,
         { instanceConfig, workspaceConfig, branchConfig },
         core
      );
      apiGroupId = targetApiGroup.id;
   }

   const installUrl = resolveInstallUrl(file.type, {
      instanceConfig,
      workspaceConfig,
      branchConfig,
      file,
      apiGroupId,
   });

   const xanoToken = await core.loadToken(instanceConfig.name);
   const xanoApiUrl = `${instanceConfig.url}/api:meta`;

   try {
      const content = await fetchRegistryFileContent(file.path);
      const response = await fetch(`${xanoApiUrl}/${installUrl}`, {
         method: 'POST',
         headers: {
            Authorization: `Bearer ${xanoToken}`,
            'Content-Type': 'text/x-xanoscript',
         },
         body: content,
      });

      let body;
      try {
         body = await response.json();
      } catch (jsonErr) {
         return {
            success: false,
            error: `Invalid JSON response: ${jsonErr.message}`,
         };
      }

      if (!response.ok) {
         return {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText} - ${body?.message || ''}`,
            body,
         };
      }

      if (body && body.code && body.message) {
         return {
            success: false,
            error: `${body.code}: ${body.message}`,
            body,
         };
      }

      if (body && body.xanoscript && body.xanoscript.status !== 'ok') {
         return {
            success: false,
            error: `XanoScript error: ${body.xanoscript.message || 'Unknown error'}`,
            body,
         };
      }

      return { success: true, body };
   } catch (error) {
      console.error(`Failed to install ${file.target || file.path}:`, error);
      return { success: false, error: error.message };
   }
}

export { addToXano, scaffoldRegistry };