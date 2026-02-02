# registry add
>[!NOTE|label:Description]
> #### Add a prebuilt component to the current Xano context, essentially by pushing an item from the registry to the Xano instance.

```term
$ xano registry add [options]
```
### Options

#### --instance <instance>
**Description:** The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
#### --workspace <workspace>
**Description:** The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
#### --branch <branch>
**Description:** The branch name. This is used to select the branch configuration. Same as on Xano Interface.
#### --registry <url>
**Description:** URL to the component registry. Default: http://localhost:5500/registry/definitions

### registry add --help
```term
$ xano registry add --help
Add a prebuilt component to the current Xano context, essentially by pushing an item from the registry to the Xano instance.

Usage: xano registry add [options] [components...]

Arguments:
  └─ components  Space delimited list of components to add to your Xano instance.

Options:
  ├─ --instance <instance>    The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
  ├─ --workspace <workspace>  The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
  ├─ --branch <branch>        The branch name. This is used to select the branch configuration. Same as on Xano Interface.
  ├─ --registry <url>         URL to the component registry. Default: http://localhost:5500/registry/definitions
  └─ -h, --help               display help for command

Run 'xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
```