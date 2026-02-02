# generate docs
>[!NOTE|label:Description]
> #### Collect all descriptions, and internal documentation from a Xano instance and combine it into a nice documentation suite that can be hosted on a static hosting.

```term
$ xano generate docs [options]
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

### generate docs --help
```term
$ xano generate docs --help
Collect all descriptions, and internal documentation from a Xano instance and combine it into a nice documentation suite that can be hosted on a static hosting.

Usage: xano generate docs [options]

Options:
  -I, --input <file>
    Workspace schema file (.yaml [legacy] or .json) from a local source, if present.

Run 'xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
```