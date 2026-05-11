import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import { log } from '@clack/prompts';
import { HOST_APP_INFO } from '../../../utils/host-constants';
import { getNativeHostTargets, type NativeHostBrowserTarget } from './targets';
import {
   resolveAllowedExtensionIds,
   resolveWriteAllBrowserManifests,
   type ResolveExtensionIdsResult,
} from './discovery';

interface SetupNativeHostResult {
   manifestExePath: string;
   extensionResolution: ResolveExtensionIdsResult;
}

function createNativeHostWrapper(platform: NodeJS.Platform, homeDir: string): string {
   const isWin = platform === 'win32';
   const executablePath = process.execPath;

   if (isWin) {
      const wrapperDir = path.join(homeDir, '.calycode', 'bin');
      if (!fs.existsSync(wrapperDir)) {
         fs.mkdirSync(wrapperDir, { recursive: true });
      }

      const wrapperPath = path.join(wrapperDir, 'calycode-host.bat');
      let wrapperContent = '';
      const isBundled = process.execPath.toLowerCase().endsWith('caly.exe') || (process as any).pkg;

      if (isBundled) {
         wrapperContent = `@echo off\r\n`;
         wrapperContent += `"${process.execPath}" opencode native-host %*\r\n`;
      } else {
         wrapperContent = `@echo off\r\n`;
         wrapperContent += `"${process.execPath}" "${process.argv[1]}" opencode native-host %*\r\n`;
      }

      fs.writeFileSync(wrapperPath, wrapperContent);
      log.info(`Created wrapper script: ${wrapperPath}`);
      log.info(`Wrapper content: ${wrapperContent.trim()}`);
      log.warn('Note: Development mode on Windows uses a batch file wrapper.');
      log.warn('If Native Messaging fails, try building the bundled exe instead.');
      return wrapperPath;
   }

   const wrapperDir = path.join(homeDir, '.calycode', 'bin');
   if (!fs.existsSync(wrapperDir)) {
      fs.mkdirSync(wrapperDir, { recursive: true });
   }

   const wrapperPath = path.join(wrapperDir, 'calycode-host.sh');
   let wrapperContent: string;
   const isBundled = process.execPath.toLowerCase().endsWith('caly') || (process as any).pkg;
   if (isBundled || !process.argv[1]) {
      wrapperContent = `#!/bin/sh\nexec "${executablePath}" opencode native-host "$@"\n`;
   } else {
      wrapperContent = `#!/bin/sh\nexec "${executablePath}" "${process.argv[1]}" opencode native-host "$@"\n`;
   }

   fs.writeFileSync(wrapperPath, wrapperContent);
   fs.chmodSync(wrapperPath, '755');
   return wrapperPath;
}

function createNativeHostManifest(manifestExePath: string, allowedExtensionIds: string[]): Record<string, any> {
   return {
      name: HOST_APP_INFO.reverseAppId,
      description: HOST_APP_INFO.description,
      path: manifestExePath,
      type: 'stdio',
      allowed_origins: allowedExtensionIds.map((id) => `chrome-extension://${id}/`),
   };
}

function writeNativeHostManifests(
   platform: NodeJS.Platform,
   targets: NativeHostBrowserTarget[],
   manifestContent: Record<string, any>,
): NativeHostBrowserTarget[] {
   const writeAllBrowserManifests = resolveWriteAllBrowserManifests();
   const writtenTargets: NativeHostBrowserTarget[] = [];

   for (const target of targets) {
      if (platform !== 'win32' && !writeAllBrowserManifests) {
         const browserRootDir = path.dirname(path.dirname(target.manifestPath));
         if (!fs.existsSync(browserRootDir)) {
            continue;
         }
      }

      const manifestDir = path.dirname(target.manifestPath);
      if (!fs.existsSync(manifestDir)) {
         fs.mkdirSync(manifestDir, { recursive: true });
      }

      fs.writeFileSync(target.manifestPath, JSON.stringify(manifestContent, null, 2));
      writtenTargets.push(target);
      log.success(`Native messaging host manifest created for ${target.browser}: ${target.manifestPath}`);
   }

   return writtenTargets;
}

async function registerWindowsNativeHosts(targets: NativeHostBrowserTarget[]): Promise<void> {
   const registryFailures: string[] = [];

   for (const target of targets) {
      if (!target.registryKey) {
         continue;
      }

      const regArgs = ['add', target.registryKey, '/ve', '/t', 'REG_SZ', '/d', target.manifestPath, '/f'];
      try {
         await new Promise<void>((resolve, reject) => {
            const proc = spawn('reg', regArgs, { stdio: 'ignore' });
            proc.on('close', (code) => {
               if (code === 0) {
                  resolve();
                  return;
               }
               reject(new Error(`Exit code ${code}`));
            });
            proc.on('error', reject);
         });

         log.success(`Registry key added for ${target.browser}: ${target.registryKey}`);
      } catch (error: any) {
         const message = `${target.browser}: ${error?.message || 'unknown error'}`;
         registryFailures.push(message);
         log.warn(`Failed to add registry key for ${target.browser}. ${message}`);
      }
   }

   if (registryFailures.length === targets.length) {
      throw new Error(`Failed to register native host for all Windows browsers: ${registryFailures.join('; ')}`);
   }
}

