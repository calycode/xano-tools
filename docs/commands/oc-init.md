# oc init
>[!NOTE|label:Description]
> #### Initialize OpenCode native host integration and configuration for use with the CalyCode extension.

```term
$ caly-xano oc init [options]
```
### Options

#### -f, --force
**Description:** Force overwrite existing configuration files
#### --skip-config
**Description:** Skip installing OpenCode configuration templates

### oc init --help
```term
$ caly-xano oc init --help
Initialize OpenCode native host integration and configuration for use with the CalyCode extension.

Usage: caly-xano oc init [options]

Options:
  ├─ -f, --force    Force overwrite existing configuration files
  ├─ --skip-config  Skip installing OpenCode configuration templates
  └─ -h, --help     display help for command

Run 'caly-xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
```

### Build-time and runtime configuration

The native host extension discovery uses this precedence order:
1. runtime `CALY_OC_*` variables
2. build-time pinned `CALY_BUILD_OC_*` variables (embedded at build)
3. repository defaults

Set these **before build** to bake defaults into the CLI/binary:
- `CALY_BUILD_OC_EXT_DISCOVERY_MODE`
- `CALY_BUILD_OC_EXT_NAME`
- `CALY_BUILD_OC_EXT_TRUSTED_AUTHORS`
- `CALY_BUILD_OC_EXT_TRUSTED_HOMEPAGES`
- `CALY_BUILD_OC_EXT_TRUSTED_UPDATE_URLS`
- `CALY_BUILD_OC_EXT_REQUIRE_NATIVE_MESSAGING`
- `CALY_BUILD_OC_EXT_PUBLIC_KEY_B64`
- `CALY_BUILD_OC_EXT_DISCOVERY_ENABLED`
- `CALY_BUILD_OC_EXT_INCLUDE_KNOWN_IDS`
- `CALY_BUILD_OC_WRITE_ALL_BROWSER_MANIFESTS`

At runtime, use the same variable names with `CALY_OC_` prefix to override baked defaults.
