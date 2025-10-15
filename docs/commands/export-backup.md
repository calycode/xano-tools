# export-backup
>[!NOTE|label:Description]
> #### Backup Xano Workspace via Metadata API

```term
$ xano export-backup [options]
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

### export-backup --help
```term
$ xano export-backup --help
Usage: xano export-backup [options]

Backup Xano Workspace via Metadata API

Options:
  --instance <instance>    The instance name. This is used to fetch the instance configuration. The value
                           provided at the setup command.
  --workspace <workspace>  The workspace name. This is used to fetch the workspace configuration. Same as on
                           Xano interface.
  --branch <branch>        The branch name. This is used to select the branch configuration. Same as on Xano
                           Interface.
  --print-output-dir       Expose usable output path for further reuse.
  -h, --help               display help for command
```