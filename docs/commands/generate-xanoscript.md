# generate xanoscript
>[!NOTE|label:Description]
> #### Process Xano workspace into repo structure. Supports table, function and apis as of know. Xano VSCode extension is the preferred solution over this command. Outputs of this process are also included in the default repo generation command.

```term
$ xano generate xanoscript [options]
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

### generate xanoscript --help
```term
$ xano generate xanoscript --help
Usage: xano generate xanoscript [options]

Process Xano workspace into repo structure. Supports table, function and
apis as of know. Xano VSCode extension is the preferred solution over this
command. Outputs of this process are also included in the default repo
generation command.

Options:
  --instance <instance>    The instance name. This is used to fetch the
                           instance configuration. The value provided at
                           the setup command.
  --workspace <workspace>  The workspace name. This is used to fetch the
                           workspace configuration. Same as on Xano
                           interface.
  --branch <branch>        The branch name. This is used to select the
                           branch configuration. Same as on Xano Interface.
  --print-output-dir       Expose usable output path for further reuse.
  -h, --help               display help for command
```