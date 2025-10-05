# generate-xs-repo
>[!NOTE|label:Description]
> #### Process Xano workspace into repo structure

```term
$ xano generate-xs-repo [options]
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

### generate-xs-repo --help
```term
$ xano generate-xs-repo --help
Usage: xano generate-xs-repo [options]

Process Xano workspace into repo structure

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