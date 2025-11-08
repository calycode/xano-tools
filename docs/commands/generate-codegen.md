# generate codegen
>[!NOTE|label:Description]
> #### Create a library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step. Supports **all** openapi tools generators + orval clients.

```term
$ xano generate codegen [options]
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
#### --generator <generator>
**Description:** Generator to use, see all options at: https://openapi-generator.tech/docs/generators or the full list of orval clients. To use orval client, write the generator as this: orval-<orval-client>.
#### --debug
**Description:** Specify this flag in order to allow logging. Logs will appear in output/_logs. Default: false

### generate codegen --help
```term
$ xano generate codegen --help
Usage: xano generate codegen [options] [passthroughArgs...]

Create a library based on the OpenAPI specification. If the openapi
specification has not yet been generated, this will generate that as well as the
first step. Supports **all** openapi tools generators + orval clients.

Arguments:
  passthroughArgs          Additional arguments to pass to the generator. For
                           options for each generator see
                           https://openapi-generator.tech/docs/usage#generate
                           this also accepts Orval additional arguments e.g.
                           --mock etc. See Orval docs as well:
                           https://orval.dev/reference/configuration/full-example

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
  --generator <generator>  Generator to use, see all options at:
                           https://openapi-generator.tech/docs/generators or the
                           full list of orval clients. To use orval client,
                           write the generator as this: orval-<orval-client>.
  --debug                  Specify this flag in order to allow logging. Logs
                           will appear in output/_logs. Default: false
  -h, --help               display help for command
```