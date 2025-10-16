# generate-oas
>[!NOTE|label:Description]
> #### Update and generate OpenAPI spec(s) for the current context.

```term
$ xano generate-oas [options]
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
#### --all
**Description:** Regenerate for all API groups in the workspace / branch of the current context.
#### --print-output-dir
**Description:** Expose usable output path for further reuse.

### generate-oas --help
```term
$ xano generate-oas --help
Usage: xano generate-oas [options]

Update and generate OpenAPI spec(s) for the current context.

Options:
  --instance <instance>    The instance name. This is used to fetch the instance
                           configuration. The value provided at the setup
                           command.
  --workspace <workspace>  The workspace name. This is used to fetch the
                           workspace configuration. Same as on Xano interface.
  --branch <branch>        The branch name. This is used to select the branch
                           configuration. Same as on Xano Interface.
  --group <name>           API group name. Same as on Xano Interface.
  --all                    Regenerate for all API groups in the workspace /
                           branch of the current context.
  --print-output-dir       Expose usable output path for further reuse.
  -h, --help               display help for command
```