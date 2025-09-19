import { replacePlaceholders, joinPath, dirname } from '@calycode/utils';

/**
 * Exports a backup and emits events for CLI/UI.
 */
async function exportBackupImplementation({ outputDir, instance, workspace, branch, core }) {
   core.emit('start', {
      name: 'export-backup',
      payload: { instance, workspace, branch },
   });

   try {
      core.emit('progress', {
         name: 'export-backup',
         message: 'Loading context...',
         percent: 5,
      });
      const startDir = core.storage.getStartDir();
      const { instanceConfig, workspaceConfig, branchConfig } = await core.loadAndValidateContext({
         instance,
         workspace,
         branch,
         startDir,
      });

      if (!instanceConfig || !workspaceConfig || !branchConfig) {
         throw new Error(
            'Missing instance, workspace, or branch context. Please use setup-instance and switch-context.'
         );
      }

      core.emit('progress', {
         name: 'export-backup',
         message: 'Preparing output directory...',
         percent: 15,
      });

      core.emit('progress', {
         name: 'export-backup',
         message: 'Requesting backup from Xano API...',
         percent: 40,
      });

      const startTime = Date.now();
      core.emit('progress', {
         name: 'export-backup',
         message: 'Requesting backup from Xano API...',
         percent: 40,
      });

      let backupStreamRequest;
      try {
         backupStreamRequest = await fetch(
            `${instanceConfig.url}/api:meta/workspace/${workspaceConfig.id}/export`,
            {
               method: 'POST',
               headers: {
                  Authorization: `Bearer ${await core.loadToken(instanceConfig.name)}`,
                  'Content-Type': 'application/json',
               },
               body: JSON.stringify({ branch: branchConfig.label }),
            }
         );
      } catch (err) {
         core.emit('error', {
            error: err,
            message: 'Fetch failed',
            step: 'fetch',
            elapsed: Date.now() - startTime,
         });
         throw err;
      }

      core.emit('info', {
         message: 'Response headers received',
         headers: backupStreamRequest.headers,
         status: backupStreamRequest.status,
         elapsed: Date.now() - startTime,
      });

      const now = new Date();
      const ts = now.toISOString().replace(/[:.]/g, '-');
      const backupPath = joinPath(outputDir, `backup-${ts}.tar.gz`);

      await core.storage.mkdir(outputDir, { recursive: true });
      try {
         await core.storage.streamToFile({ path: backupPath, stream: backupStreamRequest.body });
         core.emit('info', {
            message: 'Streaming complete',
            backupPath,
            elapsed: Date.now() - startTime,
         });
      } catch (err) {
         core.emit('error', {
            error: err,
            message: 'Streaming to file failed',
            step: 'streamToFile',
            elapsed: Date.now() - startTime,
         });
         throw err;
      }

      core.emit('progress', {
         name: 'export-backup',
         message: `Workspace backup saved -> ${backupPath}`,
         percent: 100,
      });

      core.emit('info', {
         name: 'output-dir',
         payload: { outputDir, backupPath },
         message: `OUTPUT_DIR=${outputDir}`,
      });

      core.emit('end', {
         name: 'export-backup',
         payload: { outputDir, backupPath },
      });

      return { outputDir, backupPath };
   } catch (error) {
      core.emit('error', {
         error,
         message: error.message || String(error),
         payload: { instance, workspace, branch },
      });
      throw error;
   }
}

async function restoreBackupImplementation({ instance, workspace, formData, core }) {
   core.emit('progress', {
      name: 'restore-backup',
      message: 'Loading context...',
      percent: 5,
   });
   const startDir = core.storage.getStartDir();
   const { instanceConfig, workspaceConfig } = await core.loadAndValidateContext({
      instance,
      workspace,
      startDir,
   });

   const headers = {
      Authorization: `Bearer ${await core.loadToken(instanceConfig.name)}`,
      ...(formData.getHeaders ? formData.getHeaders() : {}),
   };

   core.emit('progress', {
      name: 'restore-backup',
      message: 'Preparing request for Xano API...',
      percent: 20,
   });
   const response = await fetch(
      `${instanceConfig.url}/api:meta/workspace/${workspaceConfig.id}/import`,
      {
         method: 'POST',
         body: formData,
         headers,
      }
   );

   core.emit('progress', {
      name: 'restore-backup',
      message: 'Importing backup via Xano API...',
      percent: 100,
   });

   core.emit('end', {
      name: 'restore-backup',
      payload: { status: response.status, response },
   });

   return response;
}

export { exportBackupImplementation, restoreBackupImplementation };
