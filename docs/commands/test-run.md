# test run
>[!NOTE|label:Description]
> #### Run an API test suite. Requires a test config file (.json or .js). Schema: https://calycode.com/schemas/testing/config.json | Full guide: https://calycode.github.io/xano-tools/#/guides/testing

```term
$ xano test run [options]
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
#### -c, --config <path>
**Description:** Path to the test configuration file (.json or .js).
#### -e, --env <keyValue...>
**Description:** Inject environment variables (KEY=VALUE) for tests. Repeatable.
#### --ci
**Description:** CI mode: exit with code 1 if any tests fail. Use to block releases.
#### --fail-on-warnings
**Description:** In CI mode, also fail if there are warnings (not just errors).

### test run --help
```term
$ xano test run --help
Run an API test suite. Requires a test config file (.json or .js). Schema: https://calycode.com/schemas/testing/config.json | Full guide: https://calycode.github.io/xano-tools/#/guides/testing

Usage: xano test run [options]

Options:
  ├─ --instance <instance>    The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
  ├─ --workspace <workspace>  The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
  ├─ --branch <branch>        The branch name. This is used to select the branch configuration. Same as on Xano Interface.
  ├─ --group <name>           API group name. Same as on Xano Interface.
  ├─ --all                    Regenerate for all API groups in the workspace / branch of the current context.
  ├─ --print-output-dir       Expose usable output path for further reuse.
  ├─ -c, --config <path>      Path to the test configuration file (.json or .js).
  ├─ -e, --env <keyValue...>  Inject environment variables (KEY=VALUE) for tests. Repeatable.
  ├─ --ci                     CI mode: exit with code 1 if any tests fail. Use to block releases.
  ├─ --fail-on-warnings       In CI mode, also fail if there are warnings (not just errors).
  └─ -h, --help               display help for command

Run 'xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
```