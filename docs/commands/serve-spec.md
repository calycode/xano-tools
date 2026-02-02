# serve spec
>[!NOTE|label:Description]
> #### Serve the Open API specification locally for quick visual check, or to test your APIs via the Scalar API reference.

```term
$ xano serve spec [options]
```
### Options

#### --instance <instance>
**Description:** The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
#### --workspace <workspace>
**Description:** The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
#### --branch <branch>
**Description:** The branch name. This is used to select the branch configuration. Same as on Xano Interface.
#### --group <name>
**Description:** API group name. Same as on Xano Interface.
#### --listen <port>
**Description:** The port where you want your spec to be served locally. By default it is 5000.
#### --cors
**Description:** Do you want to enable CORS? By default false.

### serve spec --help
```term
$ xano serve spec --help
Serve the Open API specification locally for quick visual check, or to test your APIs via the Scalar API reference.

Usage: xano serve spec [options]

Options:
  ├─ --instance <instance>    The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
  ├─ --workspace <workspace>  The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
  ├─ --branch <branch>        The branch name. This is used to select the branch configuration. Same as on Xano Interface.
  ├─ --group <name>           API group name. Same as on Xano Interface.
  ├─ --listen <port>          The port where you want your spec to be served locally. By default it is 5000.
  ├─ --cors                   Do you want to enable CORS? By default false.
  └─ -h, --help               display help for command

Run 'xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
```