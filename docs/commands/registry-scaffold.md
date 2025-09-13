# registry-scaffold
> #### Scaffold a Xano registry folder with a sample component. Xano registry can be used to share and reuse prebuilt components. In the registry you have to follow the [registry](https://nextcurve.hu/schemas/registry/registry.json) and [registry item](https://nextcurve.hu/schemas/registry/registry-item.json) schemas.

```sh
xano registry-scaffold [options]
```
### Options

#### --output <path>
**Description:** Output path for the registry
#### --instance <instance>
**Description:** The instance name. This is used to fetch the instance configuration. The value provided at the setup command.

### registry-scaffold --help
```sh
Usage: xano registry-scaffold [options]

Scaffold a Xano registry folder with a sample component. Xano registry can be
used to share and reuse prebuilt components. In the registry you have to follow
the [registry](https://nextcurve.hu/schemas/registry/registry.json) and
[registry item](https://nextcurve.hu/schemas/registry/registry-item.json)
schemas.

Options:
  --output <path>        Output path for the registry
  --instance <instance>  The instance name. This is used to fetch the instance
                         configuration. The value provided at the setup command.
  -h, --help             display help for command
```