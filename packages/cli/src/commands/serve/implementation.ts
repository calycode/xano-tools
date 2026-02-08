import { spawn } from 'node:child_process';
import { normalizeApiGroupName, replacePlaceholders } from '@repo/utils';
import { chooseApiGroupOrAll, findProjectRoot, resolveConfigs } from '../../utils/index';

/**
 * Validates a path argument to prevent command injection.
 * Ensures the path doesn't contain shell metacharacters.
 * @param value - Path value to validate
 * @param name - Name of the parameter for error messages
 * @throws {Error} if path contains potentially dangerous characters
 */
function validatePathArg(value: string, name: string): void {
   // Block shell metacharacters that could be used for command injection
   // Allow alphanumeric, path separators, dots, hyphens, underscores, and spaces
   if (/[;&|`$(){}[\]<>!#*?]/.test(value)) {
      throw new Error(
         `Invalid ${name}: "${value}". Path contains potentially unsafe characters.`
      );
   }
}

/**
 * Get spawn options appropriate for the current platform.
 * On Windows, shell: true is required for npx to work (it's a batch file).
 * On Unix, we avoid shell: true when possible for better security.
 */
function getSpawnOptions(stdio: 'inherit' | 'pipe' = 'inherit') {
   // On Windows, npx is a batch file and requires shell: true
   // On Unix, we can run without shell for better security
   const isWindows = process.platform === 'win32';
   return {
      stdio,
      shell: isWindows,
   };
}

async function serveOas({ instance, workspace, branch, group, listen = 5999, cors = false, core }) {
   const { instanceConfig, workspaceConfig, branchConfig } = await resolveConfigs({
      cliContext: { instance, workspace, branch },
      core,
   });

   const apiGroups = await chooseApiGroupOrAll({
      baseUrl: instanceConfig.url,
      token: await core.loadToken(instanceConfig.name),
      workspace_id: workspaceConfig.id,
      branchLabel: branchConfig.label,
      promptUser: !group,
      groupName: group,
      all: false,
   });

   const currentApiGroup = apiGroups[0];
   const apiGroupNameNorm = normalizeApiGroupName(currentApiGroup.name);

   const specBasePath = replacePlaceholders(instanceConfig.openApiSpec.output, {
      '@': await findProjectRoot(),
      instance: instanceConfig.name,
      workspace: workspaceConfig.name,
      branch: branchConfig.label,
      api_group_normalized_name: apiGroupNameNorm,
   });

   const specHtmlPath = `${specBasePath}/html`;

   // Validate paths to prevent command injection
   validatePathArg(specHtmlPath, 'specHtmlPath');

   return new Promise<void>((resolve, reject) => {
      const serveArgs = ['-l', String(listen)];
      if (cors) String(serveArgs.push('-C'));

      const cliArgs: string[] = ['serve', specHtmlPath, ...serveArgs];

      const oasProc = spawn('npx', cliArgs, getSpawnOptions());

      oasProc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            reject(new Error(`serve exited with code ${code}`));
         }
         oasProc.on('error', (err) => {
            reject(new Error(`Failed to start serve: ${err.message}`));
         });
      });
   });
}

function serveRegistry({ root = 'registry', listen = 5000, cors = false }) {
   // Validate root path to prevent command injection
   validatePathArg(root, 'root');

   return new Promise<void>((resolve, reject) => {
      const serveArgs = [String(root), '-l', String(listen)];
      if (cors) serveArgs.push('-C');

      const cliArgs = ['serve', ...serveArgs];

      const proc = spawn('npx', cliArgs, getSpawnOptions());

      proc.on('close', (code) => {
         if (code === 0) {
            resolve();
         } else {
            reject(new Error(`serve exited with code ${code}`));
         }
      });
      proc.on('error', (err) => {
         reject(new Error(`Failed to start serve: ${err.message}`));
      });
   });
}

export { serveOas, serveRegistry };
