# @calycode/cli
```sh
caly-xano-cli v0.15.0 — Automate backups, docs, testing & version control for Xano

Usage: xano <command> [options]

Core:
  └─ init                  Initialize CLI with Xano instance config

Agentic Development:
  ├─ oc init               Initialize OpenCode host integration
  ├─ oc serve              Serve OpenCode AI server locally
  └─ oc templates install  Install OpenCode agent templates

Testing:
  └─ test run              Run API test suite via OpenAPI spec

Supercharge your Xano workflow: automate backups, docs, testing, and version control — no AI guesswork, just reliable, transparent dev tools.

Current version: 0.16.0

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
  ├─ registry add          Add prebuilt component to Xano
  └─ registry scaffold     Scaffold registry folder

Serve:
  ├─ serve spec            Serve OpenAPI spec locally
  └─ serve registry        Serve registry locally

Backups:
  ├─ backup export         Export workspace backup
  └─ backup restore        Restore backup to workspace

Run 'xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
```
