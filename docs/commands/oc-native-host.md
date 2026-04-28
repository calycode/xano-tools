# oc native-host
>[!NOTE|label:Description]
> #### Native host operations used for Chrome extension communication.

```term
$ caly-xano oc native-host [options]
```

### oc native-host --help
```term
$ caly-xano oc native-host --help
Native host operations used for Chrome extension communication.

Usage: caly-xano oc native-host [options]

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
  - Manifest Path: C:\Users\<user>\.calycode\com.calycode.cli.json
  - Manifest Exists: Yes
  - Wrapper Path: C:\Users\<user>\.calycode\bin\calycode-host.bat
  - Wrapper Exists: Yes
  - App ID: com.calycode.cli
  - Registry Key: HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.calycode.cli
  - Registry Configured: Yes
  - Expected Extension IDs: hadkkdmpcmllbkfopioopcmeapjchpbm, lnhipaeaeiegnlokhokfokndgadkohfe
  - Expected Origins: chrome-extension://hadkkdmpcmllbkfopioopcmeapjchpbm/, chrome-extension://lnhipaeaeiegnlokhokfokndgadkohfe/
  - Manifest Allowed Origins: chrome-extension://hadkkdmpcmllbkfopioopcmeapjchpbm/, chrome-extension://lnhipaeaeiegnlokhokfokndgadkohfe/
```

Run 'caly-xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
