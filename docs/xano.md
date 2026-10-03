# caly-xano — the core command

Automate backups, docs, testing and version control for Xano. Every command is listed
below; pick one from the sidebar, or run `caly-xano <command> --help` in your terminal.

```term
$ Usage: caly-xano <command> [options]

Core:
  └─ init                   Initialize the CLI with a Xano instance

Agentic Development:
  ├─ oc init                Initialize OpenCode host integration
  ├─ oc serve               Serve OpenCode AI server locally
  └─ oc templates install   Install OpenCode agent config (templates)

Testing:
  └─ test run               Run an API test suite

Generate:
  ├─ generate codegen       Create a client library from the OpenAPI spec
  ├─ generate docs          Generate an internal documentation suite
  ├─ generate repo          Process the workspace into a browsable repo
  └─ generate spec          Generate OpenAPI spec(s)

Registry:
  ├─ registry add           Add a prebuilt component to Xano
  └─ registry scaffold      Scaffold a registry folder with a sample component

Serve:
  ├─ serve spec             Serve the OpenAPI spec locally
  └─ serve registry         Serve the registry locally

Backups:
  ├─ backup export          Export a workspace backup
  └─ backup restore         Restore a backup to a workspace (destructive)

Other:
  ├─ oc skills install      Install Xano skills
  └─ oc native-host status  Show native host manifest, wrapper, and extension allowlist status.

Run 'caly-xano <command> --help' for detailed usage.
https://github.com/calycode/xano-tools | https://links.calycode.com/discord
```
