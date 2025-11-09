# registry
>[!NOTE|label:Description]
> #### Registry related operations. Use this when you wish to add prebuilt components to your Xano instance.

```term
$ xano registry [options]
```

### registry --help
```term
$ xano registry --help
Registry related operations. Use this when you wish to add prebuilt components to your Xano instance.

Usage: xano registry [options] [command]

Options:
  -h, --help
    display help for command

Commands:
  add
    Add a prebuilt component to the current Xano context, essentially by pushing an item from the registry to the Xano instance.

  scaffold
    Scaffold a Xano registry folder with a sample component. Xano registry can be used to share and reuse prebuilt components. In the registry you have to follow the [registry](https://calycode.com/schemas/registry/registry.json) and [registry item](https://calycode.com/schemas/registry/registry-item.json) schemas.

  help
    display help for command


Need help? Visit https://github.com/calycode/xano-tools
```