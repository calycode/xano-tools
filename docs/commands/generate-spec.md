# generate spec
>[!NOTE|label:Description]
> #### Update and generate OpenAPI spec(s) for the current context, or all API groups simultaneously. This generates an opinionated API documentation powered by Scalar API Reference. + this command brings the Swagger docs to OAS 3.1+ version.

```term
$ xano generate spec [options]
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
#### --include-tables
**Description:** Requests table schema fetching and inclusion into the generate spec. By default tables are not included.

### generate spec --help
```term
$ xano generate spec --help
Update and generate OpenAPI spec(s) for the current context, or all API groups simultaneously. This generates an opinionated API documentation powered by Scalar API Reference. + this command brings the Swagger docs to OAS 3.1+ version.

Usage: xano generate spec [options]

Options:
  ├─ --instance <instance>    The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
  ├─ --workspace <workspace>  The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
  ├─ --branch <branch>        The branch name. This is used to select the branch configuration. Same as on Xano Interface.
  ├─ --group <name>           API group name. Same as on Xano Interface.
  ├─ --all                    Regenerate for all API groups in the workspace / branch of the current context.
  ├─ --print-output-dir       Expose usable output path for further reuse.
  ├─ --include-tables         Requests table schema fetching and inclusion into the generate spec. By default tables are not included.
  └─ -h, --help               display help for command

Run 'xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
```