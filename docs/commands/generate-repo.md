# generate repo
>[!NOTE|label:Description]
> #### Process Xano workspace into repo structure. We use the export-schema metadata API to offer the full details. However that is enriched with the Xanoscripts after Xano 2.0 release.

```term
$ xano generate repo [options]
```
### Options

#### -I, --input <file>
**Description:** Workspace schema file (.yaml [legacy] or .json) from a local source, if present.
#### -O, --output <dir>
**Description:** Output directory (overrides default config), useful when ran from a CI/CD pipeline and want to ensure consistent output location.
#### --instance <instance>
**Description:** The instance name. This is used to fetch the instance configuration. The value provided at the setup command.
#### --workspace <workspace>
**Description:** The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.
#### --branch <branch>
**Description:** The branch name. This is used to select the branch configuration. Same as on Xano Interface.
#### --print-output-dir
**Description:** Expose usable output path for further reuse.
#### -F, --fetch
**Description:** Forces fetching the workspace schema from the Xano instance via metadata API.

### generate repo --help
```term
$ xano generate repo --help
Process Xano workspace into repo structure. We use the export-schema metadata API to offer the full details. However that is enriched with the Xanoscripts after Xano 2.0 release.

Usage: xano generate repo [options]

Options:
  -I, --input <file>
    Workspace schema file (.yaml [legacy] or .json) from a local source, if present.

  -O, --output <dir>
    Output directory (overrides default config), useful when ran from a CI/CD pipeline and want to ensure consistent output location.

  --instance <instance>
    The instance name. This is used to fetch the instance configuration. The value provided at the setup command.

  --workspace <workspace>
    The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface.

  --branch <branch>
    The branch name. This is used to select the branch configuration. Same as on Xano Interface.

  --print-output-dir
    Expose usable output path for further reuse.

  -F, --fetch
    Forces fetching the workspace schema from the Xano instance via metadata API.

  -h, --help
    display help for command


Need help? Visit https://github.com/calycode/xano-tools
```