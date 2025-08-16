import { multiselect, intro, log } from '@clack/prompts';
import {
   addFullContextOptions,
   getRegistryIndex,
   getRegistryItem,
   loadAndValidateContext,
   withErrorHandler,
} from '../utils/index.js';
import { loadToken } from '../config/loaders.js';

async function addToXano(componentNames, context = {}) {
   const { instanceConfig, workspaceConfig, branchConfig } = loadAndValidateContext({
      instance: context.instance,
      workspace: context.workspace,
      branch: context.branch,
   });

   intro('Add components to your Xano instance');

   if (!componentNames?.length) componentNames = await promptForComponents();

   const results = { installed: [], failed: [], skipped: [] };

   for (const componentName of componentNames) {
      try {
         const registryItem = await getRegistryItem(componentName);
         for (const file of registryItem.files) {
            const success = await installComponentToXano(file, {
               instanceConfig,
               workspaceConfig,
               branchConfig,
            });
            if (success)
               results.installed.push({ component: componentName, file: file.target || file.path });
            else
               results.failed.push({
                  component: componentName,
                  file: file.target || file.path,
                  error: 'Installation failed',
               });
         }
         log.step(`Installed: ${componentName}`);
      } catch (error) {
         results.failed.push({ component: componentName, error: error.message });
      }
   }
   return results;
}

async function installComponentToXano(file, resolvedContext) {
   const { instanceConfig, workspaceConfig, branchConfig } = resolvedContext;

   try {
      // TODO: implement override checking. For now just try the POST and Xano will throw error anyways...
      /*
      if (!overwrite) {
         const existsResponse = await fetch(`${xanoApiUrl}/metadata/${file.target || file.path}`, {
            method: 'GET',
            headers: { Authorization: `Bearer ${xanoToken}`, 'Content-Type': 'application/json' },
         });
         if (existsResponse.ok) {
            console.log(`File ${file.target || file.path} already exists, skipping...`);
            return false;
         }
      }
*/
      const xanoToken = loadToken(instanceConfig.name);
      const xanoApiUrl = `${instanceConfig.url}/api:meta`;
      const response = await fetch(
         `${xanoApiUrl}/workspace/${workspaceConfig.id}/function?branch=${branchConfig.label}`,
         {
            method: 'POST',
            headers: {
               Authorization: `Bearer ${xanoToken}`,
               'Content-Type': 'text/x-xanoscript',
            },
            body: file.content,
         }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      return true;
   } catch (error) {
      console.error(`Failed to install ${file.target || file.path}:`, error);
      return false;
   }
}

async function promptForComponents() {
   try {
      const registry = await getRegistryIndex();
      const selectedComponents = await multiselect({
         message: 'Select components to install:',
         options: registry.items.map((item) => ({
            value: item.name,
            label: item.title,
         })),
      });
      return selectedComponents;
   } catch (error) {
      console.error('Failed to fetch available components:', error);
      return [];
   }
}

function registerRegistryAddCommand(program) {
   const cmd = program
      .command('registry-add')
      .description('Add a component to the current Xano context.')
      .options('--components', 'Comma-separated list of components to add');

   addFullContextOptions(cmd);

   cmd.action(
      withErrorHandler(async (options) => {
         await addToXano(options.components, {
            instance: options.instance,
            workspace: options.workspace,
            branch: options.branch,
         });
      })
   );
}

export { registerRegistryAddCommand };
