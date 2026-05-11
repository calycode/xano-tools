import path from 'node:path';
import { HOST_APP_INFO } from '../../../utils/host-constants';

interface NativeHostBrowserTarget {
   browser: string;
   manifestPath: string;
   registryKey?: string;
}

function getNativeHostTargets(platform: NodeJS.Platform, homeDir: string): NativeHostBrowserTarget[] {
   if (platform === 'darwin') {
      return [
         {
            browser: 'Chrome',
            manifestPath: path.join(
               homeDir,
               `Library/Application Support/Google/Chrome/NativeMessagingHosts/${HOST_APP_INFO.reverseAppId}.json`,
            ),
         },
         {
            browser: 'Brave',
            manifestPath: path.join(
               homeDir,
               `Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts/${HOST_APP_INFO.reverseAppId}.json`,
            ),
         },
         {
            browser: 'Edge',
            manifestPath: path.join(
               homeDir,
               `Library/Application Support/Microsoft Edge/NativeMessagingHosts/${HOST_APP_INFO.reverseAppId}.json`,
            ),
         },
         {
            browser: 'Chromium',
            manifestPath: path.join(
               homeDir,
               `Library/Application Support/Chromium/NativeMessagingHosts/${HOST_APP_INFO.reverseAppId}.json`,
            ),
         },
      ];
   }

   if (platform === 'linux') {
      return [
         {
            browser: 'Chrome',
            manifestPath: path.join(
               homeDir,
               `.config/google-chrome/NativeMessagingHosts/${HOST_APP_INFO.reverseAppId}.json`,
            ),
         },
         {
            browser: 'Brave',
            manifestPath: path.join(
               homeDir,
               `.config/BraveSoftware/Brave-Browser/NativeMessagingHosts/${HOST_APP_INFO.reverseAppId}.json`,
            ),
         },
         {
            browser: 'Edge',
            manifestPath: path.join(
               homeDir,
               `.config/microsoft-edge/NativeMessagingHosts/${HOST_APP_INFO.reverseAppId}.json`,
            ),
         },
         {
            browser: 'Chromium',
            manifestPath: path.join(
               homeDir,
               `.config/chromium/NativeMessagingHosts/${HOST_APP_INFO.reverseAppId}.json`,
            ),
         },
      ];
   }

   if (platform === 'win32') {
      const manifestPath = path.join(homeDir, '.calycode', `${HOST_APP_INFO.reverseAppId}.json`);
      return [
         {
            browser: 'Chrome',
            manifestPath,
            registryKey: `HKEY_CURRENT_USER\\Software\\Google\\Chrome\\NativeMessagingHosts\\${HOST_APP_INFO.reverseAppId}`,
         },
         {
            browser: 'Brave',
            manifestPath,
            registryKey: `HKEY_CURRENT_USER\\Software\\BraveSoftware\\Brave-Browser\\NativeMessagingHosts\\${HOST_APP_INFO.reverseAppId}`,
         },
         {
            browser: 'Edge',
            manifestPath,
            registryKey: `HKEY_CURRENT_USER\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${HOST_APP_INFO.reverseAppId}`,
         },
         {
            browser: 'Chromium',
            manifestPath,
            registryKey: `HKEY_CURRENT_USER\\Software\\Chromium\\NativeMessagingHosts\\${HOST_APP_INFO.reverseAppId}`,
         },
      ];
   }

   throw new Error(`Unsupported platform: ${platform}`);
}

export { getNativeHostTargets };
export type { NativeHostBrowserTarget };
