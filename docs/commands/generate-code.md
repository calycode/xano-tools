```
Usage: xcc generate-code [options]

Create a library based on the OpenAPI specification. If the openapi specification
has not yet been generated, this will generate that as well as the first step.

Options:
  --instance <instance>    The instance name. This is used to fetch the instance
                           configuration. The value provided at the setup command.
  --workspace <workspace>  The workspace name. This is used to fetch the workspace
                           configuration. Same as on Xano interface.
  --branch <branch>        The branch name. This is used to select the branch
                           configuration. Same as on Xano Interface.
  --group <name>           API group name. Same as on Xano Interface.
  --all                    Regenerate for all API groups in the workspace / branch
                           of the current context.
  --print-output-dir       Expose usable output path for further reuse.
  --generator <generator>  Generator to use, see all options at:
                           https://openapi-generator.tech/docs/generators
  --args <args>            Additional arguments to pass to the generator. See
                           https://openapi-generator.tech/docs/usage#generate
  --debug                  Specify this flag in order to allow logging. Logs will
                           appear in output/_logs. Default: false
  -h, --help               display help for command
```