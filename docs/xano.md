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

Current version: 0.6.0

Options:
  -v, --version   output the version number
  -h, --help      display help for command


Core Commands:
  setup              -h, --help
    Setup Xano instance configurations (interactively or via flags), this enables the CLI to know about context, APIs and in general this is required for any command to succeed.


Code Generation:
  generate-oas       -h, --help
    Update and generate OpenAPI spec(s) for the current context, or all API groups simultaneously. This generates an opinionated API documentation powered by Scalar API Reference. + this command brings the Swagger docs to OAS 3.1+ version.

  generate-code      -h, --help
    Create a library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step.

  generate-repo      -h, --help
    Process Xano workspace into repo structure. We use the export-schema metadata API to offer the full details. However that is enriched with the Xanoscripts after Xano 2.0 release.

  generate-xs-repo   -h, --help
    Process Xano workspace into repo structure. Supports table, function and apis as of know. Xano VSCode extension is the preferred solution over this command. Outputs of this process are also included in the default repo generation command.


Registry:
  registry-add       -h, --help
    Add a prebuilt component to the current Xano context, essentially by pushing an item from the registry to the Xano instance.

  registry-scaffold  -h, --help
    Scaffold a Xano registry folder with a sample component. Xano registry can be used to share and reuse prebuilt components. In the registry you have to follow the [registry](https://calycode.com/schemas/registry/registry.json) and [registry item](https://calycode.com/schemas/registry/registry-item.json) schemas.


Backup & Restore:
  export-backup      -h, --help
    Backup Xano Workspace via Metadata API

  restore-backup     -h, --help
    Restore a backup to a Xano Workspace via Metadata API. DANGER! This action will override all business logic and restore the original v1 branch. Data will be also restored from the backup file.


Testing & Linting:
  run-test           -h, --help
    Run an API test suite via the OpenAPI spec. To execute this command a specification is required. Find the schema here: https://calycode.com/schemas/testing/config.json 


Other:
  current-context    -h, --help
    

Need help? Visit https://github.com/calycode/xano-tools
```
