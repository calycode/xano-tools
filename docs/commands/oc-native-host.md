# oc native-host
>[!NOTE|label:Description]
> #### Native host operations for browser extension integration.

```term
$ caly-xano oc native-host [options]
```

### oc native-host --help
```term
$ caly-xano oc native-host --help
Native host operations for browser extension integration.

Usage: caly-xano oc native-host [options] [command]

Options:
  └─ -h, --help  display help for command

Commands:
  ├─ status  Show native host manifest, wrapper, and extension allowlist status.
  └─ help    display help for command
```

### oc native-host status
```term
$ caly-xano oc native-host status
Native Host Status:
  - Platform: win32
  - Wrapper Path: C:\Users\<user>\.calycode\bin\calycode-host.bat
  - Wrapper Exists: Yes
  - App ID: com.calycode.cli
  - Extension ID Source: discovery:balanced+known
  - Chrome Manifest: C:\Users\<user>\.calycode\com.calycode.cli.json
  - Chrome Manifest Exists: Yes
  - Brave Manifest: C:\Users\<user>\.calycode\com.calycode.cli.json
  - Brave Manifest Exists: Yes
  - Edge Manifest: C:\Users\<user>\.calycode\com.calycode.cli.json
  - Edge Manifest Exists: Yes
  - Chromium Manifest: C:\Users\<user>\.calycode\com.calycode.cli.json
  - Chromium Manifest Exists: Yes
  - Chrome Registry Key: HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.calycode.cli
  - Chrome Registry Configured: Yes
  - Brave Registry Key: HKEY_CURRENT_USER\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.calycode.cli
  - Brave Registry Configured: Yes
  - Edge Registry Key: HKEY_CURRENT_USER\Software\Microsoft\Edge\NativeMessagingHosts\com.calycode.cli
  - Edge Registry Configured: Yes
  - Chromium Registry Key: HKEY_CURRENT_USER\Software\Chromium\NativeMessagingHosts\com.calycode.cli
  - Chromium Registry Configured: Yes
  - Expected Extension IDs: hadkkdmpcmllbkfopioopcmeapjchpbm, lnhipaeaeiegnlokhokfokndgadkohfe
  - Expected Origins: chrome-extension://hadkkdmpcmllbkfopioopcmeapjchpbm/, chrome-extension://lnhipaeaeiegnlokhokfokndgadkohfe/
  - Manifest Allowed Origins: chrome-extension://hadkkdmpcmllbkfopioopcmeapjchpbm/, chrome-extension://lnhipaeaeiegnlokhokfokndgadkohfe/
```

Run 'caly-xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
