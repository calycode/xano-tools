# `registry-add` Command
> Add a prebuilt component to the current Xano context.
### Options

#### --instance <instance>
**Description:** The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
#### --workspace <workspace>
**Description:** The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
#### --branch <branch>
**Description:** The branch name. This is used to select the branch configuration. Same as on Xano Interface.
#### --components
**Description:** Comma-separated list of components to add
#### --registry <url>
**Description:** URL to the component registry. Default: http://localhost:5500/registry/definitions

### registry-add --help
```sh
Usage: xano registry-add [options]

Add a prebuilt component to the current Xano context.

Options:
  --instance <instance>    The instance name. This is used to fetch the instance configuration. The value provided at the
                           setup command.
  --workspace <workspace>  The workspace name. This is used to fetch the workspace configuration. Same as on Xano
                           interface.
  --branch <branch>        The branch name. This is used to select the branch configuration. Same as on Xano Interface.
  --components             Comma-separated list of components to add
  --registry <url>         URL to the component registry. Default: http://localhost:5500/registry/definitions
  -h, --help               display help for command
```