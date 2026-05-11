export type ExtensionDiscoveryMode = 'strict' | 'balanced' | 'name-only';

interface HostAppInfo {
   name: string;
   description: string;
   reverseAppId: string;
   appId: string;
   version: string;
   url: string;
   extensionId: string;
   allowedExtensionIds: string[];
   extensionDiscovery: {
      extensionName: string;
      trustedAuthorPatterns: string[];
      trustedHomepagePrefixes: string[];
      requireNativeMessagingPermission: boolean;
      mode: ExtensionDiscoveryMode;
   };
}

export const HOST_APP_INFO: HostAppInfo = {
   name: 'CalyCode Xano CLI',
   description: 'CalyCode Xano CLI Native Host',
   reverseAppId: 'com.calycode.cli',
   appId: 'cli.calycode.com',
   version: '1.0.0',
   url: 'https://calycode.com/xano',
   // Known extension IDs (fast-path allowlist)
   extensionId: 'hadkkdmpcmllbkfopioopcmeapjchpbm',
   allowedExtensionIds: [
      'hadkkdmpcmllbkfopioopcmeapjchpbm', // Production (Chrome Web Store)
      'lnhipaeaeiegnlokhokfokndgadkohfe', // Development (unpacked)
   ],
   extensionDiscovery: {
      extensionName: '@calycode | Extension',
      trustedAuthorPatterns: ['calycode', '@calycode', 'Mihály @calycode'],
      trustedHomepagePrefixes: [
         'https://extension.calycode.com',
         'https://www.extension.calycode.com',
      ],
      requireNativeMessagingPermission: true,
      mode: 'balanced',
   },
};
