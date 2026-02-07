# registry scaffold
>[!NOTE|label:Description]
> #### Scaffold a Xano registry folder with a sample component. Xano registry can be used to share and reuse prebuilt components. In the registry you have to follow the [registry](https://calycode.com/schemas/registry/registry.json) and [registry item](https://calycode.com/schemas/registry/registry-item.json) schemas.

```term
$ xano registry scaffold [options]
```
### Options

#### --output <path>
**Description:** Local output path for the registry
#### --instance <instance>
**Description:** The instance name. This is used to fetch the instance configuration. The value provided at the setup command.

### registry scaffold --help
```term
$ xano registry scaffold --help
Scaffold a Xano registry folder with a sample component. Xano registry can be used to share and reuse prebuilt components. In the registry you have to follow the [registry](https://calycode.com/schemas/registry/registry.json) and [registry item](https://calycode.com/schemas/registry/registry-item.json) schemas.

Usage: xano registry scaffold [options]

Options:
  ├─ --output <path>        Local output path for the registry
  ├─ --instance <instance>  The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
  └─ -h, --help             display help for command

Run 'xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
```