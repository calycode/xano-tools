```
Usage: xcc generate-repo [options]

Process Xano workspace into repo structure

Options:
  --input <file>           workspace yaml file
  --output <dir>           output directory (overrides config)
  --instance <instance>    The instance name. This is used to fetch the instance configuration. The
                           value provided at the setup command.
  --workspace <workspace>  The workspace name. This is used to fetch the workspace configuration. Same
                           as on Xano interface.
  --branch <branch>        The branch name. This is used to select the branch configuration. Same as on
                           Xano Interface.
  --print-output-dir       Expose usable output path for further reuse.
  --fetch                  Specify this if you want to fetch the workspace schema from Xano
  -h, --help               display help for command
```