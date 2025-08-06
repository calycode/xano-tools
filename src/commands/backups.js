import { log, spinner } from '@clack/prompts';
import { loadGlobalConfig, loadToken } from '../config/loaders.js';
import { getCurrentContextConfig } from '../utils/context/index.js';
import { metaApiRequestBlob } from '../utils/metadata/api-helper.js';
import { join } from 'path';
import { writeFileSync } from 'fs';

async function exportBackup() {
   const globalConfig = loadGlobalConfig();
   const { instanceConfig, workspaceConfig, branchConfig } = getCurrentContextConfig(
      globalConfig,
      {}
   );

   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      throw new Error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
   }

   // Resolve output dir
   const outputDir = replacePlaceholders(instanceConfig.backups.output, {
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });

   spinner().start('Fetching workspace export...');
   const zipBuffer = await metaApiRequestBlob({
      baseUrl,
      token: loadToken(instanceConfig.name),
      method: 'POST',
      path: `/workspace/${workspaceId}/export`,
      body: { branch: branchConfig.label },
   });

   const now = new Date();
   const ts = now.toISOString().replace(/[:.]/g, '-');
   const zipPath = join(outputDir, `backup-${ts}.zip`);
   writeFileSync(zipPath, zipBuffer);
   spinner().stop(`Workspace backup exported -> ${zipPath}`);
}

export { exportBackup }