# `serve-oas` Command
> Serve the Open API specification locally for quick visual check.
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
#### --listen <port>
**Description:** The port where you want your registry to be served locally. By default it is 5000.
#### --cors
**Description:** Do you want to enable CORS? By default false.

### serve-oas --help
```sh
Usage: xano serve-oas [options]

Serve the Open API specification locally for quick visual check.

Options:
  --instance <instance>    The instance name. This is used to fetch
                           the instance configuration. The value
                           provided at the setup command.
  --workspace <workspace>  The workspace name. This is used to fetch
                           the workspace configuration. Same as on
                           Xano interface.
  --branch <branch>        The branch name. This is used to select the
                           branch configuration. Same as on Xano
                           Interface.
  --group <name>           API group name. Same as on Xano Interface.
  --all                    Regenerate for all API groups in the
                           workspace / branch of the current context.
  --listen <port>          The port where you want your registry to be
                           served locally. By default it is 5000.
  --cors                   Do you want to enable CORS? By default
                           false.
  -h, --help               display help for command
```