async function setupNativeHostRegistration(extensionIds?: string[]): Promise<SetupNativeHostResult> {
   const platform = os.platform();
   const homeDir = os.homedir();
   const nativeHostTargets = getNativeHostTargets(platform, homeDir);
   const extensionResolution = resolveAllowedExtensionIds(extensionIds);
   const allowedExtensionIds = extensionResolution.ids;

   if (allowedExtensionIds.length === 0) {
      throw new Error(
         'No extension IDs were discovered. Install the extension first, or set CALY_OC_EXT_INCLUDE_KNOWN_IDS=true.',
      );
   }

   log.info(
      `Setting up native host for ${allowedExtensionIds.length} extension(s) [source=${extensionResolution.source}]...`,
   );

   const manifestExePath = createNativeHostWrapper(platform, homeDir);
   const manifestContent = createNativeHostManifest(manifestExePath, allowedExtensionIds);
   const writtenTargets = writeNativeHostManifests(platform, nativeHostTargets, manifestContent);

   if (platform === 'win32') {
      await registerWindowsNativeHosts(nativeHostTargets);
   }

   if (writtenTargets.length === 0) {
      throw new Error(
         'No browser manifest targets were written. Install a supported Chromium browser or set CALY_OC_WRITE_ALL_BROWSER_MANIFESTS=true.',
      );
   }

   log.success(`Executable path in manifest: ${manifestExePath}`);

   if (extensionResolution.matched.length > 0) {
      for (const match of extensionResolution.matched) {
         log.info(
            `Extension match: ${match.id} [${match.browser}/${match.profile}] confidence=${match.confidence} (${match.reasons.join(', ')})`,
         );
      }
   }

   return {
      manifestExePath,
      extensionResolution,
   };
}

function showNativeHostStatus(): void {
   const platform = os.platform();
   const homeDir = os.homedir();
   const wrapperPath = path.join(homeDir, '.calycode', 'bin', platform === 'win32' ? 'calycode-host.bat' : 'calycode-host.sh');
   const nativeHostTargets = getNativeHostTargets(platform, homeDir);
   const extensionResolution = resolveAllowedExtensionIds();
   const expectedOrigins = extensionResolution.ids.map((id) => `chrome-extension://${id}/`);

   const lines: string[] = [];
   lines.push('Native Host Status:');
   lines.push(`  - Platform: ${platform}`);
   lines.push(`  - Wrapper Path: ${wrapperPath}`);
   lines.push(`  - Wrapper Exists: ${fs.existsSync(wrapperPath) ? 'Yes' : 'No'}`);
   lines.push(`  - App ID: ${HOST_APP_INFO.reverseAppId}`);
   lines.push(`  - Extension ID Source: ${extensionResolution.source}`);

   for (const target of nativeHostTargets) {
      const exists = fs.existsSync(target.manifestPath);
      lines.push(`  - ${target.browser} Manifest: ${target.manifestPath}`);
      lines.push(`  - ${target.browser} Manifest Exists: ${exists ? 'Yes' : 'No'}`);
   }

   if (platform === 'win32') {
      for (const target of nativeHostTargets) {
         if (!target.registryKey) {
            continue;
         }

         let registryConfigured = false;
         try {
            execSync(`reg query "${target.registryKey}" /ve`, { stdio: 'ignore', windowsHide: true });
            registryConfigured = true;
         } catch {
            registryConfigured = false;
         }

         lines.push(`  - ${target.browser} Registry Key: ${target.registryKey}`);
         lines.push(`  - ${target.browser} Registry Configured: ${registryConfigured ? 'Yes' : 'No'}`);
      }
   }

   let manifestAllowedOrigins: string[] = [];
   const firstManifestPath = nativeHostTargets[0]?.manifestPath;
   if (firstManifestPath && fs.existsSync(firstManifestPath)) {
      try {
         const manifestRaw = fs.readFileSync(firstManifestPath, 'utf8');
         const manifest = JSON.parse(manifestRaw) as { allowed_origins?: string[] };
         manifestAllowedOrigins = Array.isArray(manifest.allowed_origins) ? manifest.allowed_origins : [];
      } catch {
         lines.push('  - Manifest Parse: Failed');
      }
   }

   lines.push(
      `  - Expected Extension IDs: ${extensionResolution.ids.length ? extensionResolution.ids.join(', ') : '(none)'}`,
   );
   lines.push(
      `  - Expected Origins: ${expectedOrigins.join(', ')}`,
   );
   lines.push(
      `  - Manifest Allowed Origins: ${manifestAllowedOrigins.length ? manifestAllowedOrigins.join(', ') : '(none)'}`,
   );

   const missingOrigins = expectedOrigins.filter((origin) => !manifestAllowedOrigins.includes(origin));
   if (missingOrigins.length > 0) {
      lines.push(`  - Missing Expected Origins: ${missingOrigins.join(', ')}`);
      lines.push('  - Recommendation: run `caly-xano oc init --force` to refresh native host setup.');
      log.warn(lines.join('\n'));
      return;
   }

   log.success(lines.join('\n'));
}

export { setupNativeHostRegistration, showNativeHostStatus };
