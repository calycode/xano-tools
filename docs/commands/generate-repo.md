# generate repo

{% alert type="note" title="Description" %}
Process a Xano workspace into a repo structure using the export-schema metadata API, enriched with XanoScripts after Xano 2.0. Fetches from the instance by default; pass --input to use a local schema file instead.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano generate repo [options]
```

## Options

| Flag | Description |
| --- | --- |
| `-I, --input <file>` | Workspace schema file (.yaml [legacy] or .json) from a local source, if present. |
| `-O, --output <dir>` | Output directory (overrides default config), useful when ran from a CI/CD pipeline and want to ensure consistent output location. |
| `-i, --instance <instance>` | The instance name. This is used to fetch the instance configuration. The value provided at the setup command. |
| `-w, --workspace <workspace>` | The workspace name. This is used to fetch the workspace configuration. Same as on Xano interface. |
| `-b, --branch <branch>` | The branch name. This is used to select the branch configuration. Same as on Xano Interface. |
| `--print-output-dir` | Expose usable output path for further reuse. |
| `-F, --fetch` | Forces fetching the workspace schema from the Xano instance via metadata API. |
