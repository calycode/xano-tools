```
Usage: xcc generate-code [options]

Create a library based on the OpenAPI specification. If the openapi specification has not
yet been generated, this will generate that as well as the first step.

Options:
  --instance <instance>
  --workspace <workspace>
  --branch <branch>
  --group <name>           API group to update
  --all                    Regenerate for all API groups in workspace/branch
  --generator <generator>  Generator to use, see all options at:
                           https://openapi-generator.tech/docs/generators
  --args <args>            Additional arguments to pass to the generator. See
                           https://openapi-generator.tech/docs/usage#generate
  --debug                  Specify this flag in order to allow logging. Logs will appear in
                           output/_logs. Default: false
  -h, --help               display help for command
```