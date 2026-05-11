export const HOST_APP_INFO = {
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
      mode: 'balanced' as 'strict' | 'balanced' | 'name-only',
   },
};
