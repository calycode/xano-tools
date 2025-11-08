# registry
>[!NOTE|label:Description]
> #### Registry related operations. Use this when you wish to add prebuilt components to your Xano instance.

```term
$ xano registry [options]
```

### registry --help
```term
$ xano registry --help
Usage: xano registry [options] [command]

Registry related operations. Use this when you wish to add prebuilt
components to your Xano instance.

Options:
  -h, --help                     display help for command

Commands:
  add [options] <components...>  Add a prebuilt component to the current
                                 Xano context, essentially by pushing an
                                 item from the registry to the Xano
                                 instance.
  scaffold [options]             Scaffold a Xano registry folder with a
                                 sample component. Xano registry can be
                                 used to share and reuse prebuilt
                                 components. In the registry you have to
                                 follow the
                                 [registry](https://calycode.com/schemas/registry/registry.json)
                                 and [registry
                                 item](https://calycode.com/schemas/registry/registry-item.json)
                                 schemas.
  help [command]                 display help for command
```