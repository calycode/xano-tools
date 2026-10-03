# generate

{% alert type="note" title="Description" %}
Transformative operations that let you view your Xano through a fresh set of eyes.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano generate <command> [options]
```

## Subcommands

| Command | Description |
| --- | --- |
| `codegen` | Create a client library from the OpenAPI specification. If the spec has not been generated yet, it is produced as the first step. Supports all OpenAPI Generator clients plus Orval clients (as orval-<client>). |
| `docs` | Collect all descriptions and internal documentation from a Xano instance and combine them into a documentation suite that can be hosted on static hosting. |
| `spec` | Update and generate OpenAPI spec(s) for the current context, or all API groups at once. Fetches the API definition directly from the Xano instance via the metadata API (there is no local-input mode). Produces an opinionated API reference powered by Scalar and upgrades the docs to OAS 3.1+. |
| `repo` | Process a Xano workspace into a repo structure using the export-schema metadata API, enriched with XanoScripts after Xano 2.0. Fetches from the instance by default; pass --input to use a local schema file instead. |
| `xanoscript` | Process a Xano workspace into XanoScript files. Supports tables, functions and APIs. The Xano VS Code extension is the preferred solution over this command. These outputs are also included in the default repo generation command. |
