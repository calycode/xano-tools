```
Usage: xcc generate-oas [options]

Update and generate OpenAPI spec(s) for the current context.

Options:
  --instance <instance>    The instance name. This is used to fetch the instance configuration. The value
                           provided at the setup command.
  --workspace <workspace>  The workspace name. This is used to fetch the workspace configuration. Same as on
                           Xano interface.
  --branch <branch>        The branch name. This is used to select the branch configuration. Same as on Xano
                           Interface.
  --group <name>           API group name. Same as on Xano Interface.
  --all                    Regenerate for all API groups in the workspace / branch of the current context.
  -h, --help               display help for command
```