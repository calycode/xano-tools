# @calycode/cli

```sh
Usage: xano <command> [options]


+==================================================================================================+
|                                                                                                  |
|    ██████╗ █████╗ ██╗  ██╗   ██╗    ██╗  ██╗ █████╗ ███╗   ██╗ ██████╗      ██████╗██╗     ██╗   |
|   ██╔════╝██╔══██╗██║  ╚██╗ ██╔╝    ╚██╗██╔╝██╔══██╗████╗  ██║██╔═══██╗    ██╔════╝██║     ██║   |
|   ██║     ███████║██║   ╚████╔╝█████╗╚███╔╝ ███████║██╔██╗ ██║██║   ██║    ██║     ██║     ██║   |
|   ██║     ██╔══██║██║    ╚██╔╝ ╚════╝██╔██╗ ██╔══██║██║╚██╗██║██║   ██║    ██║     ██║     ██║   |
|   ╚██████╗██║  ██║███████╗██║       ██╔╝ ██╗██║  ██║██║ ╚████║╚██████╔╝    ╚██████╗███████╗██║   |
|    ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝       ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝      ╚═════╝╚══════╝╚═╝   |
|                                                                                                  |
+==================================================================================================+


Supercharge your Xano workflow: automate backups, docs, testing, and version control — no AI guesswork, just reliable, transparent dev tools.

Current version: 0.1.1

Options:
  -v, --version   output the version number
  -h, --help      display help for command


Core Commands:
  setup              -h, --help
    Setup Xano instance configurations (interactively or via flags)

  switch-context     -h, --help
    Switch instance/workspace context


Code Generation:
  generate-oas       -h, --help
    Update and generate OpenAPI spec(s) for the current context.

  generate-code      -h, --help
    Create a library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step.

  generate-repo      -h, --help
    Process Xano workspace into repo structure

  generate-xs-repo   -h, --help
    Process Xano workspace into repo structure


Registry:
  registry-add       -h, --help
    Add a prebuilt component to the current Xano context.

  registry-scaffold  -h, --help
    Scaffold a Xano registry folder with a sample component. Xano registry can be used to share and reuse prebuilt components. In the registry you have to follow the [registry](https://nextcurve.hu/schemas/registry/registry.json) and [registry item](https://nextcurve.hu/schemas/registry/registry-item.json) schemas.


Backup & Restore:
  export-backup      -h, --help
    Backup Xano Workspace via Metadata API

  restore-backup     -h, --help
    Restore a backup to a Xano Workspace via Metadata API


Testing & Linting:
  run-test           -h, --help
    Run an API test suite via the OpenAPI spec. WIP...


Other:
  current-context    -h, --help
    

Need help? Visit https://github.com/calycode/xano-tools
```
