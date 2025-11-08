# serve
>[!NOTE|label:Description]
> #### Serve locally available assets for quick preview or local reuse.

```term
$ xano serve [options]
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
#### --listen <port>
**Description:** The port where you want your registry to be served locally. By default it is 5000.
#### --cors
**Description:** Do you want to enable CORS? By default false.

### serve --help
```term
$ xano serve --help
Usage: xano serve [options] [command]

Serve locally available assets for quick preview or local reuse.

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
  --listen <port>          The port where you want your registry to be served
                           locally. By default it is 5000.
  --cors                   Do you want to enable CORS? By default false.
  -h, --help               display help for command

Commands:
  registry [options]       Serve the registry locally. This allows you to
                           actually use your registry without deploying it to
                           any remote host.
  spec                     Serve the Open API specification locally for quick
                           visual check, or to test your APIs via the Scalar API
                           reference.
```