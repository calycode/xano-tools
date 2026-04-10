# backup export
>[!NOTE|label:Description]
> #### Backup Xano Workspace via Metadata API

```term
$ caly-xano backup export [options]
```
### Options

#### --instance <instance>
**Description:** The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
#### --workspace <workspace>
**Description:** The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
#### --branch <branch>
**Description:** The branch name. This is used to select the branch configuration. Same as on Xano Interface.
#### --print-output-dir
**Description:** Expose usable output path for further reuse.

### backup export --help
```term
$ caly-xano backup export --help
Backup Xano Workspace via Metadata API

Usage: caly-xano backup export [options]

Options:
  ├─ --instance <instance>    The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
  ├─ --workspace <workspace>  The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
  ├─ --branch <branch>        The branch name. This is used to select the branch configuration. Same as on Xano Interface.
  ├─ --print-output-dir       Expose usable output path for further reuse.
  └─ -h, --help               display help for command

Run 'caly-xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
```