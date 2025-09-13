# run-test
> #### Run an API test suite via the OpenAPI spec. WIP...

```sh
xano run-test [options]
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
#### --test-config-path <path>
**Description:** Path to a test configuration file.

### run-test --help
```sh
Usage: xano run-test [options]

Run an API test suite via the OpenAPI spec. WIP...

Options:
  --instance <instance>      The instance name. This is used to fetch the
                             instance configuration. The value provided at the
                             setup command.
  --workspace <workspace>    The workspace name. This is used to fetch the
                             workspace configuration. Same as on Xano interface.
  --branch <branch>          The branch name. This is used to select the branch
                             configuration. Same as on Xano Interface.
  --group <name>             API group name. Same as on Xano Interface.
  --all                      Regenerate for all API groups in the workspace /
                             branch of the current context.
  --print-output-dir         Expose usable output path for further reuse.
  --test-config-path <path>  Path to a test configuration file.
  -h, --help                 display help for command
```