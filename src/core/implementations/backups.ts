import { spinner } from '@clack/prompts';
import { replacePlaceholders, metaApiRequestBlob, joinPath } from '../utils';

async function exportBackupImplementation({ instance, workspace, branch, core }) {
   const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      branch,
   });

   if (!instanceConfig || !workspaceConfig || !branchConfig) {
      throw new Error(
         'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
      );
   }

   const s = spinner();

   s.start('Fetching and saving backup...');

   // Resolve output dir
   const outputDir = replacePlaceholders(instanceConfig.backups.output, {
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
   });

   // Ensure outputDir exists:
   await core.storage.mkdir(outputDir, { recursive: true });

   const backupBuffer = await metaApiRequestBlob({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
      method: 'POST',
      path: `/workspace/${workspaceConfig.id}/export`,
      body: { branch: branchConfig.label },
   });

   const now = new Date();
   const ts = now.toISOString().replace(/[:.]/g, '-');
   const backupPath = joinPath(outputDir, `backup-${ts}.tar.gz`);
   core.storage.writeFile(backupPath, backupBuffer);

   s.stop(`Workspace backup saved -> ${backupPath}`);

   return { outputDir, backupPath };
}

async function restoreBackupImplementation({ instance, workspace, formData, core }) {
   const { instanceConfig, workspaceConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
   });

   const headers = {
      Authorization: `Bearer ${await core.loadToken(instanceConfig.name)}`,
      ...(formData.getHeaders ? formData.getHeaders() : {}),
   };

   const response = await fetch(
      `${instanceConfig.url}/api:meta/workspace/${workspaceConfig.id}/import`,
      {
         method: 'POST',
         body: formData,
         headers,
      }
   );

   console.log(response);

   return response;
}

export { exportBackupImplementation, restoreBackupImplementation };
