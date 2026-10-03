# generate docs

{% alert type="note" title="Description" %}
Collect all descriptions and internal documentation from a Xano instance and combine them into a documentation suite that can be hosted on static hosting.
{% /alert %}

## Usage

```term {% anim=true %}
$ caly-xano generate docs [options]
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
