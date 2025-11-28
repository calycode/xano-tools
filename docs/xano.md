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

Current version: 0.14.0

Options:
  -v, --version   output the version number
  -h, --help      display help for command


Core Commands:
   init                 -h, --help
      Initialize the CLI with Xano instance configurations (interactively or via flags), this enables the CLI to know about context, APIs and in general this is required for any command to succeed.


Generation Commands:
   generate codegen     -h, --help
      Create a library based on the OpenAPI specification. If the openapi specification has not yet been generated, this will generate that as well as the first step. Supports **all** openapi tools generators + orval clients.

   generate docs        -h, --help
      Collect all descriptions, and internal documentation from a Xano instance and combine it into a nice documentation suite that can be hosted on a static hosting.

   generate repo        -h, --help
      Process Xano workspace into repo structure. We use the export-schema metadata API to offer the full details. However that is enriched with the Xanoscripts after Xano 2.0 release.

   generate spec        -h, --help
      Update and generate OpenAPI spec(s) for the current context, or all API groups simultaneously. This generates an opinionated API documentation powered by Scalar API Reference. + this command brings the Swagger docs to OAS 3.1+ version.


Registry:
   registry add         -h, --help
      Add a prebuilt component to the current Xano context, essentially by pushing an item from the registry to the Xano instance.

   registry scaffold    -h, --help
      Scaffold a Xano registry folder with a sample component. Xano registry can be used to share and reuse prebuilt components. In the registry you have to follow the [registry](https://calycode.com/schemas/registry/registry.json) and [registry item](https://calycode.com/schemas/registry/registry-item.json) schemas.


Serve:
   serve spec           -h, --help
      Serve the Open API specification locally for quick visual check, or to test your APIs via the Scalar API reference.

   serve registry       -h, --help
      Serve the registry locally. This allows you to actually use your registry without deploying it to any remote host.


Backups:
   backup export        -h, --help
      Backup Xano Workspace via Metadata API

   backup restore       -h, --help
      Restore a backup to a Xano Workspace via Metadata API. DANGER! This action will override all business logic and restore the original v1 branch. Data will be also restored from the backup file.


Testing & Linting:
   test run             -h, --help
      Run an API test suite via the OpenAPI spec. To execute this command a specification is required. Find the schema here: https://calycode.com/schemas/testing/config.json 


Other:
   generate xanoscript  -h, --help
      Process Xano workspace into repo structure. Supports table, function and apis as of know. Xano VSCode extension is the preferred solution over this command. Outputs of this process are also included in the default repo generation command.

   context show         -h, --help
      Show the current known context.

Need help? Visit https://github.com/calycode/xano-tools or reach out to us on https://links.calycode.com/discord
```
